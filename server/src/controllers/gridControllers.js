import { prisma } from "../config/prisma.js";
import { createGridHandler } from "../services/gridService.js";
import { getDonorContext } from "../services/walletService.js";
import { HttpError } from "../utils/httpError.js";

const rupees = (p) => (p == null ? null : Number(p) / 100);
const text = (path) => ({ path, type: "text" });
const num = (path, extra = {}) => ({ path, type: "number", ...extra });
const money = (path) => num(path, { scale: 100 });
const date = (path) => ({ path, type: "date" });
const en = (path) => ({ path, type: "enum" });

const ngoIdFor = async (req) => {
  const ngo = await prisma.nGOProfile.findUnique({ where: { userId: req.user.id }, select: { id: true } });
  if (!ngo) throw new HttpError(404, "NGO profile not found");
  return ngo.id;
};

/* ================= DONOR (always scoped to the caller's own donorId) ================= */
export const donorDonationsGrid = createGridHandler({
  model: "donation",
  base: async (req) => ({ donorId: (await getDonorContext(req.user.id)).id }),
  columns: { createdAt: date("createdAt"), amount: money("amountPaise"), status: en("status"), source: text("source"), id: text("id") },
  searchFields: ["allocations.some.ngo.organizationName"],
  include: { allocations: { include: { ngo: { select: { id: true, organizationName: true, causes: { select: { cause: { select: { name: true } } } } } } } } },
  mapRow: (d) => ({
    id: d.id, createdAt: d.createdAt, amount: rupees(d.amountPaise), status: d.status, source: d.source,
    recipients: d.allocations.map((a) => a.ngo.organizationName).join(", "),
    causes: [...new Set(d.allocations.flatMap((a) => a.ngo.causes.map((c) => c.cause.name)))].join(", "),
    explanation: d.explanation || d.allocations.map((a) => `${a.ngo.organizationName}: ${a.reason ?? ""}`).join(" | "),
    isAnonymous: d.isAnonymous,
  }),
  csvHeaders: [
    { field: "id", headerName: "Donation ID" }, { field: "createdAt", headerName: "Date" }, { field: "amount", headerName: "Amount (INR)" },
    { field: "status", headerName: "Status" }, { field: "recipients", headerName: "Recipients" }, { field: "causes", headerName: "Causes" },
  ],
  filename: "my-donations",
});

export const donorWalletGrid = createGridHandler({
  model: "walletLedger",
  base: async (req) => ({ walletId: (await getDonorContext(req.user.id)).walletAccount.id }),
  columns: { createdAt: date("createdAt"), type: en("type"), amount: money("amountPaise"), balanceAfter: money("balanceAfterPaise"), description: text("description") },
  searchFields: ["description"],
  mapRow: (e) => ({ id: e.id, createdAt: e.createdAt, type: e.type, amount: rupees(e.amountPaise), balanceAfter: rupees(e.balanceAfterPaise), description: e.description }),
  csvHeaders: [{ field: "createdAt", headerName: "Date" }, { field: "type", headerName: "Type" }, { field: "amount", headerName: "Amount (INR)" }, { field: "balanceAfter", headerName: "Balance after (INR)" }, { field: "description", headerName: "Description" }],
  filename: "wallet-transactions",
});

export const donorAllocationsGrid = createGridHandler({
  model: "donationAllocation",
  base: async (req) => ({ donation: { donorId: (await getDonorContext(req.user.id)).id } }),
  columns: { createdAt: date("createdAt"), amount: money("amountPaise"), status: en("status"), matchScore: num("matchScore"), ngoName: text("ngo.organizationName") },
  searchFields: ["ngo.organizationName", "reason"],
  include: { ngo: { select: { organizationName: true } } },
  mapRow: (a) => ({ id: a.id, createdAt: a.createdAt, ngoName: a.ngo.organizationName, amount: rupees(a.amountPaise), status: a.status, matchScore: a.matchScore, reason: a.reason, donationId: a.donationId }),
  csvHeaders: [{ field: "createdAt", headerName: "Date" }, { field: "ngoName", headerName: "NGO" }, { field: "amount", headerName: "Amount (INR)" }, { field: "matchScore", headerName: "Match score" }, { field: "reason", headerName: "Reason" }],
  filename: "allocation-history",
});

