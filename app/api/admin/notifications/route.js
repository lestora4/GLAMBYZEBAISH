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

    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    // Format time for display
    const formatted = notifications.map(n => ({
      ...n,
      time: getTimeAgo(n.createdAt),
    }));

    return Response.json({ success: true, notifications: formatted });
  } catch (error) {
    console.error('Notifications error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, title, message, type, link } = await req.json();

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || 'GENERAL',
        link: link || null,
      },
    });

    return Response.json({ success: true, notification });
  } catch (error) {
    console.error('Create notification error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

function getTimeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
  if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
  if (diff < 604800) return Math.floor(diff / 86400) + ' days ago';
  return new Date(date).toLocaleDateString();
}