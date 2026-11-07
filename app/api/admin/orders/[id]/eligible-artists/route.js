export const dynamic = 'force-dynamic';

import { PrismaClient } from '@prisma/client';
import { verifyAdmin } from '@/lib/auth';

const prisma = new PrismaClient();

// Turns "HAIR_STYLING" / "Hair Styling" / "hair-styling" into "hairstyling"
// so free-text artist skills can be compared against the package category
// and package name without worrying about spacing, case, or punctuation.
function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function GET(req, { params }) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { package: true },
    });

    if (!order) {
      return Response.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Only approved, currently-available artists can be assigned.
    const artists = await prisma.artist.findMany({
      where: {
        isApproved: true,
        status: 'AVAILABLE',
      },
      include: { skills: true },
      orderBy: { rating: 'desc' },
    });

    const orderLocation = normalize(order.location);
    const packageCategory = normalize(order.package?.category);
    const packageName = normalize(order.package?.name);

    const scored = artists.map((artist) => {
      const artistLocation = normalize(artist.location);

      // Location match: the artist's saved location (e.g. "Madhapur" or
      // "Hyderabad") shows up in the booking's full address, or vice versa.
      const locationMatch = !!artistLocation && !!orderLocation &&
        (orderLocation.includes(artistLocation) || artistLocation.includes(orderLocation));

      // Skill match: any of the artist's listed skills relates to this
      // package's category or name (e.g. skill "Bridal" <-> category
      // "BRIDAL", skill "Airbrush" <-> package "Airbrush Makeup").
      const matchedSkills = (artist.skills || []).filter((s) => {
        const skill = normalize(s.skill);
        if (!skill) return false;
        return (
          (packageCategory && (skill.includes(packageCategory) || packageCategory.includes(skill))) ||
          (packageName && (skill.includes(packageName) || packageName.includes(skill)))
        );
      });
      const skillMatch = matchedSkills.length > 0;

      // Currently-active bookings, so admins can see who's already busy
      // around that slot even though status is "AVAILABLE" overall.
      let score = 0;
      if (locationMatch) score += 2;
      if (skillMatch) score += 2;
      score += Math.min(artist.rating || 0, 5) / 5; // small tiebreaker, 0-1

      return {
        id: artist.id,
        name: artist.name,
        phone: artist.phone,
        location: artist.location,
        experience: artist.experience,
        rating: artist.rating,
        totalReviews: artist.totalReviews,
        imageUrl: artist.imageUrl,
        skills: (artist.skills || []).map((s) => s.skill),
        matchedSkills: matchedSkills.map((s) => s.skill),
        locationMatch,
        skillMatch,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score || b.rating - a.rating);

    return Response.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        location: order.location,
        packageName: order.package?.name,
        packageCategory: order.package?.category,
      },
      artists: scored,
    });
  } catch (error) {
    console.error('Eligible artists error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
