-- CreateEnum
CREATE TYPE "InitiativeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Initiative" (
    "id" UUID NOT NULL,
    "ngoId" UUID NOT NULL,
    "causeId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetAmountPaise" BIGINT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "InitiativeStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Initiative_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Initiative_ngoId_idx" ON "Initiative"("ngoId");

-- CreateIndex
CREATE INDEX "Initiative_causeId_idx" ON "Initiative"("causeId");

-- CreateIndex
CREATE INDEX "Initiative_status_idx" ON "Initiative"("status");

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_ngoId_fkey" FOREIGN KEY ("ngoId") REFERENCES "NGOProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "Cause"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
