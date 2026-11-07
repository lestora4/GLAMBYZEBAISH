export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { PrismaClient } from '@prisma/client';
import { verifyArtist } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const artist = await verifyArtist(req);
    if (!artist) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [totalBookings, pendingBookings, completedBookings, completedOrders] = await Promise.all([
      prisma.order.count({ where: { artistId: artist.id } }),
      prisma.order.count({ where: { artistId: artist.id, status: 'ASSIGNED' } }),
      prisma.order.count({ where: { artistId: artist.id, status: 'COMPLETED' } }),
      prisma.order.findMany({
        where: { artistId: artist.id, status: 'COMPLETED' },
        select: { totalAmount: true },
      }),
    ]);

    const totalEarnings = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return Response.json({
      success: true,
      stats: {
        totalBookings,
        pendingBookings,
        completedBookings,
        totalEarnings,
        rating: artist.rating || 0,
        totalReviews: artist.totalReviews || 0,
      },
    });
  } catch (error) {
    console.error('❌ Artist dashboard stats error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
