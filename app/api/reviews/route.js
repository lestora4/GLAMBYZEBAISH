export const dynamic = 'force-dynamic';

import { PrismaClient } from '@prisma/client';
import { verifyUser } from '@/lib/auth';
import { uploadFile } from '@/lib/upload';

const prisma = new PrismaClient();

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

// Shows "Priya S." instead of a customer's full name on public review cards.
function maskName(fullName) {
  if (!fullName) return 'Verified Customer';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

// GET /api/reviews?packageSlug=<slug>&limit=20
// Public — powers the review list + rating summary on the service-detail page.
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const packageSlug = searchParams.get('packageSlug');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 50);

    if (!packageSlug) {
      return Response.json({ success: false, error: 'packageSlug is required' }, { status: 400 });
    }

    const pkg = await prisma.package.findUnique({ where: { slug: packageSlug } });
    if (!pkg) {
      return Response.json({ success: false, error: 'Package not found' }, { status: 404 });
    }

    const [reviews, aggregate, breakdown] = await Promise.all([
      prisma.review.findMany({
        where: { packageId: pkg.id, isApproved: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: { select: { name: true } },
          artist: { select: { name: true } },
        },
      }),
      prisma.review.aggregate({
        where: { packageId: pkg.id, isApproved: true },
        _avg: { rating: true },
        _count: true,
      }),
      prisma.review.groupBy({
        by: ['rating'],
        where: { packageId: pkg.id, isApproved: true },
        _count: true,
      }),
    ]);

    const stars = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    breakdown.forEach((b) => { stars[b.rating] = b._count; });

    return Response.json({
      success: true,
      stats: {
        average: aggregate._avg.rating || 0,
        total: aggregate._count || 0,
        breakdown: stars,
      },
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        images: r.images,
        createdAt: r.createdAt,
        customerName: maskName(r.user?.name),
        artistName: r.artist?.name || null,
      })),
    });
  } catch (error) {
    console.error('Fetch reviews error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/reviews — customer submits a review for one of their own
// COMPLETED orders. multipart/form-data: orderId, rating, title, comment,
// images (0-5 files, field name "images").
export async function POST(req) {
  try {
    const user = await verifyUser(req);
    if (!user) {
      return Response.json({ success: false, error: 'Please log in to write a review.' }, { status: 401 });
    }

    const formData = await req.formData();
    const orderId = formData.get('orderId');
    const ratingRaw = formData.get('rating');
    const title = (formData.get('title') || '').toString().trim().slice(0, 120);
    const comment = (formData.get('comment') || '').toString().trim().slice(0, 2000);
    const imageFiles = formData.getAll('images').filter((f) => f && typeof f === 'object' && f.size > 0);

    const rating = parseInt(ratingRaw, 10);
    if (!orderId) {
      return Response.json({ success: false, error: 'orderId is required' }, { status: 400 });
    }
    if (!rating || rating < 1 || rating > 5) {
      return Response.json({ success: false, error: 'Please select a star rating.' }, { status: 400 });
    }
    if (!comment || comment.length < 5) {
      return Response.json({ success: false, error: 'Please write a few words about your experience.' }, { status: 400 });
    }
    if (imageFiles.length > MAX_IMAGES) {
      return Response.json({ success: false, error: `You can attach up to ${MAX_IMAGES} photos.` }, { status: 400 });
    }
    for (const file of imageFiles) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return Response.json({ success: false, error: 'Photos must be JPG, PNG or WEBP.' }, { status: 400 });
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return Response.json({ success: false, error: 'Each photo must be under 5MB.' }, { status: 400 });
      }
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { review: { select: { id: true } } },
    });

    if (!order || order.customerId !== user.id) {
      return Response.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    }
    if (order.status !== 'COMPLETED') {
      return Response.json({ success: false, error: 'You can review this service once your booking is completed.' }, { status: 400 });
    }
    if (order.review) {
      return Response.json({ success: false, error: "You've already reviewed this booking." }, { status: 409 });
    }

    const uploaded = [];
    for (const file of imageFiles) {
      const result = await uploadFile(file, 'reviews', {
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        maxBytes: MAX_IMAGE_BYTES,
      });
      uploaded.push(result);
    }

    const review = await prisma.review.create({
      data: {
        orderId: order.id,
        userId: user.id,
        packageId: order.packageId,
        artistId: order.artistId,
        rating,
        title: title || null,
        comment,
        images: uploaded.map((u) => u.url),
        imagePublicIds: uploaded.map((u) => u.publicId),
        isApproved: false,
      },
    });

    return Response.json({
      success: true,
      review,
      message: "Thanks for your review! It'll be visible on the page once it's been approved.",
    });
  } catch (error) {
    console.error('Create review error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
