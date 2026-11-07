import { PrismaClient } from '@prisma/client';
import {
  verifyPhonePeWebhookAuth,
  mapPhonePeStateToPaymentStatus,
  getPhonePeOrderStatus,
} from '@/lib/phonepe';

const prisma = new PrismaClient();

// PhonePe calls this route directly (server-to-server), not from the customer's
// browser — there's no logged-in user/JWT here, so auth is done via the
// username/password hash configured in the PhonePe Business Dashboard.
//
// A combined checkout pays for 2+ orders in ONE PhonePe payment, so every
// Payment row from that attempt shares the same merchantOrderId. This route
// settles ALL of them together, not just one order.
export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');

    if (!verifyPhonePeWebhookAuth(authHeader)) {
      console.error('PhonePe webhook: invalid auth header');
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // PhonePe webhook payload wraps the order state under `payload`.
    const payload = body.payload || body;
    const merchantOrderId = payload.merchantOrderId || payload.merchantTransactionId;
    const state = payload.state; // 'COMPLETED' | 'FAILED' | 'PENDING'
    const transactionId =
      payload.paymentDetails?.[0]?.transactionId || payload.transactionId || null;

    if (!merchantOrderId) {
      return Response.json({ success: false, error: 'Missing merchantOrderId' }, { status: 400 });
    }

    // Double-check the authoritative status via the Order Status API rather than
    // trusting the webhook body alone — this matches PhonePe's own recommendation.
    const statusData = await getPhonePeOrderStatus(merchantOrderId);
    const finalState = statusData.state || state;
    const paymentStatus = mapPhonePeStateToPaymentStatus(finalState);

    await prisma.payment.updateMany({
      where: { merchantOrderId },
      data: {
        status: paymentStatus,
        method: statusData.paymentDetails?.[0]?.paymentMode || undefined,
        paymentId: transactionId || undefined,
      },
    });

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
      // Nothing matches this merchantOrderId — acknowledge anyway so PhonePe
      // doesn't keep retrying a webhook we can never resolve.
      return Response.json({ success: true });
    }

    // Only fulfil orders that haven't already been marked paid.
    if (paymentStatus === 'PAID') {
      const toFulfil = payments.filter((p) => p.order.paymentStatus !== 'PAID');

      if (toFulfil.length > 0) {
        await prisma.order.updateMany({
          where: { id: { in: toFulfil.map((p) => p.orderId) } },
          data: { paymentStatus: 'PAID', status: 'PENDING' },
        });

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
          // Don't fail the webhook (PhonePe would keep retrying it) just
          // because the email provider had a hiccup — the payment already
          // succeeded and the order rows are already updated above.
          console.error('Webhook: failed to send confirmation email:', emailError);
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
    } else if (paymentStatus === 'FAILED') {
      await prisma.order.updateMany({
        where: { id: { in: payments.map((p) => p.orderId) } },
        data: { paymentStatus: 'FAILED' },
      });
    }

    // PhonePe just needs a 2xx within a few seconds — no body required.
    return Response.json({ success: true });
  } catch (error) {
    console.error('PhonePe webhook error:', error);
    // Still return 500 so PhonePe retries, but don't leak internals.
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
