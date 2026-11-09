import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { prisma } from "../config/prisma.js";
import { evaluateNgo } from "./matchingCore.js";
import { allocateFunds } from "./allocationEngine.js";
import { interpretIntent, explainMatches, explainExecution } from "./aiService.js";
import { executeAllocation, ExecutionError } from "./donationExecutionService.js";
import { validateDraftPolicy, spentThisMonth } from "./policyService.js";
import { available } from "./walletService.js";
import { formatInr } from "../utils/money.js";

export const WORKFLOW_NAME = "sevakarma-allocation";
export const NODES = [
  "REQUEST_UNDERSTANDING",
  "NGO_MATCHING",
  "ELIGIBILITY_CHECK",
  "DETERMINISTIC_ALLOCATION",
  "AUTHORIZATION_VALIDATION",
  "DONATION_EXECUTION",
  "EXPLANATION",
];

/* Graph state. `error` short-circuits to FAILED; the LLM only ever fills
   `intent`, `reasons` and `explanation` — never money or eligibility. */
const State = Annotation.Root({
  ctx: Annotation(),            // { donor, wallet, policy, executionId, dryRun, idempotencyKey, trigger, scheduleId, requestedPaise, intentText, causeIds, budgetCapPaise }
  causes: Annotation(),
  intent: Annotation(),
  ngos: Annotation(),
  evaluations: Annotation(),
  allocation: Annotation(),
  validation: Annotation(),
  donation: Annotation(),
  reasons: Annotation(),
  explanation: Annotation(),
  error: Annotation(),
  status: Annotation(),
  message: Annotation(),
});

const ser = (v) => JSON.parse(JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x)));

const recordStep = async (executionId, node, fn, { attempt = 1 } = {}) => {
  const startedAt = new Date();
  const step = await prisma.agentStep.create({ data: { executionId, node, status: "RUNNING", attempt, startedAt } });
  await prisma.agentExecution.update({ where: { id: executionId }, data: { currentNode: node } });
  try {
    const { update, output, input } = await fn();
    await prisma.agentStep.update({
      where: { id: step.id },
      data: { status: "COMPLETED", output: ser(output ?? {}), input: input ? ser(input) : undefined, completedAt: new Date(), durationMs: Date.now() - startedAt.getTime() },
    });
    return update;
  } catch (error) {
    await prisma.agentStep.update({
      where: { id: step.id },
      data: { status: "FAILED", error: String(error.message).slice(0, 500), completedAt: new Date(), durationMs: Date.now() - startedAt.getTime() },
    });
    throw error;
  }
};

const TRANSIENT = new Set(["P2034", "40001", "40P01"]);

const makeNode = (name, fn, { retries = 0 } = {}) => async (state) => {
  if (state.error) return {};
  const { executionId } = state.ctx;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      return await recordStep(executionId, name, () => fn(state), { attempt });
    } catch (error) {
      const retryable = TRANSIENT.has(error.code) || /deadlock|serialize|could not serialize/i.test(error.message);
      if (retryable && attempt <= retries) continue;
      return { error: { node: name, code: error.code || "ERROR", message: error.message, statusCode: error.statusCode } };
    }
  }
  return {};
};

// ---------- node implementations ----------

const requestUnderstanding = async (state) => {
  const { ctx } = state;
  const causes = await prisma.cause.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true } });
  const result = await interpretIntent({ intent: ctx.intentText, causes });
  const bySlug = new Map(causes.map((c) => [c.slug, c.id]));
  const policy = ctx.policy;
  const permitted = (id) => policy.allowAnyCause || policy.allowedCauseIds.includes(id);
  const proposed = result.causeSlugs.map((s) => bySlug.get(s)).filter(Boolean);
  const focusCauseIds = proposed.filter((id) => permitted(id) && !policy.excludedCauseIds.includes(id));
  const ignored = proposed.length - focusCauseIds.length;
  return {
    update: { causes, intent: { ...result, focusCauseIds } },
    input: { intentText: ctx.intentText || null },
    output: { source: result.source, notes: result.notes, focusCauseIds, ignoredNotAuthorized: ignored, warning: result.warning },
  };
};

