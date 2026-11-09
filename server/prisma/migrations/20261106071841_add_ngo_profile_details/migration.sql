-- AlterTable
ALTER TABLE "NGOProfile" ADD COLUMN     "galleryUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "minimumDonationPaise" BIGINT,
ADD COLUMN     "mission" TEXT,
ADD COLUMN     "vision" TEXT;
