import { PrismaClient } from '@prisma/client';
import { verifyUser } from '@/lib/auth';

const prisma = new PrismaClient();

// dashboard.html's Affiliate Program tab calls fetch(`/api/affiliate/${userId}`) —
// that route didn't exist yet, so Total Clicks / Registered Users / Commission
// Earned always silently showed 0.
//
// This only ever reads/creates a CUSTOMER-type affiliate — kept completely
// separate from artist affiliates (type ARTIST, served by
// /api/artist/earnings). No commission math here: totalCommission stays
// whatever it is (0, until the client defines actual commission rules).
export async function GET(req, { params }) {
  try {
    const user = await verifyUser(req);
    if (!user || user.id !== params.userId) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let affiliate = await prisma.affiliate.findUnique({
      where: { userId: user.id },
      include: { clicks: true },
    });

    // Every customer is created with a CUSTOMER affiliate row at signup
    // (see /api/auth/register) — this fallback only matters for accounts
    // created before that change, or if the row was somehow deleted.
    if (!affiliate) {
      const referralCode =
        user.referralCode ||
        'REF' + Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 5).toUpperCase();

      affiliate = await prisma.affiliate.create({
        data: {
          userId: user.id,
          referralCode,
          type: 'CUSTOMER',
          status: 'ACTIVE',
        },
        include: { clicks: true },
      });
    }

    return Response.json({
      success: true,
      stats: {
        referralCode: affiliate.referralCode,
        totalClicks: affiliate.clicks?.length || affiliate.totalClicks || 0,
        registrations: affiliate.totalRegistrations || 0,
        commission: affiliate.totalCommission || 0,
      },
    });
  } catch (error) {
    console.error('Customer affiliate stats error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