const ngoMatching = async () => {
  const rows = await prisma.nGOProfile.findMany({
    where: { status: "VERIFIED", user: { isActive: true } },
    select: {
      id: true, organizationName: true, status: true, description: true, minimumDonationPaise: true,
      user: { select: { isActive: true } },
      causes: { select: { cause: { select: { id: true, name: true, slug: true } } } },
      impactReports: { select: { status: true, verificationLevel: true, evidence: { select: { id: true }, take: 1 } } },
    },
  });
  const ngos = rows.map((n) => {
    const published = n.impactReports.filter((r) => r.status === "SUBMITTED" || r.status === "REVIEWED");
    return {
      id: n.id,
      name: n.organizationName,
      description: n.description,
      status: n.status,
      userActive: n.user.isActive,
      minimumDonationPaise: n.minimumDonationPaise,
      causes: n.causes.map((c) => c.cause),
      reportStats: {
        submitted: published.length,
        reviewed: published.filter((r) => r.verificationLevel === "ADMIN_REVIEWED").length,
        verified: published.filter((r) => r.verificationLevel === "INDEPENDENTLY_VERIFIED").length,
        withEvidence: published.filter((r) => r.evidence.length > 0).length,
      },
    };
  });
  return { update: { ngos }, output: { candidateCount: ngos.length, source: "DATABASE" } };
};

const eligibilityCheck = async (state) => {
  const { ctx, ngos, intent } = state;
  const policy = ctx.policy;
  const favs = await prisma.donorFavorite.findMany({ where: { donorId: ctx.donor.id }, select: { ngoId: true } });
  const permitted = (id) => (policy.allowAnyCause || policy.allowedCauseIds.includes(id)) && !policy.excludedCauseIds.includes(id);
  let focus = null;
  if (ctx.causeIds?.length) focus = new Set(ctx.causeIds.filter(permitted));          // schedule-level causes, never wider than the policy
  else if (intent.focusCauseIds.length) focus = new Set(intent.focusCauseIds);       // Gemini-interpreted intent, already filtered
  const evalCtx = {
    allowedCauseIds: new Set(policy.allowedCauseIds),
    excludedCauseIds: new Set(policy.excludedCauseIds),
    preferredNgoIds: new Set(policy.allowedNGOIds),
    favoriteNgoIds: new Set(favs.map((f) => f.ngoId)),
    preferredCauseIds: new Set(policy.allowedCauseIds),
    allowAnyCause: policy.allowAnyCause,
    focusCauseIds: focus,
    requestedPaise: ctx.requestedPaise,
    maxPerNgoPaise: policy.maxDonationPerNGOPaise ?? null,
    donorMinPaise: policy.minDonationPaise ?? 0n,
  };
  const evaluations = ngos.map((n) => ({ ...evaluateNgo(n, evalCtx), description: n.description }));
  const { reasons, source, warning } = await explainMatches({ candidates: evaluations, intentNotes: intent.notes });
  const withReasons = evaluations.map((e) => ({ ...e, reason: reasons[e.ngoId] }));
  const eligible = withReasons.filter((e) => e.eligible).length;
  return {
    update: { evaluations: withReasons, reasons },
    output: {
      evaluated: withReasons.length,
      eligible,
      ineligible: withReasons.length - eligible,
      explanationSource: source,
      warning,
      results: withReasons.map((e) => ({ ngoId: e.ngoId, matchScore: e.matchScore, eligibilityStatus: e.eligibilityStatus })),
    },
  };
};

const deterministicAllocation = async (state) => {
  const { ctx, evaluations } = state;
  const policy = ctx.policy;
  const eligible = evaluations.filter((e) => e.eligible);
  if (!eligible.length) {
    return {
      update: { allocation: { allocations: [], totalPaise: 0n, unallocatedPaise: ctx.requestedPaise, message: "No eligible NGO matches your authorized causes and limits. No donation will be made." } },
      output: { allocations: 0 },
    };
  }
  // Wallet funds and budgets are NOT used to shrink the amount silently; they are
  // validated in AUTHORIZATION_VALIDATION so the donor sees a clear failure instead.
  const result = allocateFunds({
    requestedPaise: ctx.requestedPaise,
    maxTotalPaise: null,
    candidates: eligible.map((e) => ({ ngoId: e.ngoId, matchScore: e.matchScore, minimumDonationPaise: e.minimumDonationPaise })),
    maxNgos: policy.maxNGOsPerAllocation,
    maxPerNgoPaise: policy.maxDonationPerNGOPaise ?? null,
    donorMinPaise: policy.minDonationPaise ?? 0n,
  });
  const byId = new Map(evaluations.map((e) => [e.ngoId, e]));
  const allocations = result.allocations.map((a) => {
    const e = byId.get(a.ngoId);
    return { ...a, ngoName: e.ngoName, reason: e.reason, matchedCauses: e.matchedCauses, breakdown: e.components };
  });
  return {
    update: { allocation: { ...result, allocations } },
    input: { requested: formatInr(ctx.requestedPaise) },
    output: { allocations: allocations.map((a) => ({ ngoId: a.ngoId, amountPaise: a.amountPaise })), totalPaise: result.totalPaise, message: result.message },
  };
};

