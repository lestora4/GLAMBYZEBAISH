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

    // First, check if there's a User record for this artist
    let user = await prisma.user.findUnique({
      where: { email: artist.email },
    });

    // If no user exists, create one with the artist's details
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: artist.name,
          email: artist.email,
          phone: artist.phone || '',
          password: artist.password, // Use existing hashed password
          role: 'ARTIST',
        },
      });
      console.log('✅ Created User for artist:', artist.email);
    }

    // Now get or create affiliate record using the user's ID
    let affiliate = await prisma.affiliate.findUnique({
      where: { userId: user.id },
      include: {
        clicks: true,
        commissions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // If artist doesn't have affiliate record, create one
    if (!affiliate) {
      const referralCode = 'ART' + Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 5).toUpperCase();
      affiliate = await prisma.affiliate.create({
        data: {
          userId: user.id,
          referralCode: referralCode,
          type: 'ARTIST',
          totalCommission: 0,
          pendingCommission: 0,
          approvedCommission: 0,
          status: 'ACTIVE',
        },
        include: {
          clicks: true,
          commissions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      console.log('✅ Created Affiliate for artist:', artist.email);
    }

    // Calculate affiliate stats
    const totalCommission = affiliate.totalCommission || 0;
    const pendingCommission = affiliate.pendingCommission || 0;
    const approvedCommission = affiliate.approvedCommission || 0;
    const totalClicks = affiliate.clicks?.length || 0;
    const totalRegistrations = affiliate.totalRegistrations || 0;
    const referralCode = affiliate.referralCode || 'N/A';

    // Format commission history
    const history = (affiliate.commissions || []).map(c => ({
      id: c.id,
      orderId: c.orderId,
      amount: c.amount,
      status: c.status,
      description: c.description || 'Affiliate commission',
      createdAt: c.createdAt,
    }));

    return Response.json({
      success: true,
      affiliate: {
        referralCode,
        totalCommission,
        pendingCommission,
        approvedCommission,
        totalClicks,
        totalRegistrations,
        status: affiliate.status,
      },
      history,
    });
  } catch (error) {
    console.error('❌ Artist affiliate earnings error:', error);
    return Response.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}