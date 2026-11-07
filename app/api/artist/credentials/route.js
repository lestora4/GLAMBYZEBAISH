export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { PrismaClient } from '@prisma/client';
import { verifyArtist } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Lets an artist, after logging in, edit/reset their own login credentials
// (username and/or password) from their Artist Dashboard > Profile page.
export async function PUT(req) {
  try {
    const artist = await verifyArtist(req);
    if (!artist) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword, username } = await req.json();

    if (!currentPassword) {
      return Response.json({ success: false, error: 'Please enter your current password to confirm changes.' }, { status: 400 });
    }

    const isValid = await bcrypt.compare(currentPassword, artist.password);
    if (!isValid) {
      return Response.json({ success: false, error: 'Current password is incorrect.' }, { status: 401 });
    }

    const data = {};

    if (username && username.trim() && username.trim() !== artist.username) {
      data.username = username.trim();
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return Response.json({ success: false, error: 'New password must be at least 6 characters.' }, { status: 400 });
      }
      data.password = await bcrypt.hash(newPassword, 10);
    }

    if (!Object.keys(data).length) {
      return Response.json({ success: false, error: 'Nothing to update — enter a new username or password.' }, { status: 400 });
    }

    const updated = await prisma.artist.update({
      where: { id: artist.id },
      data,
    });

    return Response.json({
      success: true,
      message: 'Login credentials updated successfully.',
      username: updated.username,
    });
  } catch (error) {
    console.error('❌ Artist credentials update error:', error);
    if (error.code === 'P2002') {
      return Response.json({ success: false, error: 'That username is already taken.' }, { status: 400 });
    }
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