const authorizationValidation = async (state) => {
  const { ctx, allocation } = state;
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });

  const policy = await prisma.allocationPolicy.findUnique({ where: { id: ctx.policy.id ?? "00000000-0000-0000-0000-000000000000" } }).catch(() => null);
  const authorized = policy?.authorizationStatus === "ACTIVE";
  add("DONOR_AUTHORIZATION", authorized || ctx.dryRun, authorized ? "Authorization is active" : ctx.dryRun ? "Not authorized yet (preview only)" : `Authorization is ${policy?.authorizationStatus ?? "missing"}`);

  const problems = validateDraftPolicy({
    allowedCauseIds: ctx.policy.allowedCauseIds, excludedCauseIds: ctx.policy.excludedCauseIds,
    allowAnyCause: ctx.policy.allowAnyCause, monthlyLimitPaise: ctx.policy.monthlyLimitPaise,
    maxDonationPerNGOPaise: ctx.policy.maxDonationPerNGOPaise, maxNGOsPerAllocation: ctx.policy.maxNGOsPerAllocation,
  });
  add("POLICY_VALID", problems.length === 0, problems[0] ?? "Policy limits are consistent");

  const spent = await spentThisMonth(prisma, ctx.donor.id);
  const withinBudget = !ctx.policy.monthlyLimitPaise || spent + allocation.totalPaise <= ctx.policy.monthlyLimitPaise;
  add("BUDGET", withinBudget, `Spent this month ${formatInr(spent)} + ${formatInr(allocation.totalPaise)} vs limit ${ctx.policy.monthlyLimitPaise ? formatInr(ctx.policy.monthlyLimitPaise) : "none"}`);

  if (ctx.budgetCapPaise != null) {
    add("SCHEDULE_BUDGET", allocation.totalPaise <= ctx.budgetCapPaise, `Schedule budget remaining ${formatInr(ctx.budgetCapPaise)}`);
  }
  const funds = available(ctx.wallet) >= allocation.totalPaise;
  add("WALLET_FUNDS", funds, `Available ${formatInr(available(ctx.wallet))}, required ${formatInr(allocation.totalPaise)}`);

  // Fresh read: NGOs may have been suspended since matching.
  const ids = allocation.allocations.map((a) => a.ngoId);
  const stillOk = ids.length
    ? await prisma.nGOProfile.count({ where: { id: { in: ids }, status: "VERIFIED", user: { isActive: true } } })
    : 0;
  add("NGO_ELIGIBILITY", stillOk === ids.length, `${stillOk}/${ids.length} NGOs still verified and active`);

  let duplicate = false;
  if (ctx.idempotencyKey && !ctx.dryRun) {
    duplicate = Boolean(await prisma.donation.findUnique({ where: { idempotencyKey: `${ctx.donor.id}:${ctx.idempotencyKey}` }, select: { id: true } }));
  }
  add("IDEMPOTENCY", true, duplicate ? "Request already executed — original result will be returned" : "New request");

  const hasAllocation = allocation.allocations.length > 0;
  const failed = checks.filter((c) => !c.ok);
  const ok = hasAllocation && failed.length === 0;
  return {
    update: { validation: { ok, checks, duplicate, hasAllocation } },
    output: { ok, checks },
  };
};

const donationExecution = async (state) => {
  const { ctx, allocation } = state;
  const donation = await executeAllocation({
    donorId: ctx.donor.id,
    walletId: ctx.wallet.id,
    policyId: ctx.policy.id,
    allocations: allocation.allocations.map((a) => ({ ngoId: a.ngoId, amountPaise: a.amountPaise, matchScore: a.matchScore, reason: a.reason, breakdown: a.breakdown })),
    idempotencyKey: ctx.idempotencyKey,
    source: ctx.trigger,
    executionId: ctx.executionId,
    scheduleId: ctx.scheduleId ?? null,
    extraBudgetCapPaise: ctx.budgetCapPaise ?? null,
  });
  return {
    update: { donation },
    output: { donationId: donation.id, committed: true, duplicate: Boolean(donation.duplicate), totalPaise: donation.amountPaise },
  };
};

