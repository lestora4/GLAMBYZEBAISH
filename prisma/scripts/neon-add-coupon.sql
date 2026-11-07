-- ========================================================================
-- Zeba / Glam checkout — coupon feature — Neon SQL Editor script
--
-- Run this ONCE, straight in the Neon console (Tables > SQL Editor, or
-- the "Query" tab against your project's database). It is safe to run
-- more than once: every statement is written to not fail if it's already
-- been applied (IF NOT EXISTS / ON CONFLICT DO NOTHING).
--
-- What this does:
--   1. Creates the "coupons" and "coupon_redemptions" tables the app's
--      /api/orders/create and /api/coupons/validate routes read/write.
--   2. Inserts your live coupon: ZEBA39TZEQ — 10% off, capped at the
--      first 100 successful redemptions.
-- ========================================================================

-- 1) Tables
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "coupons" (
    "id"          TEXT NOT NULL,
    "code"        TEXT NOT NULL,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "maxUses"     INTEGER NOT NULL DEFAULT 100,
    "usedCount"   INTEGER NOT NULL DEFAULT 0,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "coupon_redemptions" (
    "id"             TEXT NOT NULL,
    "couponId"       TEXT NOT NULL,
    "groupId"        TEXT NOT NULL,
    "customerEmail"  TEXT NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- 2) Indexes / constraints
-- ------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_key"
    ON "coupons"("code");

CREATE UNIQUE INDEX IF NOT EXISTS "coupon_redemptions_groupId_key"
    ON "coupon_redemptions"("groupId");

CREATE INDEX IF NOT EXISTS "coupon_redemptions_couponId_idx"
    ON "coupon_redemptions"("couponId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'coupon_redemptions_couponId_fkey'
    ) THEN
        ALTER TABLE "coupon_redemptions"
            ADD CONSTRAINT "coupon_redemptions_couponId_fkey"
            FOREIGN KEY ("couponId") REFERENCES "coupons"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 3) pgcrypto — needed for gen_random_uuid() used to generate the
--    coupon's id below. Neon has this extension available by default.
-- ------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 4) The actual coupon: ZEBA39TZEQ — 10% off, first 100 redemptions only.
--    Re-running this will NOT reset usedCount or duplicate the row,
--    because "code" is unique and this uses ON CONFLICT DO NOTHING.
-- ------------------------------------------------------------------------
INSERT INTO "coupons"
    ("id", "code", "discountPct", "maxUses", "usedCount", "isActive", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'ZEBA39TZEQ', 10, 100, 0, true, now(), now())
ON CONFLICT ("code") DO NOTHING;

-- 5) Confirm it's there
-- ------------------------------------------------------------------------
SELECT "code", "discountPct", "maxUses", "usedCount", "isActive"
FROM "coupons"
WHERE "code" = 'ZEBA39TZEQ';
