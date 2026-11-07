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

    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        order: { select: { orderNumber: true, customer: { select: { name: true } } } },
      },
    });

    return Response.json({ success: true, payments });
  } catch (error) {
    console.error('Payments error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}