/* ================= NGO (scoped to caller's NGO; anonymous donors never revealed) ================= */
export const ngoDonationsGrid = createGridHandler({
  model: "donationAllocation",
  base: async (req) => ({ ngoId: await ngoIdFor(req), status: { in: ["APPROVED", "COMPLETED"] } }),
  columns: { createdAt: date("createdAt"), amount: money("amountPaise"), status: en("status"), id: text("id") },
  searchFields: [],
  include: {
    donation: { select: { id: true, isAnonymous: true, donor: { select: { anonymous: true, user: { select: { name: true } } } } } },
    payout: { select: { status: true } },
    ngo: { select: { causes: { select: { cause: { select: { name: true } } } } } },
  },
  mapRow: (a) => {
    const anon = a.donation.isAnonymous || a.donation.donor.anonymous;
    return {
      id: a.id, donationId: a.donation.id, createdAt: a.createdAt, amount: rupees(a.amountPaise), status: a.status,
      donor: anon ? "Anonymous" : a.donation.donor.user.name,
      cause: a.ngo.causes.map((c) => c.cause.name).join(", "),
      payoutStatus: a.payout?.status ?? "NONE",
    };
  },
  csvHeaders: [{ field: "donationId", headerName: "Donation ID" }, { field: "createdAt", headerName: "Date" }, { field: "donor", headerName: "Donor" }, { field: "amount", headerName: "Amount (INR)" }, { field: "cause", headerName: "Cause" }, { field: "status", headerName: "Status" }, { field: "payoutStatus", headerName: "Payout" }],
  filename: "donations-received",
});

export const ngoPayoutsGrid = createGridHandler({
  model: "nGOPayout",
  base: async (req) => ({ ngoId: await ngoIdFor(req) }),
  columns: { createdAt: date("createdAt"), amount: money("amountPaise"), status: en("status"), reference: text("reference"), processedAt: date("processedAt") },
  searchFields: ["reference"],
  mapRow: (p) => ({ id: p.id, createdAt: p.createdAt, amount: rupees(p.amountPaise), currency: p.currency, status: p.status, reference: p.reference, processedAt: p.processedAt }),
  csvHeaders: [{ field: "createdAt", headerName: "Requested" }, { field: "amount", headerName: "Amount (INR)" }, { field: "status", headerName: "Status" }, { field: "reference", headerName: "Reference" }, { field: "processedAt", headerName: "Processed" }],
  filename: "payouts",
});

export const ngoReportsGrid = createGridHandler({
  model: "impactReport",
  base: async (req) => ({ ngoId: await ngoIdFor(req) }),
  columns: { reportedAt: date("reportedAt"), title: text("title"), status: en("status"), verificationLevel: en("verificationLevel"), peopleImpacted: num("peopleImpacted", { bigint: true }) },
  defaultSort: { field: "reportedAt", dir: "desc" },
  searchFields: ["title", "description"],
  mapRow: (r) => ({ id: r.id, reportedAt: r.reportedAt, title: r.title, status: r.status, verificationLevel: r.verificationLevel, peopleImpacted: r.peopleImpacted, amountUsed: rupees(r.amountUsedPaise), reviewNote: r.reviewNote }),
  csvHeaders: [{ field: "reportedAt", headerName: "Date" }, { field: "title", headerName: "Title" }, { field: "status", headerName: "Status" }, { field: "verificationLevel", headerName: "Verification" }, { field: "peopleImpacted", headerName: "People impacted" }],
  filename: "impact-reports",
});

/* ================= ADMIN (router-level ADMIN guard) ================= */
export const adminUsersGrid = createGridHandler({
  model: "user",
  base: async () => ({}),
  columns: { name: text("name"), email: text("email"), role: en("role"), isActive: { path: "isActive", type: "bool" }, createdAt: date("createdAt") },
  searchFields: ["name", "email"],
  select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  mapRow: (u) => u,
  csvHeaders: [{ field: "name", headerName: "Name" }, { field: "email", headerName: "Email" }, { field: "role", headerName: "Role" }, { field: "isActive", headerName: "Active" }, { field: "createdAt", headerName: "Joined" }],
  filename: "users",
});

