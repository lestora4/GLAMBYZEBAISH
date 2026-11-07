export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { PrismaClient } from '@prisma/client';
import { verifyArtist } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PUT(req, { params }) {
  try {
    const artist = await verifyArtist(req);
    if (!artist) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id, action } = await params;

    if (!['accept', 'reject'].includes(action)) {
      return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order || order.artistId !== artist.id) {
      return Response.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    if (order.status !== 'ASSIGNED') {
      return Response.json(
        { success: false, error: 'This booking can no longer be updated.' },
        { status: 400 }
      );
    }

    const newStatus = action === 'accept' ? 'ACCEPTED' : 'CANCELLED';

    const updated = await prisma.order.update({
      where: { id },
      data: { status: newStatus },
    });

    // Notify the customer
    try {
      await prisma.notification.create({
        data: {
          userId: order.customerId,
          title: action === 'accept' ? 'Booking Accepted!' : 'Booking Update',
          message:
            action === 'accept'
              ? `${artist.name} has accepted your booking #${order.orderNumber}.`
              : `Unfortunately ${artist.name} could not take your booking #${order.orderNumber}. We'll reassign you a new artist shortly.`,
          type: 'BOOKING',
          link: `/dashboard/orders/${order.id}`,
        },
      });
    } catch (notifyError) {
      console.error('⚠️ Notification creation failed:', notifyError);
    }

    return Response.json({ success: true, order: updated });
  } catch (error) {
    console.error('❌ Artist booking action error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
