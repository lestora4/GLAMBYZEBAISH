import { PrismaClient } from '@prisma/client';
import { verifyUser } from '@/lib/auth';

const prisma = new PrismaClient();

// dashboard.html already calls fetch(`/api/customers/${userId}/orders`) —
// that route just didn't exist yet, so "My Orders" would have silently
// failed to load. This adds it.
export async function GET(req, { params }) {
  try {
    const user = await verifyUser(req);
    if (!user || user.id !== params.userId) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { customerId: params.userId },
      include: {
        package: { select: { name: true, slug: true, price: true, images: true } },
        artist: { select: { name: true, phone: true } },
        payment: { select: { status: true, method: true } },
        // Lets the dashboard show a star-only review action until reviewed,
        // then display the submitted rating directly on the order card.
        review: { select: { id: true, rating: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return Response.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}