export const adminVerificationGrid = createGridHandler({
  model: "nGOProfile",
  base: async (req) => (req.query.scope === "all" ? {} : { status: { in: ["SUBMITTED", "UNDER_REVIEW", "ACTION_REQUIRED"] } }),
  columns: { organizationName: text("organizationName"), status: en("status"), city: text("city"), submittedAt: date("submittedAt"), email: text("user.email"), createdAt: date("createdAt") },
  defaultSort: { field: "submittedAt", dir: "asc" },
  searchFields: ["organizationName", "user.email", "city"],
  select: { id: true, organizationName: true, status: true, city: true, state: true, submittedAt: true, createdAt: true, user: { select: { email: true } }, documents: { select: { id: true, reviewStatus: true } } },
  mapRow: (n) => ({ id: n.id, organizationName: n.organizationName, email: n.user.email, status: n.status, city: n.city, state: n.state, submittedAt: n.submittedAt, documents: n.documents.length, documentsApproved: n.documents.filter((d) => d.reviewStatus === "APPROVED").length }),
  csvHeaders: [{ field: "organizationName", headerName: "NGO" }, { field: "email", headerName: "Email" }, { field: "status", headerName: "Status" }, { field: "submittedAt", headerName: "Submitted" }],
  filename: "verification-queue",
});

export const adminDonationsGrid = createGridHandler({
  model: "donation",
  base: async () => ({}),
  columns: { createdAt: date("createdAt"), amount: money("amountPaise"), status: en("status"), source: text("source"), donor: text("donor.user.name") },
  searchFields: ["donor.user.name", "donor.user.email"],
  include: { donor: { select: { user: { select: { name: true, email: true } } } }, allocations: { include: { ngo: { select: { organizationName: true } } } } },
  mapRow: (d) => ({
    id: d.id, createdAt: d.createdAt, donor: d.donor.user.name, donorEmail: d.donor.user.email, amount: rupees(d.amountPaise), status: d.status, source: d.source,
    recipients: d.allocations.map((a) => `${a.ngo.organizationName} (₹${rupees(a.amountPaise)})`).join(", "), executionId: d.executionId,
  }),
  csvHeaders: [{ field: "id", headerName: "Donation ID" }, { field: "createdAt", headerName: "Date" }, { field: "donor", headerName: "Donor" }, { field: "amount", headerName: "Amount (INR)" }, { field: "status", headerName: "Status" }, { field: "recipients", headerName: "Recipients" }],
  filename: "donations",
});

export const adminPaymentsGrid = createGridHandler({
  model: "paymentTransaction",
  base: async () => ({}),
  columns: { createdAt: date("createdAt"), status: en("status"), provider: text("provider"), currency: text("currency"), user: text("user.email") },
  searchFields: ["providerOrderId", "providerPaymentId", "user.email"],
  include: { user: { select: { email: true } } },
  mapRow: (t) => ({ id: t.id, createdAt: t.createdAt, user: t.user.email, provider: t.provider, orderId: t.providerOrderId, captureId: t.providerPaymentId, amount: Number(t.amount), currency: t.currency, status: t.status, outcome: t.metadata?.outcome ?? null }),
  csvHeaders: [{ field: "createdAt", headerName: "Date" }, { field: "user", headerName: "User" }, { field: "provider", headerName: "Provider" }, { field: "orderId", headerName: "Order" }, { field: "amount", headerName: "Amount" }, { field: "currency", headerName: "Currency" }, { field: "status", headerName: "Status" }],
  filename: "payments",
});

export const adminAuditGrid = createGridHandler({
  model: "auditLog",
  base: async () => ({}),
  columns: { createdAt: date("createdAt"), action: text("action"), entity: text("entity"), actor: text("actor.email") },
  searchFields: ["action", "entity", "entityId", "actor.email"],
  include: { actor: { select: { email: true, role: true } } },
  mapRow: (l) => ({ id: l.id, createdAt: l.createdAt, action: l.action, entity: l.entity, entityId: l.entityId, actor: l.actor?.email ?? "system", actorRole: l.actor?.role ?? null, ipAddress: l.ipAddress, metadata: l.metadata ? JSON.stringify(l.metadata).slice(0, 300) : "" }),
  csvHeaders: [{ field: "createdAt", headerName: "Time" }, { field: "actor", headerName: "Actor" }, { field: "action", headerName: "Action" }, { field: "entity", headerName: "Entity" }, { field: "entityId", headerName: "Entity ID" }],
  filename: "audit-logs",
});

