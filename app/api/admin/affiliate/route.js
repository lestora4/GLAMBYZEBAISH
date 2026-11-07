export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { PrismaClient } from '@prisma/client';
import { verifyAdmin } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [affiliates, commissions] = await Promise.all([
      prisma.affiliate.findMany({
        include: {
          user: { select: { name: true, email: true } },
          _count: { select: { clicks: true } },
        },
      }),
      prisma.affiliateCommission.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          affiliate: { include: { user: { select: { name: true } } } },
          order: { select: { orderNumber: true } },
        },
      }),
    ]);

    const stats = {
      totalCommission: commissions.reduce((sum, c) => sum + (c.status === 'APPROVED' || c.status === 'PAID' ? c.amount : 0), 0),
      pendingCommission: commissions.reduce((sum, c) => sum + (c.status === 'PENDING' ? c.amount : 0), 0),
      approvedCommission: commissions.reduce((sum, c) => sum + (c.status === 'APPROVED' ? c.amount : 0), 0),
      totalClicks: affiliates.reduce((sum, a) => sum + a._count.clicks, 0),
    };

    return Response.json({ success: true, stats, affiliates, commissions });
  } catch (error) {
    console.error('Affiliate error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}