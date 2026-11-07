// One-time setup script: creates (or re-configures) Zeba's coupons.
//
// Run once after the migration has been applied:
//   node prisma/scripts/create-coupon.js
//
// Safe to re-run: it upserts on `code`, so running it again just updates
// discountPct/maxUses/isActive on each coupon rather than creating a
// duplicate or resetting usedCount back to 0.
//
// By default this creates/updates TWO coupons:
//   - ZEBA39TZEQ : 10% off, capped at 100 redemptions (existing launch code)
//   - ZEBA25     : 25% off, capped at 100 redemptions (new code)
//
// To manage just a single coupon via env vars (legacy behavior), set
// COUPON_CODE / COUPON_DISCOUNT_PCT / COUPON_MAX_USES — this will upsert
// only that one coupon and skip the default list below.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_COUPONS = [
  { code: 'ZEBA39TZEQ', discountPct: 10, maxUses: 100 },
  { code: 'ZEBA25', discountPct: 25, maxUses: 100 },
];

const coupons = process.env.COUPON_CODE
  ? [
      {
        code: process.env.COUPON_CODE,
        discountPct: Number(process.env.COUPON_DISCOUNT_PCT || 10),
        maxUses: Number(process.env.COUPON_MAX_USES || 100),
      },
    ]
  : DEFAULT_COUPONS;

async function main() {
  for (const { code, discountPct, maxUses } of coupons) {
    const coupon = await prisma.coupon.upsert({
      where: { code },
      update: {
        discountPct,
        maxUses,
        isActive: true,
      },
      create: {
        code,
        discountPct,
        maxUses,
        isActive: true,
      },
    });

    console.log('Coupon ready:');
    console.log(`  Code       : ${coupon.code}`);
    console.log(`  Discount   : ${coupon.discountPct}%`);
    console.log(`  Max uses   : ${coupon.maxUses}`);
    console.log(`  Used so far: ${coupon.usedCount}`);
    console.log(`  Active     : ${coupon.isActive}`);
    console.log('');
  }
}

main()
  .catch((err) => {
    console.error('Failed to create coupon:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
