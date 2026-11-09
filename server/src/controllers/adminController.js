import { z } from "zod";
import { prisma } from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import { toAmount, rupeesToPaise } from "../utils/money.js";
import { HttpError, badRequest, notFound } from "../utils/httpError.js";
import { audit } from "../services/auditService.js";
import { refundToWallet, reverseTopUp, adjustWallet } from "../services/walletService.js";
import { serializeReport, serializeEvidence } from "./ngoImpactController.js";

export const getDashboard = asyncHandler(async (req, res) => {
  const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1); since.setHours(0, 0, 0, 0);
  const [roles, ngoStatuses, donationAgg, donationRows, payments, executions, openEnquiries, pendingReports, pendingPayouts] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.nGOProfile.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.donation.aggregate({ where: { status: "COMPLETED" }, _sum: { amountPaise: true }, _count: { _all: true } }),
    prisma.donation.findMany({ where: { status: "COMPLETED", createdAt: { gte: since } }, select: { amountPaise: true, createdAt: true } }),
    prisma.paymentTransaction.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.agentExecution.groupBy({ by: ["status"], where: { trigger: { not: "PREVIEW" } }, _count: { _all: true } }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
    prisma.impactReport.count({ where: { status: "SUBMITTED" } }),
    prisma.nGOPayout.count({ where: { status: { in: ["REQUESTED", "PROCESSING"] } } }),
  ]);
  const months = new Map();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() - i);
    months.set(`${d.getFullYear()}-${d.getMonth()}`, { month: d.toLocaleString("en-IN", { month: "short" }), paise: 0n, count: 0 });
  }
  for (const r of donationRows) { const m = months.get(`${r.createdAt.getFullYear()}-${r.createdAt.getMonth()}`); if (m) { m.paise += r.amountPaise; m.count += 1; } }
  const c = (rows, key, v) => rows.find((r) => r[key] === v)?._count._all ?? 0;
  const totalNgos = ngoStatuses.reduce((s, r) => s + r._count._all, 0);
  res.json({
    success: true,
    data: {
      users: { total: roles.reduce((s, r) => s + r._count._all, 0), donors: c(roles, "role", "DONOR"), ngos: c(roles, "role", "NGO"), admins: c(roles, "role", "ADMIN") },
      ngos: { total: totalNgos, verified: c(ngoStatuses, "status", "VERIFIED"), pending: ["SUBMITTED", "UNDER_REVIEW", "ACTION_REQUIRED"].reduce((s, k) => s + c(ngoStatuses, "status", k), 0) },
      donations: { count: donationAgg._count._all, total: toAmount(donationAgg._sum.amountPaise ?? 0n) },
      donationTrend: [...months.values()].map((m) => ({ month: m.month, amount: Number(m.paise) / 100, count: m.count })),
      payments: payments.map((p) => ({ status: p.status, count: p._count._all })),
      executions: executions.map((e) => ({ status: e.status, count: e._count._all })),
      queues: { openEnquiries, pendingReports, pendingPayouts },
    },
  });
});

/* ---------- users ---------- */
const statusSchema = z.object({ isActive: z.boolean(), reason: z.string().trim().min(3).max(300) });
export const setUserStatus = asyncHandler(async (req, res) => {
  const { isActive, reason } = statusSchema.parse(req.body);
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) throw notFound("User not found");
  if (target.id === req.user.id) throw badRequest("You cannot change your own account status");
  if (target.role === "ADMIN") throw new HttpError(403, "Admin accounts cannot be suspended here");
  const user = await prisma.user.update({ where: { id: target.id }, data: { isActive } });
  if (!isActive) {
    // A suspended donor's schedules stop; a suspended NGO stops being eligible automatically.
    await prisma.donationSchedule.updateMany({ where: { donor: { userId: target.id }, status: "ACTIVE" }, data: { status: "PAUSED", isActive: false, lastError: "Paused: account suspended" } });
  }
  await audit({ actorId: req.user.id, action: isActive ? "USER_REACTIVATED" : "USER_SUSPENDED", entity: "User", entityId: user.id, metadata: { reason }, req });
  res.json({ success: true, message: isActive ? "Account reactivated" : "Account suspended", data: { id: user.id, isActive: user.isActive } });
});

