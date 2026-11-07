export const dynamic = 'force-dynamic';

console.log("=== LOGIN API LOADED ===");
console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// CORS headers for domain
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.glambyzebaish.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  console.log("=== OPTIONS CALLED ===");
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(req) {
  console.log("=== POST LOGIN CALLED ===");
  console.log("Time:", new Date().toISOString());
  
  try {
    console.log("Parsing request body...");
    const { email, password } = await req.json();
    console.log("Email provided:", email);
    console.log("Password provided:", !!password);

    // Find admin
    console.log("Looking for admin in database...");
    const admin = await prisma.admin.findUnique({
      where: { email },
    });
    console.log("Admin found:", !!admin);

    if (!admin) {
      console.log("Admin not found for email:", email);
      return Response.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify password
    console.log("Verifying password...");
    const isValid = await bcrypt.compare(password, admin.password);
    console.log("Password valid:", isValid);
    
    if (!isValid) {
      console.log("Invalid password for:", email);
      return Response.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Create JWT
    console.log("Creating JWT...");
    const jwtSecret = process.env.JWT_SECRET || 'glam-by-zeba-super-secret-key-2026';
    console.log("Using JWT_SECRET:", jwtSecret.substring(0, 10) + "...");
    
    const token = jwt.sign(
      { 
        id: admin.id, 
        email: admin.email, 
        name: admin.name,
        role: admin.role 
      },
      jwtSecret,
      { expiresIn: '7d' }
    );
    console.log("JWT created successfully");

    console.log("=== LOGIN SUCCESS ===");
    return Response.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    }, {
      headers: corsHeaders,
    });
    
  } catch (error) {
    console.error("=== LOGIN ERROR ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error:", error);
    
    return Response.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message,
        name: error.name 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}