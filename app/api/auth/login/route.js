export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    console.log('📧 Customer login attempt for:', email);

    // Find user (customers only)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('❌ User not found:', email);
      return Response.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is a customer (not admin)
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      console.log('❌ Admin trying to login as customer');
      return Response.json(
        { success: false, error: 'Please use admin login' },
        { status: 403 }
      );
    }

    console.log('✅ User found:', user.email);

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    console.log('✅ Password valid:', isValid);

    if (!isValid) {
      return Response.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        role: user.role 
      },
      process.env.JWT_SECRET || 'glam-by-zeba-super-secret-key-2026',
      { expiresIn: '7d' }
    );

    // Return user data (excluding password)
    return Response.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ Customer login error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}