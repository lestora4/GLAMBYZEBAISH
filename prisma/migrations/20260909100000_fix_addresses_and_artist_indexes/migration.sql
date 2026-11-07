-- Fix "addresses" table so it matches the columns the customer-addresses
-- API routes actually read/write (label, addressLine1, addressLine2,
-- country). Existing data is preserved: "addressLine" becomes
-- "addressLine1" and "landmark" becomes "addressLine2".

-- AlterTable
ALTER TABLE "addresses" RENAME COLUMN "addressLine" TO "addressLine1";
ALTER TABLE "addresses" RENAME COLUMN "landmark" TO "addressLine2";

ALTER TABLE "addresses"
  ADD COLUMN "label" TEXT NOT NULL DEFAULT 'Home',
  ADD COLUMN "country" TEXT NOT NULL DEFAULT 'India';

-- CreateIndex
CREATE INDEX "addresses_userId_idx" ON "addresses"("userId");

-- Speed up the new "eligible artists" lookup (admin picks an artist for a
-- booking, filtered/sorted by approval + location).
CREATE INDEX "artists_isApproved_idx" ON "artists"("isApproved");
CREATE INDEX "artists_location_idx" ON "artists"("location");
