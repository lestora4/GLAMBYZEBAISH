-- ========================================================================
-- Zeba / Glam checkout — add a SECOND coupon — Neon SQL Editor script
--
-- Run this ONCE, straight in the Neon console (Tables > SQL Editor, or
-- the "Query" tab against your project's database). It is safe to run
-- more than once — the insert uses ON CONFLICT DO NOTHING, so it will
-- never duplicate the row or reset usedCount.
--
-- This does NOT touch your existing "ZEBA39TZEQ" coupon (10% off) —
-- it just adds a new one alongside it:
--
--   ZEBA25 — 25% off, capped at the first 100 successful redemptions.
--
-- Assumes the "coupons" table already exists (created by
-- neon-add-coupon.sql / the 20260916120000_add_coupons migration).
-- ========================================================================

INSERT INTO "coupons"
    ("id", "code", "discountPct", "maxUses", "usedCount", "isActive", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'ZEBA25', 25, 100, 0, true, now(), now())
ON CONFLICT ("code") DO NOTHING;

-- Confirm both coupons are now present and active
-- ------------------------------------------------------------------------
SELECT "code", "discountPct", "maxUses", "usedCount", "isActive"
FROM "coupons"
WHERE "code" IN ('ZEBA39TZEQ', 'ZEBA25')
ORDER BY "code";
