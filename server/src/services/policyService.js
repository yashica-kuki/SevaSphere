import { prisma } from "../config/prisma.js";
import { HttpError, badRequest } from "../utils/httpError.js";
import { formatInr, startOfMonth, toAmount } from "../utils/money.js";

export const AUTH_TEXT_VERSION = "SEVAKARMA-AUTH-v1";

/** Preferences stored on the donor profile → a draft policy object. */
export const draftPolicyFromDonor = (donor) => ({
  name: "Default allocation policy",
  allowedCauseIds: donor.preferredCauseIds ?? [],
  excludedCauseIds: donor.excludedCauseIds ?? [],
  allowedNGOIds: donor.preferredNgoIds ?? [],
  allowAnyCause: donor.donateAnyCause ?? false,
  monthlyLimitPaise: donor.monthlyBudgetPaise ?? null,
  maxDonationPerNGOPaise: donor.maxDonationPerNgoPaise ?? null,
  maxNGOsPerAllocation: donor.maxNgosPerAllocation ?? 3,
  minDonationPaise: donor.minDonationPaise ?? 0n,
  anonymous: donor.anonymous ?? false,
});

export const validateDraftPolicy = (d) => {
  const problems = [];
  if (!d.monthlyLimitPaise || d.monthlyLimitPaise <= 0n) problems.push("Set a monthly budget.");
  if (!d.allowAnyCause && d.allowedCauseIds.length === 0) problems.push("Choose at least one preferred cause, or allow donating to any cause.");
  if (d.maxDonationPerNGOPaise && d.monthlyLimitPaise && d.maxDonationPerNGOPaise > d.monthlyLimitPaise) {
    problems.push("Maximum donation per NGO cannot exceed the monthly budget.");
  }
  if (d.maxNGOsPerAllocation < 1 || d.maxNGOsPerAllocation > 10) problems.push("Maximum NGOs per allocation must be between 1 and 10.");
  const overlap = d.allowedCauseIds.filter((id) => d.excludedCauseIds.includes(id));
  if (overlap.length) problems.push("A cause cannot be both preferred and excluded.");
  return problems;
};

const names = async (model, ids) =>
  ids.length ? (await prisma[model].findMany({ where: { id: { in: ids } }, select: { id: true, ...(model === "cause" ? { name: true } : { organizationName: true }) } })) : [];

/** The exact text the donor sees and agrees to. Generated server-side from the policy values. */
export const buildAuthorizationText = async (d) => {
  const [allowed, excluded, ngos] = await Promise.all([
    names("cause", d.allowedCauseIds),
    names("cause", d.excludedCauseIds),
    names("nGOProfile", d.allowedNGOIds),
  ]);
  const lines = [
    "I authorize the SevaSphere allocation agent to donate from my simulated INR wallet on my behalf, under these limits:",
    d.allowAnyCause
      ? "• Causes: any cause, except those I excluded below."
      : `• Causes: only ${allowed.map((c) => c.name).join(", ") || "(none selected)"}.`,
    `• Excluded causes (never donated to): ${excluded.map((c) => c.name).join(", ") || "none"}.`,
    `• Preferred NGOs: ${ngos.map((n) => n.organizationName).join(", ") || "none (the agent may choose any verified NGO that fits)"}.`,
    `• Monthly budget: ${formatInr(d.monthlyLimitPaise ?? 0n)}.`,
    `• Maximum per NGO: ${d.maxDonationPerNGOPaise ? formatInr(d.maxDonationPerNGOPaise) : "no separate limit"}.`,
    `• Maximum NGOs per allocation: ${d.maxNGOsPerAllocation}.`,
    `• Minimum donation per NGO: ${formatInr(d.minDonationPaise ?? 0n)}.`,
    `• My donations are shown to NGOs as: ${d.anonymous ? "Anonymous" : "my name"}.`,
    "The agent may only donate to verified, active NGOs. Amounts are calculated by deterministic backend rules; AI only explains choices and cannot move money.",
    "I can pause, edit or revoke this authorization at any time. Revoking stops all automatic and scheduled donations immediately.",
  ];
  return { version: AUTH_TEXT_VERSION, text: lines.join("\n") };
};

