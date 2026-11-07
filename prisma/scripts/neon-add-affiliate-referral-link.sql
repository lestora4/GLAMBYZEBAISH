-- ========================================================================
-- Zeba — link customers to the affiliate who referred them — Neon script
--
-- Run this ONCE, straight in the Neon console (Tables > SQL Editor).
-- Safe to run more than once (IF NOT EXISTS everywhere).
--
-- What this does:
--   Adds a "referredByAffiliateId" column on "users", pointing at the
--   "affiliates" table. When a customer signs up with a valid referral
--   code, the app sets this column so it's recorded which affiliate
--   referred them.
--
-- This is TRACKING ONLY — no commission or payout rules exist yet.
-- Once those rules are defined, this link is what future commission
-- calculations will read from.
-- ========================================================================

-- 1) Column
-- ------------------------------------------------------------------------
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referredByAffiliateId" TEXT;

-- 2) Index (for looking up "which customers did this affiliate refer")
-- ------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "users_referredByAffiliateId_idx"
    ON "users"("referredByAffiliateId");

-- 3) Foreign key to affiliates — if a customer is referred, it must be by
--    a real affiliate; if that affiliate is ever deleted, this just goes
--    back to NULL rather than blocking the delete.
-- ------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_referredByAffiliateId_fkey'
    ) THEN
        ALTER TABLE "users"
            ADD CONSTRAINT "users_referredByAffiliateId_fkey"
            FOREIGN KEY ("referredByAffiliateId") REFERENCES "affiliates"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 4) Confirm
-- ------------------------------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'referredByAffiliateId';
