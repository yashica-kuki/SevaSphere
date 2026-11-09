import path from "path";
import fs from "fs/promises";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import { rupeesToPaise, toAmount } from "../utils/money.js";
import { HttpError, badRequest, notFound } from "../utils/httpError.js";
import { evidenceDirectory } from "../middleware/evidenceUpload.js";
import { audit } from "../services/auditService.js";

const getNgo = async (userId) => {
  const ngo = await prisma.nGOProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!ngo) throw new HttpError(404, "NGO profile not found");
  return ngo;
};

const reportSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(5000),
  allocationId: z.string().uuid().optional().nullable(),
  beneficiaries: z.array(z.object({
    group: z.string().trim().min(2).max(100),
    count: z.number().int().min(0).max(10_000_000),
    note: z.string().trim().max(300).optional().default(""),
  })).max(20).default([]),
  fundUtilization: z.array(z.object({
    category: z.string().trim().min(2).max(100),
    amount: z.union([z.string(), z.number()]),
    note: z.string().trim().max(300).optional().default(""),
  })).max(20).default([]),
});

export const serializeReport = (r, { includeEvidence = true } = {}) => ({
  id: r.id, title: r.title, description: r.description, status: r.status, allocationId: r.allocationId,
  // NGO-reported until an admin explicitly reviews/verifies it.
  verificationLevel: r.verificationLevel,
  verificationLabel: { NGO_REPORTED: "Reported by NGO (not independently verified)", ADMIN_REVIEWED: "Reviewed by SevaSphere admin", INDEPENDENTLY_VERIFIED: "Independently verified" }[r.verificationLevel],
  peopleImpacted: r.peopleImpacted, amountUsed: r.amountUsedPaise == null ? null : toAmount(r.amountUsedPaise),
  beneficiaries: r.beneficiaries, fundUtilization: (r.fundUtilization || []).map((f) => ({ ...f, amount: toAmount(BigInt(f.amountPaise)) })),
  reportedAt: r.reportedAt, submittedAt: r.submittedAt, reviewedAt: r.reviewedAt, reviewNote: r.reviewNote,
  evidence: includeEvidence ? (r.evidence || []).map(serializeEvidence) : undefined,
});

export const serializeEvidence = (e) => ({ id: e.id, type: e.type, title: e.title, description: e.description, fileName: e.fileName, url: e.storagePath ? null : e.url, isFile: Boolean(e.storagePath), fileSize: e.fileSize, createdAt: e.createdAt });

const normalize = async (body, ngoId) => {
  const b = reportSchema.parse(body);
  const fund = b.fundUtilization.map((f) => ({ category: f.category, amountPaise: rupeesToPaise(f.amount).toString(), note: f.note }));
  const used = fund.reduce((s, f) => s + BigInt(f.amountPaise), 0n);
  const people = b.beneficiaries.reduce((s, x) => s + x.count, 0);
  if (b.allocationId) {
    const ok = await prisma.donationAllocation.findFirst({ where: { id: b.allocationId, ngoId }, select: { id: true } });
    if (!ok) throw badRequest("Selected donation allocation does not belong to your organization");
  }
  return { title: b.title, description: b.description, allocationId: b.allocationId ?? null, beneficiaries: b.beneficiaries, fundUtilization: fund, amountUsedPaise: fund.length ? used : null, peopleImpacted: b.beneficiaries.length ? people : null };
};

const ownReport = async (req, { withEvidence = true } = {}) => {
  const ngo = await getNgo(req.user.id);
  const report = await prisma.impactReport.findFirst({ where: { id: req.params.id, ngoId: ngo.id }, include: withEvidence ? { evidence: { orderBy: { createdAt: "asc" } } } : undefined });
  if (!report) throw notFound("Report not found");
  return { ngo, report };
};

const EDITABLE = ["DRAFT", "CORRECTIONS_REQUESTED"];

export const getReport = asyncHandler(async (req, res) => {
  const { report } = await ownReport(req);
  res.json({ success: true, data: serializeReport(report) });
});

