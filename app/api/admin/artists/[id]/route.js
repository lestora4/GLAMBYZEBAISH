export const dynamic = 'force-dynamic';

import { PrismaClient } from '@prisma/client';
import { verifyAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function GET(req, { params }) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const artist = await prisma.artist.findUnique({
      where: { id },
      include: {
        skills: true,
        availability: true,
        bookings: {
          include: {
            customer: { select: { name: true, email: true, phone: true } },
            package: { select: { name: true, price: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!artist) {
      return Response.json({ success: false, error: 'Artist not found' }, { status: 404 });
    }

    return Response.json({ success: true, artist });
  } catch (error) {
    console.error('Artist detail error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, phone, bio, location, status, imageUrl, password } = body;

    const data = {
      name,
      phone,
      bio,
      location,
      status,
      imageUrl,
    };

    // Update password if provided
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const artist = await prisma.artist.update({
      where: { id },
      data,
      include: {
        skills: true,
      },
    });

    return Response.json({ success: true, artist });
  } catch (error) {
    console.error('Update artist error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.artist.delete({
      where: { id },
    });

    return Response.json({ success: true, message: 'Artist deleted successfully' });
  } catch (error) {
    console.error('Delete artist error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}