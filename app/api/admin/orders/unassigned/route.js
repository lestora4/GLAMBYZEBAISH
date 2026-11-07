export const dynamic = 'force-dynamic';

import { PrismaClient } from '@prisma/client';
import { verifyAdmin, verifyArtistPanel } from '@/lib/auth';

const prisma = new PrismaClient();

// Search customers' bookings that don't have an artist yet, so an admin can
// pick a specific customer/booking to assign an approved artist to.
// Used by both the main Admin dashboard and the separate Artist Registrations
// panel (see /api/artist-admin/login).
export async function GET(req) {
  try {
    const admin = await verifyAdmin(req);
    const artistPanel = admin ? null : verifyArtistPanel(req);
    if (!admin && !artistPanel) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const query = (url.searchParams.get('q') || '').trim();

    const where = {
      artistId: null,
      status: 'PENDING',
    };

    if (query) {
      where.OR = [
        { orderNumber: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } },
        { customer: { name: { contains: query, mode: 'insensitive' } } },
        { customer: { email: { contains: query, mode: 'insensitive' } } },
        { customer: { phone: { contains: query, mode: 'insensitive' } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { date: 'asc' },
      take: 30,
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        package: { select: { name: true, category: true } },
      },
    });

    return Response.json({ success: true, orders });
  } catch (error) {
    console.error('Unassigned orders search error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
