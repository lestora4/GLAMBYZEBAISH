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

    const packages = await prisma.package.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return Response.json({ success: true, packages });
  } catch (error) {
    console.error('Packages error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, slug, description, shortDescription, price, gst, duration, category, whatsIncluded, images, isActive } = body;

    const pkg = await prisma.package.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description,
        shortDescription,
        price: parseFloat(price),
        gst: 0, // GST is no longer applied anywhere in the app
        duration: parseInt(duration) || 60,
        category: category || 'PARTY',
        whatsIncluded: whatsIncluded || [],
        images: images || [],
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return Response.json({ success: true, package: pkg });
  } catch (error) {
    console.error('Create package error:', error);
    if (error.code === 'P2002') {
      return Response.json({ success: false, error: 'Package with this slug already exists' }, { status: 400 });
    }
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}