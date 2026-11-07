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

    // Get unique locations
    const artists = await prisma.artist.findMany({
      where: { location: { not: null } },
      select: { location: true },
      distinct: ['location'],
    });

    const locations = artists.map(a => a.location).filter(Boolean);

    return Response.json({ success: true, locations });
  } catch (error) {
    console.error('Locations error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}