-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "idProofPublicId" TEXT,
ADD COLUMN     "idProofStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "idProofUrl" TEXT,
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejectionReason" TEXT;
