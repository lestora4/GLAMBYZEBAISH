import { PrismaClient } from '@prisma/client';
import { createPhonePeOrder } from '@/lib/phonepe';
import { verifyUser } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const user = await verifyUser(req);
    if (!user) {
      return Response.json({ success: false, error: 'Please log in to continue.' }, { status: 401 });
    }

    const { groupId, currency } = await req.json();
    if (!groupId) {
      return Response.json({ success: false, error: 'Missing groupId' }, { status: 400 });
    }

    // Pull every order in this group — a combined checkout is 2+ orders
    // (one per package), a single-package checkout is a group of one.
    // Either way we pay for all of them in ONE PhonePe payment.
    const orders = await prisma.order.findMany({
      where: { groupId },
      include: { package: true },
    });

    if (orders.length === 0) {
      return Response.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // Every order in the group must belong to whoever is paying for it.
    if (orders.some((o) => o.customerId !== user.id)) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Already paid? Don't let it be charged again.
    if (orders.every((o) => o.paymentStatus === 'PAID')) {
      return Response.json({ success: false, error: 'This booking has already been paid for.' }, { status: 409 });
    }

    // Never trust a browser-sent amount — recompute the combined total
    // straight from the DB rows created by /api/orders/create.
    const amount = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    // PhonePe needs a unique merchant-side order id per attempt. All
    // Payment rows for this group share the SAME merchantOrderId — that's
    // how the webhook/verify routes later find every order in the group
    // from the one id PhonePe gives back.
    const merchantOrderId = `${groupId}_${Date.now()}`;

    // checkout.html lives at public/checkout.html, served from the site
    // root as /checkout.html.
    const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/checkout.html?groupId=${groupId}&merchantOrderId=${merchantOrderId}`;

    const phonepeOrder = await createPhonePeOrder({
      merchantOrderId,
      amount,
      redirectUrl,
      metaInfo: {
        udf1: groupId,
        udf2: orders.map((o) => o.orderNumber).join(','),
      },
    });

    // One Payment row per order (Payment.orderId stays unique), all
    // sharing this attempt's merchantOrderId so they settle together.
    await Promise.all(
      orders.map((order) =>
        prisma.payment.upsert({
          where: { orderId: order.id },
          update: {
            amount: order.totalAmount,
            currency: currency || 'INR',
            merchantOrderId,
            gateway: 'PHONEPE',
            status: 'PENDING',
          },
          create: {
            orderId: order.id,
            amount: order.totalAmount,
            currency: currency || 'INR',
            paymentId: merchantOrderId, // kept for backward compatibility with existing schema usage
            merchantOrderId,
            gateway: 'PHONEPE',
            status: 'PENDING',
          },
        })
      )
    );

    return Response.json({
      success: true,
      redirectUrl: phonepeOrder.redirectUrl,
      merchantOrderId,
      phonepeOrderId: phonepeOrder.orderId,
      amount,
    });
  } catch (error) {
    console.error('Create PhonePe payment error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
