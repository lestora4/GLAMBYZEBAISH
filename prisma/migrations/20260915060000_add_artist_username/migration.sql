-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "artists_username_key" ON "artists"("username");

-- CreateIndex
CREATE INDEX "artists_username_idx" ON "artists"("username");
