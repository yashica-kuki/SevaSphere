import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/httpError.js";
import { audit } from "./auditService.js";
import { holdFunds, debitHeldFunds, lockWallet, available } from "./walletService.js";
import { spentThisMonth } from "./policyService.js";

export class ExecutionError extends HttpError {
  constructor(code, message, status = 409) {
    super(status, message);
    this.code = code;
  }
}

const donationInclude = {
  allocations: { include: { ngo: { select: { id: true, organizationName: true } }, payout: true } },
};

/**
 * Commit a donation. This is the ONLY place money leaves a donor wallet for NGOs.
 * Everything happens in one DB transaction after re-validating authorization,
 * budget, wallet funds and NGO eligibility. Safe to call twice with the same key.
 */
export const executeAllocation = async ({
  donorId,
  walletId,
  policyId,
  allocations,
  idempotencyKey,
  source = "AGENT",
  executionId = null,
  scheduleId = null,
  message = null,
  explanation = null,
  extraBudgetCapPaise = null,
}) => {
  if (!idempotencyKey) throw new ExecutionError("NO_IDEMPOTENCY_KEY", "An idempotency key is required", 400);
  if (!allocations.length) throw new ExecutionError("NOTHING_TO_ALLOCATE", "There is nothing to allocate", 400);
  const total = allocations.reduce((s, a) => s + a.amountPaise, 0n);
  if (total <= 0n || allocations.some((a) => a.amountPaise <= 0n)) {
    throw new ExecutionError("INVALID_AMOUNT", "Allocation amounts must be positive", 400);
  }
  const donationKey = `${donorId}:${idempotencyKey}`;

  try {
    const donation = await prisma.$transaction(
      async (tx) => {
        // 1. Serialize this donor's money movements.
        const wallet = await lockWallet(tx, walletId);

        // 2. Idempotency: a repeated request returns the original result.
        const existing = await tx.donation.findUnique({ where: { idempotencyKey: donationKey }, include: donationInclude });
        if (existing) return { ...existing, duplicate: true };

        // 3. Authorization must still be active right now.
        const policy = await tx.allocationPolicy.findUnique({ where: { id: policyId } });
        if (!policy || policy.donorId !== donorId || policy.authorizationStatus !== "ACTIVE") {
          throw new ExecutionError("NOT_AUTHORIZED", "Automatic donations are not currently authorized", 403);
        }
        if (policy.maxNGOsPerAllocation < allocations.length) {
          throw new ExecutionError("POLICY_LIMIT", "Too many NGOs for the authorized policy");
        }
        for (const a of allocations) {
          if (policy.maxDonationPerNGOPaise && a.amountPaise > policy.maxDonationPerNGOPaise) {
            throw new ExecutionError("POLICY_LIMIT", "Allocation exceeds the authorized per-NGO maximum");
          }
          if (a.amountPaise < policy.minDonationPaise) {
            throw new ExecutionError("POLICY_LIMIT", "Allocation is below the authorized minimum");
          }
        }

        // 4. Budget (monthly policy limit + optional schedule cap).
        if (policy.monthlyLimitPaise) {
          const spent = await spentThisMonth(tx, donorId);
          if (spent + total > policy.monthlyLimitPaise) {
            throw new ExecutionError("BUDGET_EXCEEDED", "This donation would exceed your monthly budget");
          }
        }
        if (extraBudgetCapPaise !== null && total > extraBudgetCapPaise) {
          throw new ExecutionError("BUDGET_EXCEEDED", "This donation would exceed the schedule budget");
        }

        // 5. NGO eligibility, re-checked against the database inside the transaction.
        const ngos = await tx.nGOProfile.findMany({
          where: { id: { in: allocations.map((a) => a.ngoId) }, status: "VERIFIED", user: { isActive: true } },
          select: { id: true, minimumDonationPaise: true },
        });
        const ngoMap = new Map(ngos.map((n) => [n.id, n]));
        for (const a of allocations) {
          const ngo = ngoMap.get(a.ngoId);
          if (!ngo) throw new ExecutionError("NGO_INELIGIBLE", "A selected NGO is no longer verified and active");
          if (ngo.minimumDonationPaise && a.amountPaise < ngo.minimumDonationPaise) {
            throw new ExecutionError("NGO_INELIGIBLE", "Allocation is below an NGO's minimum donation");
          }
        }

        // 6. Wallet funds.
        if (available(wallet) < total) {
          throw new ExecutionError("INSUFFICIENT_FUNDS", "Insufficient available wallet balance", 402);
        }

        // 7. Create records + move money atomically.
        const created = await tx.donation.create({
          data: {
            donorId,
            scheduleId,
            policyId,
            executionId,
            amountPaise: total,
            status: "PENDING",
            isAnonymous: policy.anonymous,
            idempotencyKey: donationKey,
            source,
            message,
            explanation,
          },
        });
        await holdFunds(tx, {
          walletId,
          amountPaise: total,
          referenceId: created.id,
          idempotencyKey: donationKey,
          description: `Hold for donation ${created.id.slice(0, 8)}`,
        });
        await debitHeldFunds(tx, {
          walletId,
          amountPaise: total,
          referenceId: created.id,
          idempotencyKey: donationKey,
          description: `Donation to ${allocations.length} NGO(s)`,
        });
        for (const a of allocations) {
          const alloc = await tx.donationAllocation.create({
            data: {
              donationId: created.id,
              ngoId: a.ngoId,
              amountPaise: a.amountPaise,
              status: "COMPLETED",
              matchScore: a.matchScore ?? null,
              reason: a.reason ?? null,
              breakdown: a.breakdown ?? undefined,
            },
          });
          await tx.nGOPayout.create({
            data: { ngoId: a.ngoId, allocationId: alloc.id, amountPaise: a.amountPaise, status: "REQUESTED" },
          });
        }
        const done = await tx.donation.update({
          where: { id: created.id },
          data: { status: "COMPLETED" },
          include: donationInclude,
        });
        await audit(
          {
            actorId: null,
            action: "DONATION_EXECUTED",
            entity: "Donation",
            entityId: done.id,
            metadata: { donorId, source, executionId, totalPaise: total.toString(), ngoCount: allocations.length },
          },
          tx
        );
        return { ...done, duplicate: false };
      },
      { timeout: 20000, maxWait: 10000 }
    );
    return donation;
  } catch (error) {
    if (error.code === "P2002") {
      const existing = await prisma.donation.findUnique({ where: { idempotencyKey: donationKey }, include: donationInclude });
      if (existing) return { ...existing, duplicate: true };
    }
    throw error;
  }
};

/** Admin: refund a completed donation back to the donor wallet (blocked once a payout completed). */
export { donationInclude };
