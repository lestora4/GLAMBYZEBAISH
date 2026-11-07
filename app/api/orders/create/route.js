import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { verifyUser } from '@/lib/auth';

const prisma = new PrismaClient();

// 5% GST is applied to every package at checkout. Keeping this as a single
// constant here (rather than reading Package.gst, which is unused/legacy)
// means every order in a combined checkout is taxed the same way and the
// rate can't be tampered with per-package.
const GST_RATE = 0.05;

// Creates one or more Orders in a single request, all sharing one groupId.
//
// This replaces the old "one package per call" version. checkout.html's
// combined-checkout flow now sends every selected package (each with its
// own date/time/location) in one POST, and this route creates one Order
// row per item — Order still models one package each — but stamps them
// all with the same groupId so the rest of the app (payments, dashboards)
// can treat them as a single booking with one total and one payment.
//
// Body shape:
//   {
//     items: [
//       { packageSlug, date, time, location, specialNotes },
//       ...
//     ],
//     customerName, customerEmail, customerPhone
//   }
//
// 5% GST is added on top of the package price from the DB (never trusts a
// price the browser sends). totalAmount = amount + gst, and that
// totalAmount is what /api/payments/create later charges via PhonePe.
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      items,
      customerName,
      customerEmail,
      customerPhone,
      couponCode,
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ success: false, error: 'No packages selected' }, { status: 400 });
    }
    if (!customerName || !customerEmail) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    for (const item of items) {
      if (!item.packageSlug || !item.date || !item.time || !item.location) {
        return Response.json({ success: false, error: 'Each package needs a date, time and address' }, { status: 400 });
      }
    }

    // ========================================
    // EDIT-AN-EXISTING-ORDER PATH (Flipmart-style "edit unsuccessful
    // booking" flow: book-now.html loads an order the customer never paid
    // for, lets them change its date/time/address, and posts back here
    // with that order's id instead of asking to create a brand new row).
    //
    // Signalled by a single item carrying an `orderId`. Requires the
    // customer to actually be logged in as whoever owns that order — this
    // is the one path in this route that mutates existing data, so unlike
    // the normal create-new-orders flow below it isn't enough to just say
    // who you are in the request body.
    // ========================================
    if (items.length === 1 && items[0].orderId) {
      const authedUser = await verifyUser(req);
      if (!authedUser) {
        return Response.json({ success: false, error: 'Please log in to edit this order.' }, { status: 401 });
      }

      const item = items[0];
      const existing = await prisma.order.findUnique({ where: { id: item.orderId } });
      if (!existing || existing.customerId !== authedUser.id) {
        return Response.json({ success: false, error: 'Order not found' }, { status: 404 });
      }
      if (existing.paymentStatus === 'PAID') {
        return Response.json({ success: false, error: 'This order has already been paid for and can no longer be edited.' }, { status: 409 });
      }
      if (existing.status === 'CANCELLED') {
        return Response.json({ success: false, error: 'This order has been cancelled and can no longer be edited.' }, { status: 409 });
      }

      const pkg = await prisma.package.findUnique({ where: { slug: item.packageSlug } });
      if (!pkg || !pkg.isActive) {
        return Response.json({ success: false, error: `Package not found: ${item.packageSlug}` }, { status: 404 });
      }

      const amount = pkg.price;
      const gstAmount = Math.round(amount * GST_RATE);
      const orderTotal = amount + gstAmount;

      const updated = await prisma.order.update({
        where: { id: existing.id },
        data: {
          packageId: pkg.id,
          date: new Date(`${item.date}T${item.time}`),
          time: item.time,
          location: item.location,
          specialNotes: item.specialNotes || null,
          amount,
          gst: gstAmount,
          totalAmount: orderTotal,
          // Always resets to PENDING here — editing an order is always
          // immediately followed by a fresh payment attempt below.
          paymentStatus: 'PENDING',
        },
      });

      return Response.json({
        success: true,
        groupId: updated.groupId,
        orders: [{
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          packageName: pkg.name,
          amount,
          gst: gstAmount,
          totalAmount: orderTotal,
        }],
        totalAmount: orderTotal,
      });
    }

    // Find or create the customer. If they already have an account, this does
    // NOT log them in — it just attaches the order(s) to their existing record.
    let customer = await prisma.user.findUnique({ where: { email: customerEmail } });
    if (!customer) {
      const randomPassword = crypto.randomBytes(16).toString('hex');
      customer = await prisma.user.create({
        data: {
          email: customerEmail,
          name: customerName,
          phone: customerPhone || null,
          password: randomPassword, // guest account; consider a "set password" email flow later
          role: 'CUSTOMER',
        },
      });
    }

    // One groupId ties every order from this checkout together.
    const groupId = 'GRP' + crypto.randomBytes(8).toString('hex');

    // ========================================
    // Resolve every package FIRST (validating each exists/is active) before
    // touching the coupon. If any package lookup fails we bail out here,
    // so we never end up having burned one of the coupon's 100 redemptions
    // on a checkout that didn't actually go through.
    // ========================================
    const resolvedItems = [];
    for (const item of items) {
      const pkg = await prisma.package.findUnique({ where: { slug: item.packageSlug } });
      if (!pkg || !pkg.isActive) {
        return Response.json({ success: false, error: `Package not found: ${item.packageSlug}` }, { status: 404 });
      }
      resolvedItems.push({ item, pkg });
    }
    const combinedSubtotal = resolvedItems.reduce((sum, r) => sum + r.pkg.price, 0);

    // ========================================
    // COUPON CODE (optional) — "ZEBA10"-style codes: a flat % off, capped
    // at coupon.maxUses total successful redemptions across ALL customers
    // (first-come, first-served for the first 100 people), AND limited to
    // one use per customer (matched on customerEmail, case-insensitive).
    //
    // The increment below is a single conditional UPDATE
    // (usedCount < maxUses), not a read-then-write — that's what keeps the
    // 100-use cap correct even if many people click "Apply"/checkout at
    // the same moment. If two requests race for the 100th spot, Postgres
    // only lets one of the concurrent UPDATEs succeed; the loser's
    // `reserved.count` comes back 0 and that checkout is told the coupon
    // is full instead of silently getting a discount that wasn't honoured.
    //
    // The one-time-per-customer check runs BEFORE that reservation, so a
    // repeat use never burns one of the coupon's limited slots.
    // ========================================
    let coupon = null;
    let discountPct = 0;
    if (couponCode && String(couponCode).trim()) {
      const code = String(couponCode).trim().toUpperCase();
      const existingCoupon = await prisma.coupon.findUnique({ where: { code } });

      if (!existingCoupon || !existingCoupon.isActive) {
        return Response.json({ success: false, error: 'Invalid coupon code.' }, { status: 404 });
      }
      if (existingCoupon.usedCount >= existingCoupon.maxUses) {
        return Response.json({
          success: false,
          error: `This coupon's limit of ${existingCoupon.maxUses} redemptions has already been reached.`,
        }, { status: 409 });
      }

      const priorUse = await prisma.couponRedemption.findFirst({
        where: {
          couponId: existingCoupon.id,
          customerEmail: { equals: customerEmail, mode: 'insensitive' },
        },
      });
      if (priorUse) {
        return Response.json({
          success: false,
          error: 'You have already used this coupon. Each coupon can only be used once per customer.',
        }, { status: 409 });
      }

      const reserved = await prisma.coupon.updateMany({
        where: { id: existingCoupon.id, usedCount: { lt: existingCoupon.maxUses } },
        data: { usedCount: { increment: 1 } },
      });
      if (reserved.count === 0) {
        return Response.json({
          success: false,
          error: `This coupon's limit of ${existingCoupon.maxUses} redemptions has already been reached.`,
        }, { status: 409 });
      }

      coupon = existingCoupon;
      discountPct = existingCoupon.discountPct;
    }

    const createdOrders = [];
    let totalAmount = 0;
    let totalDiscount = 0;

    // Sequential, not Promise.all — order numbers are derived from
    // Date.now(), so creating them one at a time keeps them distinct even
    // when several packages are booked in the same millisecond-ish window.
    for (const { item, pkg } of resolvedItems) {
      const amount = pkg.price;
      // Discount is a flat % off each package's price, applied BEFORE GST
      // (so GST is charged on the discounted amount, not the sticker price).
      const discountAmount = discountPct > 0 ? Math.round((amount * discountPct) / 100) : 0;
      const netAmount = amount - discountAmount;
      // Round to the nearest rupee so PhonePe (and the UI) never has to
      // deal with fractional paise.
      const gstAmount = Math.round(netAmount * GST_RATE);
      const orderTotal = netAmount + gstAmount;
      const orderNumber = 'ORD' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);

      const order = await prisma.order.create({
        data: {
          orderNumber,
          groupId,
          customerId: customer.id,
          packageId: pkg.id,
          date: new Date(`${item.date}T${item.time}`),
          time: item.time,
          location: item.location,
          specialNotes: item.specialNotes || null,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          amount,
          gst: gstAmount,
          discount: discountAmount,
          totalAmount: orderTotal,
        },
      });

      totalAmount += orderTotal;
      totalDiscount += discountAmount;
      createdOrders.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        packageName: pkg.name,
        amount,
        discount: discountAmount,
        gst: gstAmount,
        totalAmount: orderTotal,
      });
    }

    // Record exactly who redeemed the coupon on this booking, tied to the
    // groupId, for admin-side auditing of the 100 winners.
    if (coupon) {
      await prisma.couponRedemption.create({
        data: {
          couponId: coupon.id,
          groupId,
          customerEmail,
          discountAmount: totalDiscount,
        },
      });
    }

    return Response.json({
      success: true,
      groupId,
      orders: createdOrders,
      subtotal: combinedSubtotal,
      discount: totalDiscount,
      couponCode: coupon ? coupon.code : null,
      totalAmount,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