const explanation = async (state) => {
  const { allocation, donation, ctx } = state;
  const failedChecks = (state.validation?.checks || []).filter((c) => !c.ok).map((c) => c.detail);
  const reason = !donation && failedChecks.length ? `No donation was made: ${failedChecks.join("; ")}` : null;
  const facts = {
    executed: Boolean(donation),
    dryRun: ctx.dryRun,
    message: reason || allocation.message,
    totalDisplay: formatInr(donation ? donation.amountPaise : allocation.totalPaise),
    allocations: (donation ? donation.allocations : allocation.allocations).map((a) => ({
      ngoName: a.ngo?.organizationName ?? a.ngoName,
      amountDisplay: formatInr(a.amountPaise),
    })),
  };
  const result = await explainExecution({ facts });
  const update = { explanation: result.text };
  if (!ctx.dryRun && !donation) {
    // A real run that did not move money is a failure, with a precise reason for the donor.
    const firstFailed = (state.validation?.checks || []).find((c) => !c.ok);
    update.error = {
      node: "AUTHORIZATION_VALIDATION",
      code: !allocation.allocations.length ? "NO_ELIGIBLE_NGO" : firstFailed?.name || "VALIDATION_FAILED",
      message: reason || allocation.message,
      statusCode: firstFailed?.name === "WALLET_FUNDS" ? 402 : 409,
    };
  }
  return { update, output: { source: result.source, warning: result.warning } };
};

// ---------- terminal nodes ----------
const completed = async (state) => {
  const { ctx } = state;
  const status = state.donation ? "EXECUTED" : ctx.dryRun ? "PREVIEW" : "NO_DONATION";
  await prisma.$transaction(async (tx) => {
    await tx.agentStep.create({ data: { executionId: ctx.executionId, node: "COMPLETED", status: "COMPLETED", output: { outcome: status }, startedAt: new Date(), completedAt: new Date(), durationMs: 0 } });
    await tx.agentExecution.update({
      where: { id: ctx.executionId },
      data: { status: "COMPLETED", currentNode: "COMPLETED", completedAt: new Date(), output: ser({ outcome: status, allocation: state.allocation, donationId: state.donation?.id ?? null, explanation: state.explanation }) },
    });
  });
  return { status: "COMPLETED" };
};

const failed = async (state) => {
  const { ctx, error } = state;
  await prisma.$transaction(async (tx) => {
    await tx.agentStep.create({ data: { executionId: ctx.executionId, node: "FAILED", status: "FAILED", error: String(error?.message).slice(0, 500), output: { failedNode: error?.node, code: error?.code }, startedAt: new Date(), completedAt: new Date(), durationMs: 0 } });
    await tx.agentExecution.update({
      where: { id: ctx.executionId },
      data: { status: "FAILED", currentNode: "FAILED", completedAt: new Date(), error: String(error?.message).slice(0, 500), output: ser({ failedNode: error?.node, code: error?.code }) },
    });
  });
  return { status: "FAILED" };
};

// Branching: validation failure or missing allocation ends without execution (still explained).
const afterValidation = (state) => {
  if (state.error) return "FAILED";
  if (state.ctx.dryRun) return "EXPLANATION";
  return state.validation.ok ? "DONATION_EXECUTION" : "EXPLANATION";
};
const orFailed = (next) => (state) => (state.error ? "FAILED" : next);