export const serializePolicy = (p) =>
  p && {
    id: p.id,
    name: p.name,
    status: p.authorizationStatus,
    isActive: p.isActive,
    authorizedAt: p.authorizedAt,
    pausedAt: p.pausedAt,
    revokedAt: p.revokedAt,
    authorizationTextVersion: p.authorizationTextVersion,
    authorizationText: p.authorizationText,
    allowedCauseIds: p.allowedCauseIds,
    excludedCauseIds: p.excludedCauseIds,
    allowedNGOIds: p.allowedNGOIds,
    allowAnyCause: p.allowAnyCause,
    anonymous: p.anonymous,
    monthlyLimit: toAmount(p.monthlyLimitPaise),
    maxPerNgo: p.maxDonationPerNGOPaise == null ? null : toAmount(p.maxDonationPerNGOPaise),
    maxNgos: p.maxNGOsPerAllocation,
    minDonation: toAmount(p.minDonationPaise),
  };

export const getCurrentPolicy = (donorId) =>
  prisma.allocationPolicy.findFirst({ where: { donorId }, orderBy: { createdAt: "desc" } });

export const spentThisMonth = async (db, donorId, now = new Date()) => {
  const agg = await db.donation.aggregate({
    where: { donorId, status: { in: ["COMPLETED", "ALLOCATED", "PARTIALLY_ALLOCATED"] }, createdAt: { gte: startOfMonth(now) } },
    _sum: { amountPaise: true },
  });
  return agg._sum.amountPaise ?? 0n;
};

export const authorizePolicy = async (donor, { confirmVersion, confirmText }) => {
  const draft = draftPolicyFromDonor(donor);
  const problems = validateDraftPolicy(draft);
  if (problems.length) throw badRequest(problems[0], problems);

  const auth = await buildAuthorizationText(draft);
  if (confirmVersion !== auth.version || confirmText !== auth.text) {
    throw new HttpError(409, "The authorization text has changed. Please review it again before confirming.");
  }
  const data = {
    name: draft.name,
    allowedCauseIds: draft.allowedCauseIds,
    excludedCauseIds: draft.excludedCauseIds,
    allowedNGOIds: draft.allowedNGOIds,
    allowAnyCause: draft.allowAnyCause,
    anonymous: draft.anonymous,
    monthlyLimitPaise: draft.monthlyLimitPaise,
    maxDonationPerNGOPaise: draft.maxDonationPerNGOPaise,
    maxNGOsPerAllocation: draft.maxNGOsPerAllocation,
    minDonationPaise: draft.minDonationPaise,
    authorizationStatus: "ACTIVE",
    isActive: true,
    authorizationTextVersion: auth.version,
    authorizationText: auth.text,
    authorizedAt: new Date(),
    pausedAt: null,
    revokedAt: null,
  };
  const existing = await getCurrentPolicy(donor.id);
  return existing
    ? prisma.allocationPolicy.update({ where: { id: existing.id }, data })
    : prisma.allocationPolicy.create({ data: { ...data, donorId: donor.id } });
};

export const setPolicyState = async (donorId, action) => {
  const policy = await getCurrentPolicy(donorId);
  if (!policy || policy.authorizationStatus === "NOT_AUTHORIZED") throw badRequest("No authorization exists yet");
  const transitions = {
    pause: { from: ["ACTIVE"], data: { authorizationStatus: "PAUSED", isActive: false, pausedAt: new Date() } },
    resume: { from: ["PAUSED"], data: { authorizationStatus: "ACTIVE", isActive: true, pausedAt: null } },
    revoke: { from: ["ACTIVE", "PAUSED"], data: { authorizationStatus: "REVOKED", isActive: false, revokedAt: new Date() } },
  };
  const t = transitions[action];
  if (!t) throw badRequest("Unknown action");
  if (!t.from.includes(policy.authorizationStatus)) {
    throw new HttpError(409, `Cannot ${action} an authorization that is ${policy.authorizationStatus.toLowerCase()}`);
  }
  return prisma.allocationPolicy.update({ where: { id: policy.id }, data: t.data });
};
