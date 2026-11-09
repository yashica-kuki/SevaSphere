-- CreateEnum
CREATE TYPE "DocumentReviewStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTION_REQUIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NGOStatus" ADD VALUE 'DRAFT';
ALTER TYPE "NGOStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "NGOStatus" ADD VALUE 'UNDER_REVIEW';
ALTER TYPE "NGOStatus" ADD VALUE 'ACTION_REQUIRED';

-- AlterTable
ALTER TABLE "NGODocument" ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "reviewReason" TEXT,
ADD COLUMN     "reviewStatus" "DocumentReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "reviewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "NGOProfile" ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "NGODocument_ngoId_reviewStatus_idx" ON "NGODocument"("ngoId", "reviewStatus");
