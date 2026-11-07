export const dynamic = 'force-dynamic'; 
 
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { verifyAdmin } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const packageId = url.searchParams.get('packageId');

    const where = {};
    if (status) where.status = status;
    if (packageId) where.packageId = packageId;

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        package: { select: { id: true, name: true, price: true } },
        artist: { select: { id: true, name: true, phone: true } },
        payment: { select: { id: true, status: true, amount: true } },
      },
    });

    return Response.json({ success: true, orders });
  } catch (error) {
    console.error('Orders error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { customerId, packageId, date, time, location, specialNotes } = body;

    // Generate order number
    const orderNumber = 'ORD' + Date.now().toString().slice(-8);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        // Admin-created orders aren't part of a customer combined checkout —
        // give each one its own single-order group so groupId is never null.
        groupId: 'GRP' + crypto.randomBytes(8).toString('hex'),
        customerId,
        packageId,
        date: new Date(date),
        time,
        location,
        specialNotes,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        amount: 0, // Will be updated after payment
        gst: 0, // GST is no longer applied
        discount: 0,
        totalAmount: 0,
      },
      include: {
        customer: { select: { name: true, email: true } },
        package: { select: { name: true, price: true } },
      },
    });

    // Send confirmation email
    const { sendOrderConfirmationEmail, sendAdminNotificationEmail } = await import('@/lib/email');
    await sendOrderConfirmationEmail(order.customer.email, {
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      packageName: order.package.name,
      date: order.date,
      time: order.time,
      location: order.location,
      amount: order.package.price,
    });
    await sendAdminNotificationEmail({
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      packageName: order.package.name,
      date: order.date,
      amount: order.package.price,
    });

    return Response.json({ success: true, order });
  } catch (error) {
    console.error('Create order error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}