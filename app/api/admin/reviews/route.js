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

    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        artist: { select: { name: true } },
        order: { select: { orderNumber: true } },
        package: { select: { name: true } },
      },
    });

    return Response.json({ success: true, reviews });
  } catch (error) {
    console.error('Reviews error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}