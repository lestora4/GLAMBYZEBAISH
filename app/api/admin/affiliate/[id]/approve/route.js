export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { PrismaClient } from '@prisma/client';
import { verifyAdmin } from '@/lib/auth';

let prisma;
const getPrisma = () => {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
};

export async function PUT(req, { params }) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const prisma = getPrisma();

    const commission = await prisma.affiliateCommission.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: {
        affiliate: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    await prisma.affiliate.update({
      where: { id: commission.affiliateId },
      data: {
        totalCommission: { increment: commission.amount },
        approvedCommission: { increment: commission.amount },
        pendingCommission: { decrement: commission.amount },
      },
    });

    return Response.json({ success: true, commission });
  } catch (error) {
    console.error('Approve commission error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const prisma = getPrisma();
    
    const commission = await prisma.affiliateCommission.findUnique({
      where: { id },
      include: {
        affiliate: { include: { user: { select: { name: true, email: true } } } },
      },
    });
    
    if (!commission) {
      return Response.json({ success: false, error: 'Commission not found' }, { status: 404 });
    }
    
    return Response.json({ success: true, commission });
  } catch (error) {
    console.error('Error fetching commission:', error);
    return Response.json({ success: false, error: 'Failed to fetch commission' }, { status: 500 });
  }
}