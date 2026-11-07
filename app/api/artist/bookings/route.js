export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { PrismaClient } from '@prisma/client';
import { verifyArtist } from '@/lib/auth';

const prisma = new PrismaClient();

// Order.status (DB) -> status shown on the artist dashboard
function mapStatus(dbStatus) {
  switch (dbStatus) {
    case 'ASSIGNED':
      return 'PENDING'; // needs artist accept/reject
    case 'ACCEPTED':
    case 'IN_PROGRESS':
      return 'ACCEPTED';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return dbStatus;
  }
}

export async function GET(req) {
  try {
    const artist = await verifyArtist(req);
    if (!artist) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { artistId: artist.id },
      include: {
        customer: { select: { name: true, phone: true } },
        // images/price power the same order-card look used on the
        // customer dashboard (thumbnail + payment pill).
        package: { select: { name: true, images: true } },
        // Powers the "Rating & Review" column so artists can see what the
        // customer said once a completed booking has been reviewed.
        review: { select: { rating: true, comment: true, createdAt: true } },
      },
      orderBy: { date: 'desc' },
    });

    const bookings = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customer?.name || '—',
      customerPhone: o.customer?.phone || '',
      packageName: o.package?.name || '—',
      packageImage: Array.isArray(o.package?.images) && o.package.images.length > 0 ? o.package.images[0] : null,
      date: o.date,
      time: o.time,
      location: o.location,
      amount: o.totalAmount,
      status: mapStatus(o.status),
      paymentStatus: o.paymentStatus,
      review: o.review ? { rating: o.review.rating, comment: o.review.comment, createdAt: o.review.createdAt } : null,
    }));

    return Response.json({ success: true, bookings });
  } catch (error) {
    console.error('❌ Artist bookings error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
