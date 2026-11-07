-- CreateEnum
CREATE TYPE "AffiliateType" AS ENUM ('CUSTOMER', 'ARTIST');

-- AlterTable
-- Existing rows are all artist affiliates (customers never got a real
-- Affiliate row before this change), so defaulting to ARTIST here is
-- correct for every pre-existing record.
ALTER TABLE "affiliates" ADD COLUMN "type" "AffiliateType" NOT NULL DEFAULT 'ARTIST';
