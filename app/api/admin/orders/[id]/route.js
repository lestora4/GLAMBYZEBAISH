export const dynamic = 'force-dynamic'; 
 
import { PrismaClient } from '@prisma/client';
import { verifyAdmin } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req, { params }) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        package: { select: { id: true, name: true, price: true, description: true } },
        artist: { select: { id: true, name: true, phone: true, email: true } },
        payment: { select: { id: true, status: true, amount: true, paymentId: true } },
        address: true,
      },
    });

    if (!order) {
      return Response.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return Response.json({ success: true, order });
  } catch (error) {
    console.error('Order detail error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}