/* ---------- donations ---------- */
export const getDonationDetail = asyncHandler(async (req, res) => {
  const d = await prisma.donation.findUnique({
    where: { id: req.params.id },
    include: { donor: { select: { user: { select: { name: true, email: true } }, walletAccount: { select: { id: true } } } }, allocations: { include: { ngo: { select: { organizationName: true } }, payout: true } } },
  });
  if (!d) throw notFound("Donation not found");
  const ledger = await prisma.walletLedger.findMany({ where: { referenceId: d.id }, orderBy: { createdAt: "asc" } });
  const execution = d.executionId ? await prisma.agentExecution.findUnique({ where: { id: d.executionId }, select: { id: true, status: true, trigger: true, error: true } }) : null;
  res.json({
    success: true,
    data: {
      id: d.id, status: d.status, source: d.source, createdAt: d.createdAt, amount: toAmount(d.amountPaise), donor: d.donor.user, explanation: d.explanation, execution,
      allocations: d.allocations.map((a) => ({ id: a.id, ngo: a.ngo.organizationName, amount: toAmount(a.amountPaise), status: a.status, matchScore: a.matchScore, reason: a.reason, payoutStatus: a.payout?.status ?? null })),
      ledger: ledger.map((l) => ({ id: l.id, type: l.type, amount: toAmount(l.amountPaise), createdAt: l.createdAt, description: l.description })),
    },
  });
});

const reasonSchema = z.object({ reason: z.string().trim().min(3).max(300) });
export const refundDonation = asyncHandler(async (req, res) => {
  const { reason } = reasonSchema.parse(req.body);
  const result = await prisma.$transaction(async (tx) => {
    const d = await tx.donation.findUnique({ where: { id: req.params.id }, include: { allocations: { include: { payout: true } }, donor: { include: { walletAccount: true } } } });
    if (!d) throw notFound("Donation not found");
    if (d.status !== "COMPLETED") throw new HttpError(409, `A ${d.status.toLowerCase()} donation cannot be refunded`);
    if (d.allocations.some((a) => a.payout && a.payout.status !== "REQUESTED")) throw new HttpError(409, "Payout already processed; refund is not possible");
    await tx.donation.update({ where: { id: d.id }, data: { status: "REFUNDED" } });
    await tx.donationAllocation.updateMany({ where: { donationId: d.id }, data: { status: "REJECTED" } });
    await tx.nGOPayout.updateMany({ where: { allocationId: { in: d.allocations.map((a) => a.id) } }, data: { status: "FAILED" } });
    const { entry } = await refundToWallet(tx, { walletId: d.donor.walletAccount.id, amountPaise: d.amountPaise, referenceId: d.id, idempotencyKey: `refund:${d.id}`, description: `Refund: ${reason}` });
    await audit({ actorId: req.user.id, action: "DONATION_REFUNDED", entity: "Donation", entityId: d.id, metadata: { reason, amountPaise: d.amountPaise.toString() }, req }, tx);
    return entry;
  });
  res.json({ success: true, message: "Donation refunded to donor wallet", data: { ledgerEntryId: result.id } });
});

export const reverseTopUpEntry = asyncHandler(async (req, res) => {
  const { reason } = reasonSchema.parse(req.body);
  const { entry } = await reverseTopUp({ ledgerEntryId: req.params.entryId, reason });
  await audit({ actorId: req.user.id, action: "WALLET_TOPUP_REVERSED", entity: "WalletLedger", entityId: entry.id, metadata: { reason }, req });
  res.json({ success: true, message: "Top-up reversed" });
});

const adjustSchema = z.object({ walletId: z.string().uuid(), amount: z.string().regex(/^-?\d{1,9}(\.\d{1,2})?$/), reason: z.string().trim().min(3).max(300), idempotencyKey: z.string().min(8).max(100) });
export const adjustWalletBalance = asyncHandler(async (req, res) => {
  const b = adjustSchema.parse(req.body);
  const negative = b.amount.startsWith("-");
  const paise = rupeesToPaise(negative ? b.amount.slice(1) : b.amount);
  const { entry, duplicate } = await adjustWallet({ walletId: b.walletId, amountPaise: negative ? -paise : paise, reason: b.reason, idempotencyKey: b.idempotencyKey });
  if (!duplicate) await audit({ actorId: req.user.id, action: "WALLET_ADJUSTED", entity: "WalletLedger", entityId: entry.id, metadata: { reason: b.reason, amount: b.amount }, req });
  res.json({ success: true, duplicate: Boolean(duplicate), message: "Adjustment recorded" });
});

/* ---------- agent monitoring ---------- */
export const getExecutionDetail = asyncHandler(async (req, res) => {
  const e = await prisma.agentExecution.findUnique({ where: { id: req.params.id }, include: { steps: { orderBy: { createdAt: "asc" } }, user: { select: { email: true } } } });
  if (!e) throw notFound("Execution not found");
  res.json({
    success: true,
    data: {
      id: e.id, status: e.status, trigger: e.trigger, user: e.user?.email, error: e.error, startedAt: e.startedAt, completedAt: e.completedAt, input: e.input, output: e.output,
      steps: e.steps.map((s) => ({ id: s.id, node: s.node, status: s.status, attempt: s.attempt, error: s.error, durationMs: s.durationMs, startedAt: s.startedAt, input: s.input, output: s.output })),
    },
  });
});

