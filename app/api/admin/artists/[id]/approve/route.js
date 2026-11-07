export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { PrismaClient } from '@prisma/client';
import { verifyAdmin, verifyArtistPanel } from '@/lib/auth';
import { sendArtistApprovalEmail } from '@/lib/email';

const prisma = new PrismaClient();

export async function PUT(req, { params }) {
  try {
    // Accept either the main Admin login OR the separate Artist Registrations
    // panel login (its own credentials, see /api/artist-admin/login).
    const admin = await verifyAdmin(req);
    const artistPanel = admin ? null : verifyArtistPanel(req);
    if (!admin && !artistPanel) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { approved, rejectionReason } = await req.json();

    const artist = await prisma.artist.update({
      where: { id },
      data: {
        isApproved: approved,
        idProofStatus: approved ? 'VERIFIED' : 'REJECTED',
        rejectionReason: approved ? null : rejectionReason,
        approvedAt: approved ? new Date() : null,
      },
    });

    // Send email notification to artist
    await sendArtistApprovalEmail(artist.email, {
      name: artist.name,
      isApproved: approved,
      rejectionReason: rejectionReason,
    });

    return Response.json({
      success: true,
      artist,
      message: approved ? 'Artist approved successfully' : 'Artist rejected',
    });
  } catch (error) {
    console.error('Artist approval error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}