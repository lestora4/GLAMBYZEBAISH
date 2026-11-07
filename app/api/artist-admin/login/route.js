export const dynamic = 'force-dynamic';

import jwt from 'jsonwebtoken';

// CORS headers for domain
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.glambyzebaish.com',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// Dedicated login for the Artist Registrations panel. Deliberately separate
// from /api/admin/auth/login and the Admin table — this panel has its own
// single set of credentials, overridable via env vars without a code change.
export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json(
        { success: false, error: 'Email and password are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const validEmail = process.env.ARTIST_PANEL_EMAIL || 'artist@glambyzebaish.com';
    const validPassword = process.env.ARTIST_PANEL_PASSWORD || 'Artist@2050';

    if (email.trim().toLowerCase() !== validEmail.toLowerCase() || password !== validPassword) {
      return Response.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = jwt.sign(
      { email: validEmail, role: 'ARTIST_PANEL' },
      process.env.JWT_SECRET || 'glam-by-zeba-super-secret-key-2026',
      { expiresIn: '7d' }
    );

    return Response.json(
      {
        success: true,
        token,
        account: { email: validEmail, role: 'ARTIST_PANEL' },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Artist panel login error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
