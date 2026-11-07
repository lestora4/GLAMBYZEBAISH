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

    const url = new URL(req.url);
    const query = url.searchParams.get('q') || '';

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: query, mode: 'insensitive' } },
          { customer: { name: { contains: query, mode: 'insensitive' } } },
          { customer: { email: { contains: query, mode: 'insensitive' } } },
          { package: { name: { contains: query, mode: 'insensitive' } } },
        ],
      },
      take: 20,
      include: {
        customer: { select: { name: true, email: true } },
        package: { select: { name: true } },
        artist: { select: { name: true } },
      },
    });

    return Response.json({ success: true, orders });
  } catch (error) {
    console.error('Search error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}