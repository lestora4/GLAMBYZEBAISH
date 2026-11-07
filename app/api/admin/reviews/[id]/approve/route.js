export const dynamic = 'force-dynamic'; 
 
import { PrismaClient } from '@prisma/client';
import { verifyAdmin } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PUT(req, { params }) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const review = await prisma.review.update({
      where: { id },
      data: { isApproved: true },
    });

    // Update artist rating
    if (review.artistId) {
      const artistReviews = await prisma.review.aggregate({
        where: { artistId: review.artistId, isApproved: true },
        _avg: { rating: true },
        _count: true,
      });

      await prisma.artist.update({
        where: { id: review.artistId },
        data: {
          rating: artistReviews._avg.rating || 0,
          totalReviews: artistReviews._count,
        },
      });
    }

    return Response.json({ success: true, review });
  } catch (error) {
    console.error('Approve review error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}