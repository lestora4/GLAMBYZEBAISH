export const dynamic = 'force-dynamic';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/reviews/summary
// Public — returns { [packageSlug]: { average, total } } for packages that have
// at least one approved review. Packages with no reviews are left out, so the
// package cards can hide the rating completely until a first review exists.
export async function GET() {
  try {
    const groups = await prisma.review.groupBy({
      by: ['packageId'],
      where: { isApproved: true },
      _avg: { rating: true },
      _count: true,
    });

    if (!groups.length) {
      return Response.json({ success: true, summary: {} });
    }

    const packages = await prisma.package.findMany({
      where: { id: { in: groups.map((g) => g.packageId) } },
      select: { id: true, slug: true },
    });
    const slugById = {};
    packages.forEach((p) => { slugById[p.id] = p.slug; });

    const summary = {};
    groups.forEach((g) => {
      const slug = slugById[g.packageId];
      if (!slug || !g._count) return;
      summary[slug] = { average: g._avg.rating || 0, total: g._count };
    });

    return Response.json({ success: true, summary });
  } catch (error) {
    console.error('Review summary error:', error);
    return Response.json({ success: false, summary: {} }, { status: 500 });
  }
}
