import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Checks whether a coupon code is currently usable, WITHOUT reserving a
// redemption. This is what checkout.html's "Apply" button calls so the
// customer gets instant feedback (valid / expired / limit reached / already
// used) while they're still filling in the form. The 100-use cap AND the
// one-time-per-customer rule are only actually enforced (and can't be
// raced by two people clicking Apply/Pay at once) at order-creation time
// in /api/orders/create, which does the real atomic checks. This route is
// purely informational.
//
// Body: { code: string, subtotal?: number, customerEmail?: string }
export async function POST(req) {
  try {
    const body = await req.json();
    const code = (body.code || '').trim().toUpperCase();
    const subtotal = Number(body.subtotal) || 0;
    const customerEmail = (body.customerEmail || '').trim().toLowerCase();

    if (!code) {
      return Response.json({ success: false, error: 'Please enter a coupon code.' }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({ where: { code } });

    if (!coupon || !coupon.isActive) {
      return Response.json({ success: false, error: 'Invalid coupon code.' }, { status: 404 });
    }

    if (coupon.usedCount >= coupon.maxUses) {
      return Response.json({
        success: false,
        error: `This coupon's redemption limit (${coupon.maxUses}) has already been reached.`,
      }, { status: 409 });
    }

    // One-time use per customer: if this email has already redeemed this
    // coupon on a past (successful) order, don't let them apply it again.
    if (customerEmail) {
      const priorUse = await prisma.couponRedemption.findFirst({
        where: {
          couponId: coupon.id,
          customerEmail: { equals: customerEmail, mode: 'insensitive' },
        },
      });
      if (priorUse) {
        return Response.json({
          success: false,
          error: 'You have already used this coupon. Each coupon can only be used once per customer.',
        }, { status: 409 });
      }
    }

    const remaining = coupon.maxUses - coupon.usedCount;
    const discountAmount = Math.round((subtotal * coupon.discountPct) / 100);

    return Response.json({
      success: true,
      code: coupon.code,
      discountPct: coupon.discountPct,
      discountAmount,
      remaining,
    });
  } catch (error) {
    console.error('Coupon validate error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
