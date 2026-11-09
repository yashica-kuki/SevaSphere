-- Phases 5-12: donor preferences, INR wallet ledger, schedules, agent steps,
-- impact reports, payouts and enquiries.

-- AlterEnum
ALTER TYPE "LedgerType" ADD VALUE 'TOPUP';
ALTER TYPE "LedgerType" ADD VALUE 'DONATION_HOLD';
ALTER TYPE "LedgerType" ADD VALUE 'DONATION_DEBIT';
ALTER TYPE "LedgerType" ADD VALUE 'REVERSAL';
ALTER TYPE "LedgerType" ADD VALUE 'ADJUSTMENT';

ALTER TYPE "DonationStatus" ADD VALUE 'FAILED';
ALTER TYPE "DonationStatus" ADD VALUE 'REFUNDED';

ALTER TYPE "ScheduleFrequency" ADD VALUE 'CUSTOM';

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('ONE_TIME', 'RECURRING');
CREATE TYPE "ScheduleStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED', 'FAILED');
CREATE TYPE "ImpactReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CORRECTIONS_REQUESTED', 'REVIEWED');
CREATE TYPE "ReportVerification" AS ENUM ('NGO_REPORTED', 'ADMIN_REVIEWED', 'INDEPENDENTLY_VERIFIED');

-- AlterTable DonorProfile
ALTER TABLE "DonorProfile"
  ADD COLUMN "preferredCauseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "excludedCauseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "preferredNgoIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "monthlyBudgetPaise" BIGINT,
  ADD COLUMN "maxDonationPerNgoPaise" BIGINT,
  ADD COLUMN "maxNgosPerAllocation" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "minDonationPaise" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "donateAnyCause" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "referralCode" TEXT,
  ADD COLUMN "referredByCode" TEXT;

-- AlterTable WalletLedger
ALTER TABLE "WalletLedger"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "reservedAfterPaise" BIGINT NOT NULL DEFAULT 0;

-- AlterTable Donation
ALTER TABLE "Donation"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "policyId" UUID,
  ADD COLUMN "executionId" UUID,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "explanation" TEXT;

-- AlterTable DonationAllocation
ALTER TABLE "DonationAllocation" ADD COLUMN "breakdown" JSONB;

-- AlterTable AllocationPolicy
ALTER TABLE "AllocationPolicy"
  ADD COLUMN "pausedAt" TIMESTAMP(3),
  ADD COLUMN "authorizationText" TEXT,
  ADD COLUMN "allowAnyCause" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "anonymous" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable DonationSchedule
ALTER TABLE "DonationSchedule"
  ADD COLUMN "name" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "type" "ScheduleType" NOT NULL DEFAULT 'RECURRING',
  ADD COLUMN "status" "ScheduleStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "intervalDays" INTEGER,
  ADD COLUMN "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "endDate" TIMESTAMP(3),
  ADD COLUMN "budgetLimitPaise" BIGINT,
  ADD COLUMN "spentPaise" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "causeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "lastRunAt" TIMESTAMP(3),
  ADD COLUMN "lastRunStatus" TEXT,
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "runCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable AgentExecution
ALTER TABLE "AgentExecution"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "trigger" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "currentNode" TEXT,
  ADD COLUMN "scheduleId" UUID;

-- AlterTable ImpactReport
ALTER TABLE "ImpactReport"
  ADD COLUMN "status" "ImpactReportStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "verificationLevel" "ReportVerification" NOT NULL DEFAULT 'NGO_REPORTED',
  ADD COLUMN "beneficiaries" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "fundUtilization" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewNote" TEXT,
  ADD COLUMN "reviewedById" UUID;

-- Reports that already existed (seeded) were published by the NGO.
UPDATE "ImpactReport" SET "status" = 'SUBMITTED', "submittedAt" = "reportedAt";

-- AlterTable ImpactEvidence
ALTER TABLE "ImpactEvidence"
  ADD COLUMN "fileName" TEXT,
  ADD COLUMN "storagePath" TEXT,
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "fileSize" INTEGER;

-- AlterTable NGOPayout
ALTER TABLE "NGOPayout" ADD COLUMN "allocationId" UUID;

-- AlterTable ContactMessage
ALTER TABLE "ContactMessage"
  ADD COLUMN "userId" UUID,
  ADD COLUMN "role" VARCHAR(20),
  ADD COLUMN "adminNote" TEXT;

-- CreateTable ScheduleRun
CREATE TABLE "ScheduleRun" (
    "id" UUID NOT NULL,
    "scheduleId" UUID NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "donationId" UUID,
    "executionId" UUID,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable AgentStep
CREATE TABLE "AgentStep" (
    "id" UUID NOT NULL,
    "executionId" UUID NOT NULL,
    "node" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DonorProfile_referralCode_key" ON "DonorProfile"("referralCode");
CREATE INDEX "DonorProfile_referredByCode_idx" ON "DonorProfile"("referredByCode");
CREATE UNIQUE INDEX "WalletLedger_idempotencyKey_key" ON "WalletLedger"("idempotencyKey");
CREATE UNIQUE INDEX "Donation_idempotencyKey_key" ON "Donation"("idempotencyKey");
CREATE INDEX "DonationSchedule_donorId_status_idx" ON "DonationSchedule"("donorId", "status");
CREATE UNIQUE INDEX "AgentExecution_idempotencyKey_key" ON "AgentExecution"("idempotencyKey");
CREATE INDEX "ImpactReport_status_idx" ON "ImpactReport"("status");
CREATE UNIQUE INDEX "NGOPayout_allocationId_key" ON "NGOPayout"("allocationId");
CREATE UNIQUE INDEX "ScheduleRun_idempotencyKey_key" ON "ScheduleRun"("idempotencyKey");
CREATE INDEX "ScheduleRun_scheduleId_scheduledFor_idx" ON "ScheduleRun"("scheduleId", "scheduledFor");
CREATE INDEX "AgentStep_executionId_createdAt_idx" ON "AgentStep"("executionId", "createdAt");

-- AddForeignKey
ALTER TABLE "NGOPayout" ADD CONSTRAINT "NGOPayout_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "DonationAllocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduleRun" ADD CONSTRAINT "ScheduleRun_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "DonationSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentStep" ADD CONSTRAINT "AgentStep_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AgentExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PayPal checkout cancellations are tracked explicitly.
ALTER TYPE "TransactionStatus" ADD VALUE 'CANCELLED';
