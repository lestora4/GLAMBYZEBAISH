import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req, { params }) {
  try {
    const { userId } = params;

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });

    return Response.json({
      success: true,
      addresses,
    });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return Response.json({ success: false, error: 'Failed to fetch addresses' });
  }
}

export async function POST(req, { params }) {
  try {
    const { userId } = params;
    const { label, fullName, phone, addressLine1, addressLine2, city, state, pincode, country, isDefault } = await req.json();

    if (!fullName || !addressLine1 || !city || !state || !pincode) {
      return Response.json({ success: false, error: 'Please fill all required fields' });
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        label: label || 'Home',
        fullName,
        phone: phone || '',
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        country: country || 'India',
        isDefault: isDefault || false,
      },
    });

    const addressCount = await prisma.address.count({ where: { userId } });
    if (addressCount === 1) {
      await prisma.address.update({
        where: { id: address.id },
        data: { isDefault: true },
      });
    }

    return Response.json({
      success: true,
      address,
    });
  } catch (error) {
    console.error('Error adding address:', error);
    return Response.json({ success: false, error: 'Failed to add address' });
  }
}