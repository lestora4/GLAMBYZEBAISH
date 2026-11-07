-- ========================================================================
-- Zeba — separate CUSTOMER vs ARTIST affiliates — Neon SQL Editor script
--
-- Run this ONCE, straight in the Neon console (Tables > SQL Editor).
-- Safe to run more than once.
--
-- What this does:
--   1. Adds a "type" column (CUSTOMER / ARTIST) to "affiliates", so the
--      two groups can be reported on, and future commission rules set,
--      separately — even though they share the same underlying table.
--   2. Backfills existing rows: every affiliate that existed before this
--      change was created through the artist-earnings flow, so they're
--      all tagged ARTIST (the column's default already does this).
--   3. Backfills a real "affiliate" row for every EXISTING customer who
--      already has a referral code but never got one (previously,
--      customer referral codes were just a text field with nothing
--      behind them). This makes their codes trackable going forward.
-- ========================================================================

-- 1) Enum type
-- ------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AffiliateType') THEN
        CREATE TYPE "AffiliateType" AS ENUM ('CUSTOMER', 'ARTIST');
    END IF;
END $$;

-- 2) Column (existing rows default to ARTIST — see note above)
-- ------------------------------------------------------------------------
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "type" "AffiliateType" NOT NULL DEFAULT 'ARTIST';

-- 3) Backfill: give every existing customer with a referral code a real
--    CUSTOMER-type affiliate row, so their code is trackable.
--    (pgcrypto is needed for gen_random_uuid() — already enabled if you
--    ran the earlier coupon scripts, but safe to re-request here.)
-- ------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "affiliates"
    ("id", "userId", "referralCode", "type", "status", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    u."id",
    u."referralCode",
    'CUSTOMER',
    'ACTIVE',
    now(),
    now()
FROM "users" u
WHERE u."role" = 'CUSTOMER'
  AND u."referralCode" IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM "affiliates" a WHERE a."userId" = u."id"
  )
ON CONFLICT ("userId") DO NOTHING;

-- 4) Confirm
-- ------------------------------------------------------------------------
SELECT "type", COUNT(*) AS total
FROM "affiliates"
GROUP BY "type"
ORDER BY "type";