/* ---------- impact review ---------- */
export const getReportForReview = asyncHandler(async (req, res) => {
  const r = await prisma.impactReport.findUnique({ where: { id: req.params.id }, include: { evidence: true, ngo: { select: { organizationName: true } } } });
  if (!r) throw notFound("Report not found");
  res.json({ success: true, data: { ...serializeReport(r), ngo: r.ngo.organizationName, evidence: r.evidence.map(serializeEvidence) } });
});

const reviewSchema = z.object({ decision: z.enum(["REVIEWED", "VERIFIED", "CORRECTIONS"]), note: z.string().trim().max(1000).optional().default("") });
export const reviewReport = asyncHandler(async (req, res) => {
  const { decision, note } = reviewSchema.parse(req.body);
  const r = await prisma.impactReport.findUnique({ where: { id: req.params.id } });
  if (!r) throw notFound("Report not found");
  if (r.status === "DRAFT") throw new HttpError(409, "Draft reports cannot be reviewed");
  if ((decision === "CORRECTIONS" || decision === "VERIFIED") && note.length < 3) throw badRequest("A note is required for this decision");
  const data = decision === "CORRECTIONS"
    ? { status: "CORRECTIONS_REQUESTED", verificationLevel: "NGO_REPORTED" }
    : { status: "REVIEWED", verificationLevel: decision === "VERIFIED" ? "INDEPENDENTLY_VERIFIED" : "ADMIN_REVIEWED" };
  const updated = await prisma.impactReport.update({ where: { id: r.id }, data: { ...data, reviewNote: note || null, reviewedAt: new Date(), reviewedById: req.user.id } });
  await audit({ actorId: req.user.id, action: `IMPACT_REPORT_${decision}`, entity: "ImpactReport", entityId: r.id, metadata: { note }, req });
  res.json({ success: true, message: "Review saved", data: { id: updated.id, status: updated.status, verificationLevel: updated.verificationLevel } });
});

/* ---------- enquiries & payouts ---------- */
const enquirySchema = z.object({ status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED"]), adminNote: z.string().trim().max(1000).optional() });
export const updateEnquiry = asyncHandler(async (req, res) => {
  const b = enquirySchema.parse(req.body);
  const m = await prisma.contactMessage.findUnique({ where: { id: req.params.id } });
  if (!m) throw notFound("Enquiry not found");
  const updated = await prisma.contactMessage.update({ where: { id: m.id }, data: { status: b.status, ...(b.adminNote !== undefined ? { adminNote: b.adminNote } : {}) } });
  await audit({ actorId: req.user.id, action: "ENQUIRY_UPDATED", entity: "ContactMessage", entityId: m.id, metadata: { status: b.status }, req });
  res.json({ success: true, message: "Enquiry updated", data: { id: updated.id, status: updated.status } });
});

const payoutSchema = z.object({ status: z.enum(["PROCESSING", "COMPLETED", "FAILED"]), reference: z.string().trim().max(100).optional() });
const PAYOUT_FLOW = { REQUESTED: ["PROCESSING", "COMPLETED", "FAILED"], PROCESSING: ["COMPLETED", "FAILED"] };
export const updatePayout = asyncHandler(async (req, res) => {
  const b = payoutSchema.parse(req.body);
  const p = await prisma.nGOPayout.findUnique({ where: { id: req.params.id } });
  if (!p) throw notFound("Payout not found");
  if (!PAYOUT_FLOW[p.status]?.includes(b.status)) throw new HttpError(409, `Cannot move a ${p.status.toLowerCase()} payout to ${b.status.toLowerCase()}`);
  if (b.status === "COMPLETED" && !(b.reference || p.reference)) throw badRequest("A payout reference is required to complete a payout");
  const updated = await prisma.nGOPayout.update({ where: { id: p.id }, data: { status: b.status, reference: b.reference ?? p.reference, processedAt: b.status === "COMPLETED" ? new Date() : p.processedAt } });
  await audit({ actorId: req.user.id, action: `PAYOUT_${b.status}`, entity: "NGOPayout", entityId: p.id, metadata: { reference: b.reference }, req });
  res.json({ success: true, message: "Payout updated", data: { id: updated.id, status: updated.status } });
});
