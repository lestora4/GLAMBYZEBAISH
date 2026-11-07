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

    const settings = await prisma.setting.findMany();
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    return Response.json({ success: true, settings: settingsMap });
  } catch (error) {
    console.error('Settings error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { key, value } = await req.json();

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value, category: 'general' },
    });

    return Response.json({ success: true, setting });
  } catch (error) {
    console.error('Update setting error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}