export const adminExecutionsGrid = createGridHandler({
  model: "agentExecution",
  base: async () => ({}),
  columns: { createdAt: date("createdAt"), status: en("status"), trigger: text("trigger"), currentNode: text("currentNode"), user: text("user.email") },
  searchFields: ["user.email", "error"],
  include: { user: { select: { email: true } }, _count: { select: { steps: true } } },
  mapRow: (e) => ({ id: e.id, createdAt: e.createdAt, user: e.user?.email ?? "system", status: e.status, trigger: e.trigger, currentNode: e.currentNode, steps: e._count.steps, error: e.error, completedAt: e.completedAt, outcome: e.output?.outcome ?? null }),
  csvHeaders: [{ field: "createdAt", headerName: "Started" }, { field: "user", headerName: "User" }, { field: "trigger", headerName: "Trigger" }, { field: "status", headerName: "Status" }, { field: "currentNode", headerName: "Last node" }, { field: "error", headerName: "Error" }],
  filename: "agent-executions",
});

export const adminReportsGrid = createGridHandler({
  model: "impactReport",
  base: async (req) => (req.query.scope === "all" ? { status: { not: "DRAFT" } } : { status: "SUBMITTED" }),
  columns: { reportedAt: date("reportedAt"), title: text("title"), status: en("status"), verificationLevel: en("verificationLevel"), ngo: text("ngo.organizationName") },
  defaultSort: { field: "reportedAt", dir: "asc" },
  searchFields: ["title", "ngo.organizationName"],
  include: { ngo: { select: { organizationName: true } }, evidence: { select: { id: true } } },
  mapRow: (r) => ({ id: r.id, reportedAt: r.reportedAt, submittedAt: r.submittedAt, ngo: r.ngo.organizationName, title: r.title, status: r.status, verificationLevel: r.verificationLevel, evidenceCount: r.evidence.length, peopleImpacted: r.peopleImpacted }),
  csvHeaders: [{ field: "ngo", headerName: "NGO" }, { field: "title", headerName: "Title" }, { field: "status", headerName: "Status" }, { field: "verificationLevel", headerName: "Verification" }],
  filename: "impact-reports",
});

export const adminEnquiriesGrid = createGridHandler({
  model: "contactMessage",
  base: async () => ({}),
  columns: { createdAt: date("createdAt"), status: en("status"), name: text("name"), email: text("email"), subject: text("subject") },
  searchFields: ["name", "email", "subject", "message"],
  mapRow: (m) => ({ id: m.id, createdAt: m.createdAt, name: m.name, email: m.email, role: m.role, subject: m.subject, message: m.message, status: m.status, adminNote: m.adminNote }),
  csvHeaders: [{ field: "createdAt", headerName: "Date" }, { field: "name", headerName: "Name" }, { field: "email", headerName: "Email" }, { field: "subject", headerName: "Subject" }, { field: "status", headerName: "Status" }],
  filename: "enquiries",
});

export const adminPayoutsGrid = createGridHandler({
  model: "nGOPayout",
  base: async () => ({}),
  columns: { createdAt: date("createdAt"), amount: money("amountPaise"), status: en("status"), ngo: text("ngo.organizationName") },
  searchFields: ["ngo.organizationName", "reference"],
  include: { ngo: { select: { organizationName: true } } },
  mapRow: (p) => ({ id: p.id, createdAt: p.createdAt, ngo: p.ngo.organizationName, amount: rupees(p.amountPaise), status: p.status, reference: p.reference, processedAt: p.processedAt }),
  csvHeaders: [{ field: "createdAt", headerName: "Requested" }, { field: "ngo", headerName: "NGO" }, { field: "amount", headerName: "Amount (INR)" }, { field: "status", headerName: "Status" }],
  filename: "payouts",
});
