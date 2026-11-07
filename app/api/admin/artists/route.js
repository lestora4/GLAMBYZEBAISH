export const dynamic = 'force-dynamic'; 
export const runtime = 'nodejs';
 
import { PrismaClient } from '@prisma/client';
import { verifyAdmin, verifyArtistPanel } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    // Accept either the main Admin login OR the separate Artist Registrations
    // panel login (its own credentials, see /api/artist-admin/login).
    const admin = await verifyAdmin(req);
    const artistPanel = admin ? null : verifyArtistPanel(req);
    if (!admin && !artistPanel) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const location = url.searchParams.get('location');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');

    const where = {};
    
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    // Filter by registration date range
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(`${dateFrom}T00:00:00.000Z`);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
      }
    }

    // Filter by approval status
    if (status === 'pending') {
      where.isApproved = false;
    } else if (status === 'approved') {
      where.isApproved = true;
    } else if (status === 'rejected') {
      where.idProofStatus = 'REJECTED';
    }

    // Search functionality
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const artists = await prisma.artist.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        skills: true,
        availability: true,
        bookings: { 
          where: { status: { in: ['PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] } } 
        },
      },
    });

    return Response.json({ success: true, artists });
  } catch (error) {
    console.error('Artists error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    // Manual "Add Artist" entry — usable from the main Admin dashboard OR
    // the separate Artist Registrations panel, both land in the same table.
    const admin = await verifyAdmin(req);
    const artistPanel = admin ? null : verifyArtistPanel(req);
    if (!admin && !artistPanel) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Accept either plain JSON (no file) or multipart/form-data (with an
    // optional ID proof upload) so the admin "Add Artist" forms can attach
    // a document the same way the public artist registration flow does.
    const contentType = req.headers.get('content-type') || '';
    let name, email, phone, password, bio, location, skills, specialties,
      experience, status, isApproved, username, sendCredentials, idProofFile;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      name = formData.get('name');
      email = formData.get('email');
      phone = formData.get('phone');
      password = formData.get('password');
      bio = formData.get('bio');
      location = formData.get('location');
      specialties = formData.get('specialties');
      experience = formData.get('experience');
      status = formData.get('status');
      isApproved = formData.get('isApproved') === 'true';
      username = formData.get('username');
      sendCredentials = formData.get('sendCredentials') === 'true';
      idProofFile = formData.get('idProof');
      if (idProofFile && typeof idProofFile === 'string') idProofFile = null; // empty file input
    } else {
      const body = await req.json();
      ({
        name, email, phone, password, bio, location, skills, specialties,
        experience, status, isApproved, username, sendCredentials,
      } = body);
    }

    if (!name || !email) {
      return Response.json({ success: false, error: 'Name and email are required' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return Response.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const finalUsername = (username && username.trim()) ? username.trim() : email.trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Specialities can arrive either as an array ("skills") or a raw
    // comma-separated string ("specialties") straight from a form field.
    const skillList = Array.isArray(skills) && skills.length
      ? skills
      : (specialties ? String(specialties).split(',') : []);

    // Upload the ID proof (if one was attached) before creating the artist,
    // same Cloudinary flow used by the public registration form.
    let idProofUrl = null;
    let idProofPublicId = null;
    if (idProofFile) {
      try {
        const { uploadFile } = await import('@/lib/upload');
        const uploadResult = await uploadFile(idProofFile, 'artist-id-proofs');
        idProofUrl = uploadResult.url;
        idProofPublicId = uploadResult.publicId;
      } catch (uploadError) {
        console.error('❌ ID proof upload failed:', uploadError);
        return Response.json({ success: false, error: 'Failed to upload ID proof. Please try again.' }, { status: 500 });
      }
    }

    const artist = await prisma.artist.create({
      data: {
        name,
        email,
        username: finalUsername,
        phone,
        password: hashedPassword,
        bio,
        experience: experience ? parseInt(experience, 10) || 0 : 0,
        location: location || null,
        status: status || 'AVAILABLE',
        isApproved: isApproved || false,
        idProofUrl,
        idProofPublicId,
        idProofStatus: isApproved ? 'VERIFIED' : 'PENDING',
        skills: skillList.length ? {
          create: skillList.map(skill => ({
            skill: skill.trim(),
            level: 3,
          })).filter(s => s.skill),
        } : undefined,
      },
      include: {
        skills: true,
      },
    });

    // Optionally email the login credentials to the artist
    if (sendCredentials) {
      try {
        const { sendArtistCredentialsEmail } = await import('@/lib/email');
        await sendArtistCredentialsEmail(artist.email, {
          name: artist.name,
          username: finalUsername,
          password,
        });
      } catch (emailError) {
        console.error('⚠️ Credentials email failed:', emailError);
        // Don't fail artist creation if the email fails
      }
    }

    return Response.json({ success: true, artist });
  } catch (error) {
    console.error('Create artist error:', error);
    if (error.code === 'P2002') {
      const field = Array.isArray(error.meta?.target) ? error.meta.target[0] : error.meta?.target;
      const label = field && field.includes('username') ? 'username' : 'email';
      return Response.json({ success: false, error: `Artist with this ${label} already exists` }, { status: 400 });
    }
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}