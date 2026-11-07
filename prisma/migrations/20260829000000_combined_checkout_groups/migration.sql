-- Combined checkout support: multiple packages/addresses can now be paid
-- for in one PhonePe payment, grouped by Order.groupId.

-- 1. Add groupId to orders. Existing rows have no group yet, so backfill
--    each existing order into its own single-order group (its own id),
--    then make the column required.
ALTER TABLE "orders" ADD COLUMN "groupId" TEXT;
UPDATE "orders" SET "groupId" = "id" WHERE "groupId" IS NULL;
ALTER TABLE "orders" ALTER COLUMN "groupId" SET NOT NULL;
CREATE INDEX "orders_groupId_idx" ON "orders"("groupId");

-- 2. merchantOrderId on payments is no longer globally unique — a combined
--    checkout writes one Payment row per Order but shares one
--    merchantOrderId across the group. Drop the old unique constraint and
--    replace it with a plain index (name matches Prisma's default for
--    @unique on this column, drop it defensively in case it differs).
DROP INDEX IF EXISTS "payments_merchantOrderId_key";
CREATE INDEX IF NOT EXISTS "payments_merchantOrderId_idx" ON "payments"("merchantOrderId");
