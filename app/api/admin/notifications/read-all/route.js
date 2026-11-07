export const dynamic = 'force-dynamic'; 
 
import { PrismaClient } from '@prisma/client';
import { verifyAdmin } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PUT(req) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Mark all notifications as read for this admin
    // Since admin doesn't have direct notifications, we'll update all
    // In a real app, you might want to filter by admin ID
    await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}