export const listAllocationsForReports = asyncHandler(async (req, res) => {
  const ngo = await getNgo(req.user.id);
  const rows = await prisma.donationAllocation.findMany({ where: { ngoId: ngo.id, status: "COMPLETED" }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, amountPaise: true, createdAt: true } });
  res.json({ success: true, data: rows.map((r) => ({ id: r.id, amount: toAmount(r.amountPaise), createdAt: r.createdAt })) });
});

export const createReport = asyncHandler(async (req, res) => {
  const ngo = await getNgo(req.user.id);
  const data = await normalize(req.body, ngo.id);
  const report = await prisma.impactReport.create({ data: { ...data, ngoId: ngo.id, status: "DRAFT" }, include: { evidence: true } });
  res.status(201).json({ success: true, message: "Draft saved", data: serializeReport(report) });
});

export const updateReport = asyncHandler(async (req, res) => {
  const { ngo, report } = await ownReport(req, { withEvidence: false });
  if (!EDITABLE.includes(report.status)) throw new HttpError(409, "Submitted reports cannot be edited");
  const data = await normalize(req.body, ngo.id);
  const updated = await prisma.impactReport.update({ where: { id: report.id }, data, include: { evidence: true } });
  res.json({ success: true, message: "Draft saved", data: serializeReport(updated) });
});

export const submitReport = asyncHandler(async (req, res) => {
  const { report } = await ownReport(req);
  if (!EDITABLE.includes(report.status)) throw new HttpError(409, "This report was already submitted");
  if (!report.beneficiaries?.length) throw badRequest("Add at least one beneficiary group before submitting");
  if (!report.fundUtilization?.length) throw badRequest("Add fund utilization details before submitting");
  if (!report.evidence.length) throw badRequest("Upload at least one piece of evidence before submitting");
  const updated = await prisma.impactReport.update({
    where: { id: report.id },
    data: { status: "SUBMITTED", submittedAt: new Date(), reportedAt: new Date(), verificationLevel: "NGO_REPORTED", reviewNote: null },
    include: { evidence: true },
  });
  await audit({ actorId: req.user.id, action: "IMPACT_REPORT_SUBMITTED", entity: "ImpactReport", entityId: report.id, req });
  res.json({ success: true, message: "Report submitted for review", data: serializeReport(updated) });
});

export const deleteReport = asyncHandler(async (req, res) => {
  const { report } = await ownReport(req);
  if (report.status !== "DRAFT") throw new HttpError(409, "Only drafts can be deleted");
  await prisma.impactReport.delete({ where: { id: report.id } });
  await Promise.all(report.evidence.filter((e) => e.storagePath).map((e) => fs.rm(path.join(evidenceDirectory, e.storagePath), { force: true })));
  res.json({ success: true, message: "Draft deleted" });
});

