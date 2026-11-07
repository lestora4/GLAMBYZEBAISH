import { PrismaClient } from '@prisma/client';
import { getPhonePeOrderStatus, mapPhonePeStateToPaymentStatus } from '@/lib/phonepe';

const prisma = new PrismaClient();

// Called by the browser after PhonePe redirects the user back to checkout.html.
// This is a FALLBACK check — the webhook (/api/payments/callback) is the source
// of truth and usually updates the DB first. This route exists because:
//  1. The webhook can be a few seconds delayed relative to the redirect.
//  2. If the webhook is ever missed, this still lets the UI show the right status.
//
// A combined checkout pays for 2+ orders in ONE PhonePe payment, so every
// Payment row from that attempt shares the same merchantOrderId. This route
// settles ALL of them together, not just one order.
export async function POST(req) {
  try {
    const { merchantOrderId } = await req.json();

    if (!merchantOrderId) {
      return Response.json({ success: false, error: 'Missing merchantOrderId' }, { status: 400 });
    }

    const payments = await prisma.payment.findMany({
      where: { merchantOrderId },
      include: {
        order: {
          include: {
            customer: { select: { id: true, name: true, email: true } },
            package: { select: { name: true, price: true } },
          },
        },
      },
    });

    if (payments.length === 0) {
      return Response.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }

    const orderSummaries = payments.map((p) => ({
      orderId: p.order.id,
      orderNumber: p.order.orderNumber,
    }));

    // If the webhook already marked these PAID, no need to hit PhonePe again.
    if (payments.every((p) => p.status === 'PAID')) {
      return Response.json({
        success: true,
        status: 'PAID',
        groupId: payments[0].order.groupId,
        orders: orderSummaries,
      });
    }

    // Otherwise, ask PhonePe directly — covers the case where the webhook
    // hasn't arrived yet (or was missed) but the payment actually succeeded.
    const statusData = await getPhonePeOrderStatus(merchantOrderId);
    const paymentStatus = mapPhonePeStateToPaymentStatus(statusData.state);

    if (paymentStatus !== payments[0].status) {
      await prisma.payment.updateMany({
        where: { merchantOrderId },
        data: { status: paymentStatus },
      });

      if (paymentStatus === 'PAID') {
        const toFulfil = payments.filter((p) => p.order.paymentStatus !== 'PAID');

        if (toFulfil.length > 0) {
          await prisma.order.updateMany({
            where: { id: { in: toFulfil.map((p) => p.orderId) } },
            data: { paymentStatus: 'PAID', status: 'PENDING' },
          });

          // The PhonePe webhook (/api/payments/callback) normally sends the
          // confirmation email/notification on this same transition. But the
          // webhook is a server-to-server call — PhonePe can't reach it on a
          // local/dev machine without a public tunnel — so this route is often
          // the ONLY place the PAID transition is ever observed in dev. Fire
          // the same emails/notification here too. The paymentStatus guard
          // above already makes this a once-only transition per order, so if
          // the webhook DOES also fire later, it will just see paymentStatus
          // already 'PAID' and skip re-sending.
          //
          // ONE combined email per checkout, not one per package: every
          // payment row in `toFulfil` came from this same merchantOrderId,
          // i.e. one PhonePe payment for one groupId/customer, so they're
          // grouped into a single sendOrderConfirmationEmail /
          // sendAdminNotificationEmail call using email.js's `orders` array
          // shape instead of looping and sending one email per package.
          try {
            const { sendOrderConfirmationEmail, sendAdminNotificationEmail } = await import('@/lib/email');

            const first = toFulfil[0].order;
            const totalAmount = toFulfil.reduce((sum, p) => sum + (p.order.totalAmount || 0), 0);
            const orderLines = toFulfil.map((p) => ({
              orderNumber: p.order.orderNumber,
              packageName: p.order.package.name,
              date: p.order.date,
              time: p.order.time,
              location: p.order.location,
              amount: p.order.totalAmount,
            }));

            await sendOrderConfirmationEmail(first.customer.email, {
              customerName: first.customer.name,
              groupId: first.groupId,
              totalAmount,
              orders: orderLines,
            });

            await sendAdminNotificationEmail({
              customerName: first.customer.name,
              groupId: first.groupId,
              totalAmount,
              orders: orderLines,
            });
          } catch (emailError) {
            // Don't fail payment verification just because the email
            // provider had a hiccup — the payment already succeeded.
            console.error('Verify route: failed to send confirmation email:', emailError);
          }

          await prisma.notification.createMany({
            data: toFulfil.map((p) => ({
              userId: p.order.customerId,
              title: 'Booking Confirmed!',
              message: `Your booking #${p.order.orderNumber} has been confirmed. We'll assign an artist shortly.`,
              type: 'BOOKING',
              link: `/dashboard/orders/${p.order.id}`,
            })),
          });
        }
      }
    }

    return Response.json({
      success: true,
      status: paymentStatus,
      groupId: payments[0].order.groupId,
      orders: orderSummaries,
    });
  } catch (error) {
    console.error('Verify PhonePe payment error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
