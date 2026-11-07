export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const body = await req.json();
    // "email" field doubles as a generic identifier — an artist can log in
    // with either their email address or the username an admin assigned.
    const identifier = (body.identifier || body.email || '').trim();
    const { password } = body;

    if (!identifier || !password) {
      return Response.json(
        { success: false, error: 'Email/username and password are required' },
        { status: 400 }
      );
    }

    const artist = await prisma.artist.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
        ],
      },
    });

    if (!artist) {
      return Response.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, artist.password);
    if (!isValid) {
      return Response.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        id: artist.id,
        email: artist.email,
        name: artist.name,
        role: 'ARTIST',
      },
      process.env.JWT_SECRET || 'glam-by-zeba-super-secret-key-2026',
      { expiresIn: '7d' }
    );

    return Response.json({
      success: true,
      token,
      user: {
        id: artist.id,
        email: artist.email,
        username: artist.username,
        name: artist.name,
        phone: artist.phone,
        role: 'ARTIST',
        isApproved: artist.isApproved,
        idProofStatus: artist.idProofStatus,
      },
    });
  } catch (error) {
    console.error('❌ Artist login error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
