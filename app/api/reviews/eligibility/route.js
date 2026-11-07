export const dynamic = 'force-dynamic';

import { PrismaClient } from '@prisma/client';
import { verifyUser } from '@/lib/auth';

const prisma = new PrismaClient();

// Tells the service-detail page whether the logged-in customer is allowed
// to write a review for a given package, mirroring Amazon/Flipkart's
// "only after a completed order" rule:
//   - never booked / booking not completed yet -> canReview: false, reason: 'not_purchased'
//   - completed a booking, hasn't reviewed it   -> canReview: true, orderId: <that order>
//   - already reviewed every completed booking  -> canReview: false, alreadyReviewed: true
export async function GET(req) {
  try {
    const user = await verifyUser(req);
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const packageSlug = searchParams.get('packageSlug');
    if (!packageSlug) {
      return Response.json({ success: false, error: 'packageSlug is required' }, { status: 400 });
    }

    const pkg = await prisma.package.findUnique({ where: { slug: packageSlug } });
    if (!pkg) {
      return Response.json({ success: false, error: 'Package not found' }, { status: 404 });
    }

    const completedOrders = await prisma.order.findMany({
      where: { customerId: user.id, packageId: pkg.id, status: 'COMPLETED' },
      include: { review: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const reviewableOrder = completedOrders.find((o) => !o.review);

    if (reviewableOrder) {
      return Response.json({
        success: true,
        canReview: true,
        alreadyReviewed: false,
        orderId: reviewableOrder.id,
      });
    }

    if (completedOrders.length > 0) {
      return Response.json({
        success: true,
        canReview: false,
        alreadyReviewed: true,
      });
    }

    return Response.json({
      success: true,
      canReview: false,
      alreadyReviewed: false,
      reason: 'not_purchased',
    });
  } catch (error) {
    console.error('Review eligibility error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
