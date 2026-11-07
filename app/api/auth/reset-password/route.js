export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// GET: used by the reset-password page to check the token is valid before
// showing the "set new password" form (so a stale/expired link fails fast
// with a clear message instead of a confusing form submit error).
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const role = searchParams.get('role') === 'artist' ? 'artist' : 'customer';

    if (!token) {
      return Response.json({ success: false, error: 'Missing reset token' }, { status: 400 });
    }

    const record =
      role === 'artist'
        ? await prisma.artist.findUnique({ where: { resetToken: token } })
        : await prisma.user.findUnique({ where: { resetToken: token } });

    if (!record || !record.resetTokenExpiry || record.resetTokenExpiry < new Date()) {
      return Response.json(
        { success: false, error: 'This reset link is invalid or has expired' },
        { status: 400 }
      );
    }

    return Response.json({ success: true, email: record.email });
  } catch (error) {
    console.error('❌ Reset token check error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { token, password, role } = await req.json();
    const normalizedRole = role === 'artist' ? 'artist' : 'customer';

    if (!token || !password) {
      return Response.json(
        { success: false, error: 'Reset token and new password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (normalizedRole === 'artist') {
      const artist = await prisma.artist.findUnique({ where: { resetToken: token } });

      if (!artist || !artist.resetTokenExpiry || artist.resetTokenExpiry < new Date()) {
        return Response.json(
          { success: false, error: 'This reset link is invalid or has expired' },
          { status: 400 }
        );
      }

      await prisma.artist.update({
        where: { id: artist.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
    } else {
      const user = await prisma.user.findUnique({ where: { resetToken: token } });

      if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        return Response.json(
          { success: false, error: 'This reset link is invalid or has expired' },
          { status: 400 }
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
    }

    return Response.json({
      success: true,
      message: 'Your password has been reset successfully. You can now log in.',
    });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    return Response.json(
      { success: false, error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
