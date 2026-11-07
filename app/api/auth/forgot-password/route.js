export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Generic message regardless of whether the email exists, so this endpoint
// can't be used to enumerate registered emails.
const GENERIC_SUCCESS = {
  success: true,
  message: 'If an account exists for that email, a password reset link has been sent.',
};

export async function POST(req) {
  try {
    const { email, role } = await req.json();
    const normalizedRole = role === 'artist' ? 'artist' : 'customer';

    if (!email || !email.includes('@')) {
      return Response.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.glambyzebaish.com';

    if (normalizedRole === 'artist') {
      const artist = await prisma.artist.findUnique({ where: { email } });

      if (artist) {
        await prisma.artist.update({
          where: { id: artist.id },
          data: { resetToken: token, resetTokenExpiry },
        });

        const resetLink = `${baseUrl}/reset-password?token=${token}&role=artist`;

        try {
          const { sendPasswordResetEmail } = await import('@/lib/email');
          await sendPasswordResetEmail(artist.email, {
            name: artist.name,
            resetLink,
            role: 'artist',
          });
        } catch (emailError) {
          console.error('⚠️ Password reset email failed (artist):', emailError);
        }
      }
    } else {
      const user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { resetToken: token, resetTokenExpiry },
        });

        const resetLink = `${baseUrl}/reset-password?token=${token}&role=customer`;

        try {
          const { sendPasswordResetEmail } = await import('@/lib/email');
          await sendPasswordResetEmail(user.email, {
            name: user.name,
            resetLink,
            role: 'customer',
          });
        } catch (emailError) {
          console.error('⚠️ Password reset email failed (customer):', emailError);
        }
      }
    }

    // Always return the same generic response, whether or not the account
    // was found or the account type didn't match — don't leak account
    // existence, and don't fail the request just because email sending
    // (a non-critical side effect) had a problem.
    return Response.json(GENERIC_SUCCESS);
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    return Response.json(
      { success: false, error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
