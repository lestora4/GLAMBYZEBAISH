-- Adds what the new customer-facing "write a review" flow needs on top of
-- the existing reviews table:
--   - title             optional headline, shown bold above the comment
--   - imagePublicIds    Cloudinary public_ids paired with `images`, so a
--                        photo can be deleted from Cloudinary later without
--                        having to reverse-engineer the id from the URL
--   - packageId          denormalized from orders.packageId so the
--                        service-detail page can fetch "reviews for this
--                        service" with one indexed query instead of joining
--                        through orders on every page render

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN "title" TEXT;
ALTER TABLE "reviews" ADD COLUMN "imagePublicIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "reviews" ADD COLUMN "packageId" TEXT;

-- Backfill packageId for any reviews that already exist, from their order
UPDATE "reviews" r
SET "packageId" = o."packageId"
FROM "orders" o
WHERE r."orderId" = o."id";

-- Now that existing rows are backfilled, enforce NOT NULL + FK + index
ALTER TABLE "reviews" ALTER COLUMN "packageId" SET NOT NULL;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "reviews_packageId_idx" ON "reviews"("packageId");
