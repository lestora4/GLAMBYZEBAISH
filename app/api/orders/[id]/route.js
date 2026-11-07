import { PrismaClient } from '@prisma/client';
import { verifyUser } from '@/lib/auth';

const prisma = new PrismaClient();

// Used by booking-confirmation.html to show real order details after
// payment, and generally anywhere a customer needs to see one of their
// own bookings. Requires the same Bearer token used for checkout.
export async function GET(req, { params }) {
  try {
    const user = await verifyUser(req);
    if (!user) {
      return Response.json({ success: false, error: 'Please log in.' }, { status: 401 });
    }

    const { id } = params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        // slug is included so book-now.html can preselect the right
        // package card when a customer reopens this order to edit it.
        package: { select: { name: true, price: true, duration: true, slug: true } },
        artist: { select: { name: true, phone: true } },
        payment: { select: { status: true, method: true } },
      },
    });

    if (!order || order.customerId !== user.id) {
      return Response.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return Response.json({ success: true, order });
  } catch (error) {
    console.error('Get order error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
