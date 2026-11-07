import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(req, { params }) {
  try {
    const { userId, addressId } = params;
    const { label, fullName, phone, addressLine1, addressLine2, city, state, pincode, country, isDefault } = await req.json();

    const existingAddress = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existingAddress) {
      return Response.json({ success: false, error: 'Address not found' });
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, NOT: { id: addressId } },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id: addressId },
      data: {
        label,
        fullName,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        country,
        isDefault,
      },
    });

    return Response.json({
      success: true,
      address,
    });
  } catch (error) {
    console.error('Error updating address:', error);
    return Response.json({ success: false, error: 'Failed to update address' });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { userId, addressId } = params;

    const existingAddress = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existingAddress) {
      return Response.json({ success: false, error: 'Address not found' });
    }

    await prisma.address.delete({
      where: { id: addressId },
    });

    if (existingAddress.isDefault) {
      const nextAddress = await prisma.address.findFirst({
        where: { userId },
      });
      if (nextAddress) {
        await prisma.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return Response.json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    return Response.json({ success: false, error: 'Failed to delete address' });
  }
}