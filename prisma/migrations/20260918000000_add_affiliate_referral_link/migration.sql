-- AlterTable
ALTER TABLE "users" ADD COLUMN "referredByAffiliateId" TEXT;

-- CreateIndex
CREATE INDEX "users_referredByAffiliateId_idx" ON "users"("referredByAffiliateId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referredByAffiliateId_fkey" FOREIGN KEY ("referredByAffiliateId") REFERENCES "affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
