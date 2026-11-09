import { z } from "zod";
import { prisma } from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import { rupeesToPaise, toAmount } from "../utils/money.js";
import { HttpError, notFound } from "../utils/httpError.js";
import { getDonorContext } from "../services/walletService.js";
import { draftPolicyFromDonor, getCurrentPolicy } from "../services/policyService.js";
import { runAllocationWorkflow } from "../services/agentGraph.js";
import { isGeminiConfigured } from "../services/aiService.js";

const bodySchema = z.object({
  amount: z.union([z.string(), z.number()]),
  intent: z.string().max(500).optional().default(""),
  idempotencyKey: z.string().min(8).max(100).optional(),
});

const shapeAllocation = (a) => ({
  ngoId: a.ngoId, ngoName: a.ngoName, amount: toAmount(a.amountPaise), matchScore: a.matchScore,
  matchedCauses: a.matchedCauses, reason: a.reason, breakdown: a.breakdown,
});

const shapeResult = (r) => {
  const s = r.state;
  const exec = r.execution;
  return {
    executionId: r.executionId,
    duplicate: Boolean(r.duplicate),
    status: exec?.status,
    outcome: exec?.output?.outcome ?? null,
    error: exec?.error ?? null,
    intent: s?.intent && { notes: s.intent.notes, source: s.intent.source, focusCauseIds: s.intent.focusCauseIds },
    geminiConfigured: isGeminiConfigured(),
    matches: (s?.evaluations ?? []).map((e) => ({
      ngoId: e.ngoId, ngoName: e.ngoName, matchScore: e.matchScore, matchedCauses: e.matchedCauses,
      reason: e.reason, eligibilityStatus: e.eligibilityStatus, components: e.components,
    })).sort((a, b) => b.matchScore - a.matchScore),
    allocation: s?.allocation && {
      total: toAmount(s.allocation.totalPaise), unallocated: toAmount(s.allocation.unallocatedPaise),
      message: s.allocation.message, items: s.allocation.allocations.map(shapeAllocation),
    },
    checks: s?.validation?.checks ?? exec?.steps?.find((x) => x.node === "AUTHORIZATION_VALIDATION")?.output?.checks ?? [],
    explanation: s?.explanation ?? exec?.output?.explanation ?? null,
    donationId: s?.donation?.id ?? r.donation?.id ?? exec?.output?.donationId ?? null,
    steps: (exec?.steps ?? []).map(shapeStep),
  };
};

const shapeStep = (st) => ({
  id: st.id, node: st.node, status: st.status, attempt: st.attempt, error: st.error,
  startedAt: st.startedAt, completedAt: st.completedAt, durationMs: st.durationMs, output: st.output,
});

const prepare = async (req, dryRun) => {
  const body = bodySchema.parse(req.body);
  const requestedPaise = rupeesToPaise(body.amount);
  if (requestedPaise < 100n) throw new HttpError(400, "Minimum amount is ₹1");
  const donor = await getDonorContext(req.user.id);
  const current = await getCurrentPolicy(donor.id);
  let policy;
  if (dryRun) {
    // Preview is computed from the donor's current preferences, so they can review before authorizing.
    policy = { ...draftPolicyFromDonor(donor), id: current?.id };
  } else {
    if (!current || current.authorizationStatus !== "ACTIVE") {
      throw new HttpError(403, "Automatic donations are not authorized. Review and authorize your policy first.");
    }
    policy = current; // the authorized snapshot, not the editable preferences
  }
  return { body, requestedPaise, donor, wallet: donor.walletAccount, policy };
};

export const previewAllocation = asyncHandler(async (req, res) => {
  const p = await prepare(req, true);
  const result = await runAllocationWorkflow({ donor: p.donor, wallet: p.wallet, policy: p.policy, requestedPaise: p.requestedPaise, intentText: p.body.intent, dryRun: true, userId: req.user.id });
  res.json({ success: true, data: shapeResult(result) });
});

export const executeAllocationRequest = asyncHandler(async (req, res) => {
  const headerKey = req.get("Idempotency-Key");
  req.body.idempotencyKey = req.body.idempotencyKey || headerKey;
  const p = await prepare(req, false);
  if (!p.body.idempotencyKey) throw new HttpError(400, "An Idempotency-Key is required");
  const result = await runAllocationWorkflow({
    donor: p.donor, wallet: p.wallet, policy: p.policy, requestedPaise: p.requestedPaise, intentText: p.body.intent,
    dryRun: false, idempotencyKey: p.body.idempotencyKey, trigger: "MANUAL", userId: req.user.id,
  });
  const data = shapeResult(result);
  const failed = data.status === "FAILED";
  res.status(failed ? (result.state?.error?.statusCode || 409) : 200).json({
    success: !failed,
    message: failed ? data.error : data.duplicate ? "This request was already processed" : "Donation completed",
    data,
  });
});

export const listExecutions = asyncHandler(async (req, res) => {
  const rows = await prisma.agentExecution.findMany({
    where: { userId: req.user.id, trigger: { not: "PREVIEW" } },
    orderBy: { createdAt: "desc" }, take: 20,
  });
  res.json({
    success: true,
    data: rows.map((e) => ({ id: e.id, status: e.status, trigger: e.trigger, currentNode: e.currentNode, error: e.error, startedAt: e.startedAt, completedAt: e.completedAt, outcome: e.output?.outcome ?? null })),
  });
});

export const getExecution = asyncHandler(async (req, res) => {
  const e = await prisma.agentExecution.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { steps: { orderBy: { createdAt: "asc" } } },
  });
  if (!e) throw notFound("Execution not found");
  const alloc = e.output?.allocation;
  res.json({
    success: true,
    data: {
      id: e.id, status: e.status, trigger: e.trigger, error: e.error, startedAt: e.startedAt, completedAt: e.completedAt,
      explanation: e.output?.explanation ?? null, outcome: e.output?.outcome ?? null, donationId: e.output?.donationId ?? null,
      allocations: (alloc?.allocations ?? []).map((a) => ({ ngoId: a.ngoId, ngoName: a.ngoName, amount: toAmount(a.amountPaise), reason: a.reason, matchScore: a.matchScore })),
      steps: e.steps.map(shapeStep),
    },
  });
});