const linkSchema = z.object({ title: z.string().trim().min(2).max(120), url: z.string().url().max(500).refine((u) => /^https?:\/\//i.test(u), "Only http(s) links are allowed"), description: z.string().max(300).optional() });

export const addEvidence = asyncHandler(async (req, res) => {
  const { report } = await ownReport(req, { withEvidence: false });
  if (!EDITABLE.includes(report.status)) {
    if (req.file) await fs.rm(req.file.path, { force: true });
    throw new HttpError(409, "Evidence cannot be changed after submission");
  }
  const count = await prisma.impactEvidence.count({ where: { reportId: report.id } });
  if (count >= 10) { if (req.file) await fs.rm(req.file.path, { force: true }); throw badRequest("A report can have at most 10 pieces of evidence"); }

  let data;
  if (req.file) {
    const type = req.file.mimetype === "application/pdf" ? "DOCUMENT" : req.file.mimetype.startsWith("video") ? "VIDEO" : "IMAGE";
    data = { reportId: report.id, type, title: (req.body.title || req.file.originalname).slice(0, 120), url: `/api/ngo/impact-reports/${report.id}/evidence`, description: req.body.description?.slice(0, 300) ?? null, fileName: req.file.originalname.slice(0, 200), storagePath: req.file.filename, mimeType: req.file.mimetype, fileSize: req.file.size };
  } else {
    const l = linkSchema.parse(req.body);
    data = { reportId: report.id, type: "LINK", title: l.title, url: l.url, description: l.description ?? null };
  }
  const ev = await prisma.impactEvidence.create({ data });
  res.status(201).json({ success: true, message: "Evidence added", data: serializeEvidence(ev) });
});

export const removeEvidence = asyncHandler(async (req, res) => {
  const { report } = await ownReport(req, { withEvidence: false });
  if (!EDITABLE.includes(report.status)) throw new HttpError(409, "Evidence cannot be changed after submission");
  const ev = await prisma.impactEvidence.findFirst({ where: { id: req.params.evidenceId, reportId: report.id } });
  if (!ev) throw notFound("Evidence not found");
  await prisma.impactEvidence.delete({ where: { id: ev.id } });
  if (ev.storagePath) await fs.rm(path.join(evidenceDirectory, ev.storagePath), { force: true });
  res.json({ success: true, message: "Evidence removed" });
});

/** Private file download for the owning NGO or an admin. */
export const downloadEvidence = asyncHandler(async (req, res) => {
  const ev = await prisma.impactEvidence.findUnique({ where: { id: req.params.evidenceId }, include: { report: { select: { ngoId: true, ngo: { select: { userId: true } } } } } });
  if (!ev || !ev.storagePath) throw notFound("Evidence not found");
  if (req.user.role !== "ADMIN" && ev.report.ngo.userId !== req.user.id) throw notFound("Evidence not found");
  const file = path.join(evidenceDirectory, path.basename(ev.storagePath));
  res.setHeader("Content-Type", ev.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${(ev.fileName || "evidence").replace(/[^\w.\- ]/g, "_")}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(file);
});

/* ---------------- NGO analytics ---------------- */
export const getAnalytics = asyncHandler(async (req, res) => {
  const ngo = await getNgo(req.user.id);
  const since = new Date(); since.setMonth(since.getMonth() - 11); since.setDate(1); since.setHours(0, 0, 0, 0);
  const rows = await prisma.donationAllocation.findMany({
    where: { ngoId: ngo.id, status: "COMPLETED" },
    select: { amountPaise: true, createdAt: true, donation: { select: { donorId: true } }, ngo: { select: { causes: { select: { cause: { select: { name: true } } } } } } },
  });
  const months = new Map();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() - i);
    months.set(`${d.getFullYear()}-${d.getMonth()}`, { month: d.toLocaleString("en-IN", { month: "short", year: "2-digit" }), paise: 0n, donors: new Set(), newDonors: 0 });
  }
  const firstSeen = new Map();
  for (const r of [...rows].sort((a, b) => a.createdAt - b.createdAt)) {
    const id = r.donation.donorId;
    if (!firstSeen.has(id)) firstSeen.set(id, r.createdAt);
  }
  const causeTotals = new Map();
  for (const r of rows) {
    const m = months.get(`${r.createdAt.getFullYear()}-${r.createdAt.getMonth()}`);
    if (m) {
      m.paise += r.amountPaise; m.donors.add(r.donation.donorId);
      if (firstSeen.get(r.donation.donorId).getTime() === r.createdAt.getTime()) m.newDonors += 1;
    }
    const names = r.ngo.causes.map((c) => c.cause.name);
    const share = names.length ? r.amountPaise / BigInt(names.length) : 0n;
    names.forEach((n) => causeTotals.set(n, (causeTotals.get(n) ?? 0n) + share));
  }
  const byDonor = new Map();
  rows.forEach((r) => byDonor.set(r.donation.donorId, (byDonor.get(r.donation.donorId) ?? 0) + 1));
  res.json({
    success: true,
    data: {
      monthly: [...months.values()].map((m) => ({ month: m.month, amount: Number(m.paise) / 100, donors: m.donors.size, newDonors: m.newDonors })),
      causes: [...causeTotals.entries()].map(([name, p]) => ({ name, amount: Number(p) / 100 })),
      totals: { donors: firstSeen.size, repeatDonors: [...byDonor.values()].filter((c) => c > 1).length, donations: rows.length, amount: toAmount(rows.reduce((s, r) => s + r.amountPaise, 0n)) },
    },
  });
});
