export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { uploadFile } from '@/lib/upload';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    // Check if it's FormData (artist with file) or JSON (customer)
    const contentType = req.headers.get('content-type') || '';
    let body;
    let role = 'customer';
    let name, email, phone, password, referralCode;
    let bio, specialties, location, idProofFile;

    if (contentType.includes('multipart/form-data')) {
      // Handle artist registration with file upload
      const formData = await req.formData();
      role = formData.get('role') || 'customer';
      name = formData.get('name');
      email = formData.get('email');
      phone = formData.get('phone');
      password = formData.get('password');
      referralCode = formData.get('referralCode') || null;
      bio = formData.get('bio');
      specialties = formData.get('specialties');
      location = formData.get('location');
      idProofFile = formData.get('idProof');
    } else {
      // Handle customer registration (JSON)
      body = await req.json();
      role = body.role || 'customer';
      name = body.name;
      email = body.email;
      phone = body.phone;
      password = body.password;
      referralCode = body.referralCode || null;
      bio = body.bio;
      specialties = body.specialties;
      location = body.location;
    }

    console.log(`Registration attempt for ${role}:`, email);

    // Validate required fields (common for both)
    if (!name || !email || !phone || !password) {
      return Response.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!email.includes('@') || !email.includes('.')) {
      return Response.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate phone (basic check)
    if (phone.length < 10) {
      return Response.json(
        { success: false, error: 'Please enter a valid phone number' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return Response.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists in User table — this only matters for
    // customer registration. Customers and artists are separate tables/
    // roles on purpose (someone can be a customer AND an artist with the
    // same email), so an existing customer record must never block an
    // artist registration attempt. Artist registration has its own
    // duplicate-email check against the Artist table right below.
    if (role !== 'artist') {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email },
            { phone: phone }
          ]
        }
      });

      if (existingUser) {
        if (existingUser.email === email) {
          return Response.json(
            { success: false, error: 'Email already registered' },
            { status: 409 }
          );
        }
        if (existingUser.phone === phone) {
          return Response.json(
            { success: false, error: 'Phone number already registered' },
            { status: 409 }
          );
        }
      }
    }

    // Check if artist exists with same email
    if (role === 'artist') {
      const existingArtist = await prisma.artist.findUnique({
        where: { email: email }
      });

      if (existingArtist) {
        return Response.json(
          { success: false, error: 'Email already registered as an artist' },
          { status: 409 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ========== ARTIST REGISTRATION ==========
    if (role === 'artist') {
      // Validate artist-specific fields
      if (!bio || bio.length < 20) {
        return Response.json(
          { success: false, error: 'Please tell us about your experience (min 20 characters)' },
          { status: 400 }
        );
      }

      if (!specialties || specialties.length < 2) {
        return Response.json(
          { success: false, error: 'Please list at least one specialty' },
          { status: 400 }
        );
      }

      if (!location || location.length < 2) {
        return Response.json(
          { success: false, error: 'Please enter your service location' },
          { status: 400 }
        );
      }

      if (!idProofFile) {
        return Response.json(
          { success: false, error: 'Please upload an ID proof' },
          { status: 400 }
        );
      }

      // Upload ID proof to Cloudinary
      let idProofUrl = null;
      let idProofPublicId = null;

      try {
        const uploadResult = await uploadFile(idProofFile, 'artist-id-proofs');
        idProofUrl = uploadResult.url;
        idProofPublicId = uploadResult.publicId;
        console.log('✅ ID proof uploaded:', idProofUrl);
      } catch (uploadError) {
        console.error('❌ ID proof upload failed:', uploadError);
        return Response.json(
          { success: false, error: 'Failed to upload ID proof. Please try again.' },
          { status: 500 }
        );
      }

      // Specialities from the registration form ("Bridal, HD Makeup, ...")
      // are stored as ArtistSkill rows so the admin Artists table can show
      // them in a dedicated "Specialities" column.
      const specialtyList = specialties
        ? String(specialties).split(',').map(s => s.trim()).filter(Boolean)
        : [];

      // Create artist with ID proof
      const artist = await prisma.artist.create({
        data: {
          name,
          email,
          username: email,
          phone,
          password: hashedPassword,
          bio,
          location,
          idProofUrl: idProofUrl,
          idProofPublicId: idProofPublicId,
          idProofStatus: 'PENDING',
          isApproved: false,
          status: 'AVAILABLE',
          skills: specialtyList.length ? {
            create: specialtyList.map(skill => ({ skill, level: 3 })),
          } : undefined,
        },
      });

      console.log('✅ Artist created:', artist.email);

      // Send confirmation email to artist
      try {
        const { sendArtistRegistrationConfirmation, sendAdminArtistNotification } = await import('@/lib/email');
        
        await sendArtistRegistrationConfirmation(email, {
          name,
          email,
          specialties,
          location,
        });

        // Send notification to admin
        await sendAdminArtistNotification({
          name,
          email,
          phone,
          bio,
          specialties,
          location,
          idProofUrl: idProofUrl,
        });
      } catch (emailError) {
        console.error('⚠️ Email sending failed:', emailError);
        // Don't fail registration if email fails
      }

      // Generate JWT token
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
          name: artist.name,
          phone: artist.phone,
          role: 'ARTIST',
          isApproved: artist.isApproved,
        },
      });
    }

    // ========== CUSTOMER REGISTRATION ==========
    // Generate unique referral code
    const generatedReferralCode = 'REF' + Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 5).toUpperCase();

    // If they entered a referral code, it must match a real affiliate's
    // code. We only TRACK the link here (referredByAffiliateId +
    // totalRegistrations) — no commission or payout logic exists yet;
    // that gets built once the client sets the actual commission rules.
    // An empty/omitted field is always fine (referral is optional).
    let referringAffiliate = null;
    if (referralCode && String(referralCode).trim()) {
      referringAffiliate = await prisma.affiliate.findUnique({
        where: { referralCode: String(referralCode).trim().toUpperCase() },
      });

      if (!referringAffiliate) {
        return Response.json(
          { success: false, error: 'That referral code isn\'t valid. Please check it and try again, or leave it blank.' },
          { status: 400 }
        );
      }
    }

    // Create user (default role: CUSTOMER)
    const user = await prisma.user.create({
      data: {
        name: name,
        email: email,
        phone: phone,
        password: hashedPassword,
        role: 'CUSTOMER',
        referralCode: generatedReferralCode,
        referredByAffiliateId: referringAffiliate ? referringAffiliate.id : null,
      },
    });

    if (referringAffiliate) {
      await prisma.affiliate.update({
        where: { id: referringAffiliate.id },
        data: { totalRegistrations: { increment: 1 } },
      });
    }

    // Every customer gets their own CUSTOMER-type affiliate record, kept
    // completely separate from artist affiliates (which are type ARTIST —
    // see /api/artist/earnings). This is what makes their referral code
    // trackable: clicks, registrations and (once the client defines
    // commission rules) payouts, all reported independently from artists.
    await prisma.affiliate.create({
      data: {
        userId: user.id,
        referralCode: generatedReferralCode,
        type: 'CUSTOMER',
        status: 'ACTIVE',
      },
    });

    console.log('User created successfully:', user.email);

    // Generate JWT token for auto-login after registration
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
    console.error('Registration error:', error);
    return Response.json(
      { success: false, error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
