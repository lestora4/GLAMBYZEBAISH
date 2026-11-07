export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { PrismaClient } from '@prisma/client';
import { verifyArtist } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const artist = await verifyArtist(req);
    if (!artist) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const fullArtist = await prisma.artist.findUnique({
      where: { id: artist.id },
      include: { skills: true },
    });

    return Response.json({
      success: true,
      profile: {
        id: fullArtist.id,
        name: fullArtist.name,
        email: fullArtist.email,
        username: fullArtist.username,
        phone: fullArtist.phone,
        location: fullArtist.location,
        bio: fullArtist.bio,
        imageUrl: fullArtist.imageUrl,
        status: fullArtist.status,
        rating: fullArtist.rating,
        totalReviews: fullArtist.totalReviews,
        experience: fullArtist.experience,
        isApproved: fullArtist.isApproved,
        idProofStatus: fullArtist.idProofStatus,
        idProofUrl: fullArtist.idProofUrl,
        rejectionReason: fullArtist.rejectionReason,
        skills: fullArtist.skills.map((s) => s.skill),
      },
    });
  } catch (error) {
    console.error('❌ Artist profile GET error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const artist = await verifyArtist(req);
    if (!artist) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, location, bio, skills } = body;

    if (!name || name.trim().length < 2) {
      return Response.json({ success: false, error: 'Please enter your full name.' }, { status: 400 });
    }
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return Response.json({ success: false, error: 'Please enter a valid phone number.' }, { status: 400 });
    }

    const updated = await prisma.artist.update({
      where: { id: artist.id },
      data: {
        name: name.trim(),
        phone: phone.trim(),
        location: location ? location.trim() : artist.location,
        bio: bio ? bio.trim() : artist.bio,
        ...(Array.isArray(skills)
          ? {
              skills: {
                deleteMany: {},
                create: skills
                  .filter(Boolean)
                  .map((skill) => ({ skill: skill.trim(), level: 3 })),
              },
            }
          : {}),
      },
      include: { skills: true },
    });

    return Response.json({
      success: true,
      profile: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        location: updated.location,
        bio: updated.bio,
        skills: updated.skills.map((s) => s.skill),
      },
    });
  } catch (error) {
    console.error('❌ Artist profile PUT error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
