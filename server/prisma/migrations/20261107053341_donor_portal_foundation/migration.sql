-- CreateEnum
CREATE TYPE "AllocationAuthorizationStatus" AS ENUM ('NOT_AUTHORIZED', 'ACTIVE', 'PAUSED', 'REVOKED');

-- AlterTable
ALTER TABLE "AllocationPolicy" ADD COLUMN     "authorizationStatus" "AllocationAuthorizationStatus" NOT NULL DEFAULT 'NOT_AUTHORIZED',
ADD COLUMN     "authorizationTextVersion" TEXT,
ADD COLUMN     "authorizedAt" TIMESTAMP(3),
ADD COLUMN     "excludedCauseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "maxDonationPerNGOPaise" BIGINT,
ADD COLUMN     "maxNGOsPerAllocation" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ALTER COLUMN "isActive" SET DEFAULT false;

-- AlterTable
ALTER TABLE "WalletAccount" ADD COLUMN     "reservedBalancePaise" BIGINT NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DonorFavorite" (
    "id" UUID NOT NULL,
    "donorId" UUID NOT NULL,
    "ngoId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonorFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DonorFavorite_donorId_idx" ON "DonorFavorite"("donorId");

-- CreateIndex
CREATE INDEX "DonorFavorite_ngoId_idx" ON "DonorFavorite"("ngoId");

-- CreateIndex
CREATE UNIQUE INDEX "DonorFavorite_donorId_ngoId_key" ON "DonorFavorite"("donorId", "ngoId");

-- CreateIndex
CREATE INDEX "AllocationPolicy_donorId_authorizationStatus_idx" ON "AllocationPolicy"("donorId", "authorizationStatus");

-- AddForeignKey
ALTER TABLE "DonorFavorite" ADD CONSTRAINT "DonorFavorite_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "DonorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorFavorite" ADD CONSTRAINT "DonorFavorite_ngoId_fkey" FOREIGN KEY ("ngoId") REFERENCES "NGOProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
