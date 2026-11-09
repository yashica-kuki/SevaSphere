-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DONOR', 'NGO', 'ADMIN');

-- CreateEnum
CREATE TYPE "NGOStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('REGISTRATION_CERTIFICATE', 'TAX_CERTIFICATE', 'PAN_CARD', 'BANK_PROOF', 'OTHER');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('CREDIT', 'DEBIT', 'REFUND', 'PAYOUT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'COMPLETED', 'PARTIALLY_ALLOCATED', 'ALLOCATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('PROPOSED', 'APPROVED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'LINK');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'DONOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonorProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NGOProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationName" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "description" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "status" "NGOStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NGOProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cause" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NGOCause" (
    "id" UUID NOT NULL,
    "ngoId" UUID NOT NULL,
    "causeId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NGOCause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NGODocument" (
    "id" UUID NOT NULL,
    "ngoId" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NGODocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletAccount" (
    "id" UUID NOT NULL,
    "donorId" UUID NOT NULL,
    "balancePaise" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletLedger" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "type" "LedgerType" NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "balanceAfterPaise" BIGINT NOT NULL,
    "referenceId" UUID,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "donationId" UUID,
    "provider" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" UUID NOT NULL,
    "donorId" UUID NOT NULL,
    "scheduleId" UUID,
    "amountPaise" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationAllocation" (
    "id" UUID NOT NULL,
    "donationId" UUID NOT NULL,
    "ngoId" UUID NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "status" "AllocationStatus" NOT NULL DEFAULT 'PROPOSED',
    "matchScore" DOUBLE PRECISION,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonationAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationPolicy" (
    "id" UUID NOT NULL,
    "donorId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyLimitPaise" BIGINT,
    "minDonationPaise" BIGINT NOT NULL DEFAULT 0,
    "maxDonationPaise" BIGINT,
    "allowedCauseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedNGOIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllocationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationSchedule" (
    "id" UUID NOT NULL,
    "donorId" UUID NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "frequency" "ScheduleFrequency" NOT NULL,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonationSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentWorkflow" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentExecution" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "userId" UUID,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactReport" (
    "id" UUID NOT NULL,
    "ngoId" UUID NOT NULL,
    "allocationId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "peopleImpacted" INTEGER,
    "amountUsedPaise" BIGINT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImpactReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactEvidence" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "title" TEXT,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpactEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NGOPayout" (
    "id" UUID NOT NULL,
    "ngoId" UUID NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "reference" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NGOPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DonorProfile_userId_key" ON "DonorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NGOProfile_userId_key" ON "NGOProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NGOProfile_registrationNumber_key" ON "NGOProfile"("registrationNumber");

-- CreateIndex
CREATE INDEX "NGOProfile_status_idx" ON "NGOProfile"("status");

-- CreateIndex
CREATE INDEX "NGOProfile_city_state_idx" ON "NGOProfile"("city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Cause_name_key" ON "Cause"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Cause_slug_key" ON "Cause"("slug");

-- CreateIndex
CREATE INDEX "Cause_isActive_idx" ON "Cause"("isActive");

-- CreateIndex
CREATE INDEX "NGOCause_causeId_idx" ON "NGOCause"("causeId");

-- CreateIndex
CREATE UNIQUE INDEX "NGOCause_ngoId_causeId_key" ON "NGOCause"("ngoId", "causeId");

-- CreateIndex
CREATE INDEX "NGODocument_ngoId_type_idx" ON "NGODocument"("ngoId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "WalletAccount_donorId_key" ON "WalletAccount"("donorId");

-- CreateIndex
CREATE INDEX "WalletLedger_walletId_createdAt_idx" ON "WalletLedger"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletLedger_referenceId_idx" ON "WalletLedger"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_providerOrderId_key" ON "PaymentTransaction"("providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_providerPaymentId_key" ON "PaymentTransaction"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_idempotencyKey_key" ON "PaymentTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentTransaction_userId_createdAt_idx" ON "PaymentTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

-- CreateIndex
CREATE INDEX "Donation_donorId_createdAt_idx" ON "Donation"("donorId", "createdAt");

-- CreateIndex
CREATE INDEX "Donation_status_idx" ON "Donation"("status");

-- CreateIndex
CREATE INDEX "DonationAllocation_ngoId_status_idx" ON "DonationAllocation"("ngoId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DonationAllocation_donationId_ngoId_key" ON "DonationAllocation"("donationId", "ngoId");

-- CreateIndex
CREATE INDEX "AllocationPolicy_donorId_isActive_idx" ON "AllocationPolicy"("donorId", "isActive");

-- CreateIndex
CREATE INDEX "DonationSchedule_nextRunAt_isActive_idx" ON "DonationSchedule"("nextRunAt", "isActive");

-- CreateIndex
CREATE INDEX "AgentExecution_workflowId_status_idx" ON "AgentExecution"("workflowId", "status");

-- CreateIndex
CREATE INDEX "AgentExecution_userId_createdAt_idx" ON "AgentExecution"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ImpactReport_ngoId_reportedAt_idx" ON "ImpactReport"("ngoId", "reportedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NGOPayout_reference_key" ON "NGOPayout"("reference");

-- CreateIndex
CREATE INDEX "NGOPayout_ngoId_status_idx" ON "NGOPayout"("ngoId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "DonorProfile" ADD CONSTRAINT "DonorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NGOProfile" ADD CONSTRAINT "NGOProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NGOCause" ADD CONSTRAINT "NGOCause_ngoId_fkey" FOREIGN KEY ("ngoId") REFERENCES "NGOProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NGOCause" ADD CONSTRAINT "NGOCause_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "Cause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NGODocument" ADD CONSTRAINT "NGODocument_ngoId_fkey" FOREIGN KEY ("ngoId") REFERENCES "NGOProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletAccount" ADD CONSTRAINT "WalletAccount_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "DonorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedger" ADD CONSTRAINT "WalletLedger_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "WalletAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "DonorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "DonationSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationAllocation" ADD CONSTRAINT "DonationAllocation_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationAllocation" ADD CONSTRAINT "DonationAllocation_ngoId_fkey" FOREIGN KEY ("ngoId") REFERENCES "NGOProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationPolicy" ADD CONSTRAINT "AllocationPolicy_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "DonorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationSchedule" ADD CONSTRAINT "DonationSchedule_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "DonorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AgentWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactReport" ADD CONSTRAINT "ImpactReport_ngoId_fkey" FOREIGN KEY ("ngoId") REFERENCES "NGOProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactReport" ADD CONSTRAINT "ImpactReport_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "DonationAllocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactEvidence" ADD CONSTRAINT "ImpactEvidence_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ImpactReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NGOPayout" ADD CONSTRAINT "NGOPayout_ngoId_fkey" FOREIGN KEY ("ngoId") REFERENCES "NGOProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
