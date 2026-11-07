export const dynamic = 'force-dynamic'; 
 
import { PrismaClient } from '@prisma/client';
import { verifyAdmin } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PUT(req, { params }) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { artistId } = await req.json();

    const order = await prisma.order.update({
      where: { id },
      data: {
        artistId,
        status: 'ASSIGNED',
      },
      include: {
        customer: { select: { name: true, email: true } },
        artist: { select: { name: true, phone: true, experience: true } },
        package: { select: { name: true } },
      },
    });

    // Send artist assigned email
    const { sendArtistAssignedEmail } = await import('@/lib/email');
    await sendArtistAssignedEmail(order.customer.email, {
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      packageName: order.package.name,
      date: order.date,
      time: order.time,
      location: order.location,
    }, {
      name: order.artist.name,
      phone: order.artist.phone,
      experience: order.artist.experience,
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: order.customerId,
        title: 'Artist Assigned!',
        message: `Your makeup artist ${order.artist.name} has been assigned to your booking.`,
        type: 'ARTIST_ASSIGNED',
        link: `/dashboard/orders/${order.id}`,
      },
    });

    return Response.json({ success: true, order });
  } catch (error) {
    console.error('Assign artist error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}