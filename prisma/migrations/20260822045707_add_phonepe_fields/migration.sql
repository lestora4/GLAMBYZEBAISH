/*
  Warnings:

  - A unique constraint covering the columns `[merchantOrderId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "gateway" TEXT NOT NULL DEFAULT 'PHONEPE',
ADD COLUMN     "merchantOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_merchantOrderId_key" ON "payments"("merchantOrderId");