export const buildGraph = () =>
  new StateGraph(State)
    .addNode("REQUEST_UNDERSTANDING", makeNode("REQUEST_UNDERSTANDING", requestUnderstanding))
    .addNode("NGO_MATCHING", makeNode("NGO_MATCHING", ngoMatching, { retries: 1 }))
    .addNode("ELIGIBILITY_CHECK", makeNode("ELIGIBILITY_CHECK", eligibilityCheck))
    .addNode("DETERMINISTIC_ALLOCATION", makeNode("DETERMINISTIC_ALLOCATION", deterministicAllocation))
    .addNode("AUTHORIZATION_VALIDATION", makeNode("AUTHORIZATION_VALIDATION", authorizationValidation))
    .addNode("DONATION_EXECUTION", makeNode("DONATION_EXECUTION", donationExecution, { retries: 2 }))
    .addNode("EXPLANATION", makeNode("EXPLANATION", explanation))
    .addNode("COMPLETED", completed)
    .addNode("FAILED", failed)
    .addEdge(START, "REQUEST_UNDERSTANDING")
    .addConditionalEdges("REQUEST_UNDERSTANDING", orFailed("NGO_MATCHING"), ["NGO_MATCHING", "FAILED"])
    .addConditionalEdges("NGO_MATCHING", orFailed("ELIGIBILITY_CHECK"), ["ELIGIBILITY_CHECK", "FAILED"])
    .addConditionalEdges("ELIGIBILITY_CHECK", orFailed("DETERMINISTIC_ALLOCATION"), ["DETERMINISTIC_ALLOCATION", "FAILED"])
    .addConditionalEdges("DETERMINISTIC_ALLOCATION", orFailed("AUTHORIZATION_VALIDATION"), ["AUTHORIZATION_VALIDATION", "FAILED"])
    .addConditionalEdges("AUTHORIZATION_VALIDATION", afterValidation, ["DONATION_EXECUTION", "EXPLANATION", "FAILED"])
    .addConditionalEdges("DONATION_EXECUTION", orFailed("EXPLANATION"), ["EXPLANATION", "FAILED"])
    .addConditionalEdges("EXPLANATION", orFailed("COMPLETED"), ["COMPLETED", "FAILED"])
    .addEdge("COMPLETED", END)
    .addEdge("FAILED", END)
    .compile();

let graph;
const getGraph = () => (graph ??= buildGraph());

const ensureWorkflow = async () =>
  prisma.agentWorkflow.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: { id: "00000000-0000-4000-8000-000000000001", name: WORKFLOW_NAME, description: "Gemini-assisted, deterministic donation allocation workflow (LangGraph)", version: "1.0" },
  });

const executionPayload = async (executionId) => {
  const e = await prisma.agentExecution.findUnique({ where: { id: executionId }, include: { steps: { orderBy: { createdAt: "asc" } } } });
  return e;
};

/**
 * Runs the workflow. dryRun=true stops before money moves (used for matching previews).
 */
export const runAllocationWorkflow = async ({
  donor, wallet, policy, requestedPaise, intentText = "", causeIds = null, dryRun = false,
  idempotencyKey = null, trigger = "MANUAL", scheduleId = null, budgetCapPaise = null, userId,
}) => {
  const workflow = await ensureWorkflow();
  const execKey = dryRun || !idempotencyKey ? null : `exec:${donor.id}:${idempotencyKey}`;

  // A repeated real request returns the earlier execution instead of running twice.
  // If the first request is still running, wait for it so the caller gets the real outcome.
  const settled = async (prior) => {
    let current = prior;
    for (let i = 0; i < 75 && current.status === "RUNNING"; i += 1) {
      await new Promise((r) => setTimeout(r, 200));
      current = await prisma.agentExecution.findUnique({ where: { id: prior.id } });
    }
    const donation = await prisma.donation.findUnique({
      where: { idempotencyKey: `${donor.id}:${idempotencyKey}` },
      include: { allocations: { include: { ngo: { select: { id: true, organizationName: true } } } } },
    });
    return { executionId: prior.id, duplicate: true, execution: await executionPayload(prior.id), donation };
  };
  if (execKey) {
    const prior = await prisma.agentExecution.findFirst({ where: { idempotencyKey: execKey } });
    if (prior) return settled(prior);
  }

  let execution;
  try {
    execution = await prisma.agentExecution.create({
      data: {
        workflowId: workflow.id, userId, status: "RUNNING", startedAt: new Date(), idempotencyKey: execKey,
        trigger: dryRun ? "PREVIEW" : trigger, scheduleId,
        input: ser({ requestedPaise, intentText: intentText?.slice(0, 500), dryRun, causeIds }),
      },
    });
  } catch (error) {
    if (error.code === "P2002" && execKey) {
      return settled(await prisma.agentExecution.findFirst({ where: { idempotencyKey: execKey } }));
    }
    throw error;
  }

  const ctx = { donor, wallet, policy, executionId: execution.id, dryRun, idempotencyKey, trigger, scheduleId, requestedPaise, intentText, causeIds, budgetCapPaise };
  let finalState;
  try {
    finalState = await getGraph().invoke({ ctx });
  } catch (error) {
    // Unexpected graph-level crash: make sure the execution is not left RUNNING.
    await prisma.agentExecution.update({ where: { id: execution.id }, data: { status: "FAILED", completedAt: new Date(), error: String(error.message).slice(0, 500) } });
    throw error;
  }

  return {
    executionId: execution.id,
    duplicate: false,
    status: finalState.status,
    state: finalState,
    execution: await executionPayload(execution.id),
  };
};

export { ExecutionError };
