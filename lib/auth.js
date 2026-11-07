import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function verifyAdmin(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'glam-by-zeba-super-secret-key-2026');
    
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
    });

    return admin;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export async function verifyUser(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'glam-by-zeba-super-secret-key-2026');
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    return user;
  } catch (error) {
    return null;
  }
}

export async function verifyArtist(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'glam-by-zeba-super-secret-key-2026');

    if (decoded.role && decoded.role !== 'ARTIST') {
      return null;
    }

    const artist = await prisma.artist.findUnique({
      where: { id: decoded.id },
    });

    return artist;
  } catch (error) {
    return null;
  }
}

// Artist-registrations admin panel — separate credentials from the main Admin
// login. No DB lookup: the token itself (role: 'ARTIST_PANEL') is the proof,
// issued by /api/artist-admin/login.
export function verifyArtistPanel(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'glam-by-zeba-super-secret-key-2026');

    if (decoded.role !== 'ARTIST_PANEL') {
      return null;
    }

    return { email: decoded.email, role: 'ARTIST_PANEL' };
  } catch (error) {
    return null;
  }
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'admin' },
    process.env.JWT_SECRET || 'glam-by-zeba-super-secret-key-2026',
    { expiresIn: '7d' }
  );
}