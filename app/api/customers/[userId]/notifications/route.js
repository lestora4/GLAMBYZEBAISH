export const dynamic = 'force-dynamic';

import { PrismaClient } from '@prisma/client';
import { verifyUser } from '@/lib/auth';

const prisma = new PrismaClient();

// dashboard.html already calls fetch(`/api/customers/${userId}/notifications`)
// for the bell icon + notifications tab — that route didn't exist yet, so it
// was failing silently (caught by the try/catch, just logged to console).
export async function GET(req, { params }) {
  try {
    const user = await verifyUser(req);
    if (!user || user.id !== params.userId) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: params.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return Response.json({ success: true, notifications });
  } catch (error) {
    console.error('Customer notifications error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
