export const dynamic = 'force-dynamic'; 
 
import { PrismaClient } from '@prisma/client';
import { verifyAdmin } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [
      totalOrders,
      pendingOrders,
      revenue,
      totalCustomers,
      totalArtists,
      pendingArtists,
      totalPackages,
      recentOrders,
      recentArtists,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      // Revenue must only ever count money actually received. Summing
      // every order (including PENDING/FAILED payments) would inflate
      // revenue with bookings the customer never actually paid for.
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { paymentStatus: 'PAID' } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.artist.count(),
      prisma.artist.count({ where: { isApproved: false } }),
      prisma.package.count({ where: { isActive: true } }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, email: true } },
          package: { select: { name: true, price: true } },
          artist: { select: { name: true } },
        },
      }),
      prisma.artist.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: { isApproved: false },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          location: true,
          createdAt: true,
          idProofUrl: true,
        },
      }),
    ]);

    return Response.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        totalRevenue: revenue._sum.totalAmount || 0,
        totalCustomers,
        totalArtists,
        pendingArtists,
        totalPackages,
      },
      recentOrders,
      recentArtists,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}