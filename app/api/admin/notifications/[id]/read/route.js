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

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return Response.json({ success: true, notification });
  } catch (error) {
    console.error('Mark read error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}