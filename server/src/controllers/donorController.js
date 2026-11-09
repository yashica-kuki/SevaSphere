import { z } from "zod";
import { prisma } from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import { toAmount, optionalRupeesToPaise, rupeesToPaise } from "../utils/money.js";
import { HttpError, badRequest, notFound } from "../utils/httpError.js";
import { getDonorContext, serializeWallet, serializeLedger, topUp, available } from "../services/walletService.js";
import { draftPolicyFromDonor, validateDraftPolicy, buildAuthorizationText, getCurrentPolicy, serializePolicy, authorizePolicy, setPolicyState, spentThisMonth } from "../services/policyService.js";
import { audit } from "../services/auditService.js";

/* ---------------- dashboard ---------------- */
export const getDonorDashboard = asyncHandler(async (req, res) => {
  const donor = await getDonorContext(req.user.id);
  const wallet = donor.walletAccount;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [totals, donationCount, activeSchedules, recentDonations, recentLedger, trendRows, causeRows, ngoCount, policy, spent] = await Promise.all([
    prisma.donationAllocation.aggregate({ where: { status: "COMPLETED", donation: { donorId: donor.id, status: "COMPLETED" } }, _sum: { amountPaise: true } }),
    prisma.donation.count({ where: { donorId: donor.id, status: "COMPLETED" } }),
    prisma.donationSchedule.count({ where: { donorId: donor.id, status: "ACTIVE" } }),
    prisma.donation.findMany({
      where: { donorId: donor.id }, orderBy: { createdAt: "desc" }, take: 5,
      include: { allocations: { include: { ngo: { select: { id: true, organizationName: true } } } } },
    }),
    prisma.walletLedger.findMany({ where: { walletId: wallet.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.donationAllocation.findMany({
      where: { status: "COMPLETED", donation: { donorId: donor.id, status: "COMPLETED", createdAt: { gte: sixMonthsAgo } } },
      select: { amountPaise: true, donation: { select: { createdAt: true } } },
    }),
    prisma.donationAllocation.findMany({
      where: { status: "COMPLETED", donation: { donorId: donor.id, status: "COMPLETED" } },
      select: { amountPaise: true, ngo: { select: { causes: { select: { cause: { select: { name: true } } } } } } },
    }),
    prisma.donationAllocation.groupBy({ by: ["ngoId"], where: { status: "COMPLETED", donation: { donorId: donor.id, status: "COMPLETED" } } }),
    getCurrentPolicy(donor.id),
    spentThisMonth(prisma, donor.id),
  ]);

  const months = new Map();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() - i);
    months.set(`${d.getFullYear()}-${d.getMonth()}`, { month: d.toLocaleString("en-IN", { month: "short" }), paise: 0n });
  }
  for (const r of trendRows) {
    const d = r.donation.createdAt;
    const m = months.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (m) m.paise += r.amountPaise;
  }

  const causeTotals = new Map();
  for (const r of causeRows) {
    const names = r.ngo.causes.map((c) => c.cause.name);
    const share = names.length ? r.amountPaise / BigInt(names.length) : 0n;
    for (const n of names) causeTotals.set(n, (causeTotals.get(n) ?? 0n) + share);
  }

  const recentActivity = [
    ...recentDonations.map((d) => ({ id: d.id, type: "DONATION", description: `Donation ${d.status.toLowerCase()}`, amountPaise: d.amountPaise, createdAt: d.createdAt })),
    ...recentLedger.map((e) => ({ id: e.id, type: e.type, description: e.description, amountPaise: e.amountPaise, createdAt: e.createdAt })),
  ].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);

  res.json({
    success: true,
    data: {
      donor: { name: req.user.name },
      wallet: serializeWallet(wallet),
      statistics: {
        totalDonated: toAmount(totals._sum.amountPaise ?? 0n),
        donationCount,
        activeSchedules,
        ngosSupported: ngoCount.length,
        monthlyBudget: policy?.monthlyLimitPaise ? toAmount(policy.monthlyLimitPaise) : null,
        spentThisMonth: toAmount(spent),
      },
      authorization: policy ? { status: policy.authorizationStatus } : { status: "NOT_AUTHORIZED" },
      recentDonations: recentDonations.map((d) => ({
        id: d.id, amount: toAmount(d.amountPaise), status: d.status, createdAt: d.createdAt,
        recipients: d.allocations.map((a) => ({ ngoId: a.ngo.id, organizationName: a.ngo.organizationName, amount: toAmount(a.amountPaise), status: a.status, reason: a.reason })),
      })),
      recentActivity: recentActivity.map((a) => ({ ...a, amountPaise: undefined, amount: toAmount(a.amountPaise) })),
      donationTrend: [...months.values()].map((m) => ({ month: m.month, amount: toAmount(m.paise) })),
      causeBreakdown: [...causeTotals.entries()].map(([name, p]) => ({ name, amount: toAmount(p) })),
    },
  });
});

/* ---------------- profile & preferences ---------------- */
const serializeProfile = (user, donor) => ({
  name: user.name,
  email: user.email,
  phone: donor.phone,
  address: donor.address,
  city: donor.city,
  state: donor.state,
  country: donor.country,
  anonymous: donor.anonymous,
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(20).optional().nullable(),
  address: z.string().trim().max(250).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  anonymous: z.boolean(),
});

export const getProfile = asyncHandler(async (req, res) => {
  const donor = await getDonorContext(req.user.id);
  res.json({ success: true, data: serializeProfile(req.user, donor) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const body = profileSchema.parse(req.body);
  const donor = await getDonorContext(req.user.id);
  await prisma.$transaction([
    prisma.user.update({ where: { id: req.user.id }, data: { name: body.name } }),
    prisma.donorProfile.update({
      where: { id: donor.id },
      data: { phone: body.phone || null, address: body.address || null, city: body.city || null, state: body.state || null, anonymous: body.anonymous },
    }),
  ]);
  const fresh = await getDonorContext(req.user.id);
  res.json({ success: true, message: "Profile saved", data: serializeProfile({ ...req.user, name: body.name }, fresh) });
});

const prefsSchema = z.object({
  preferredCauseIds: z.array(z.string().uuid()).max(20),
  excludedCauseIds: z.array(z.string().uuid()).max(20),
  preferredNgoIds: z.array(z.string().uuid()).max(20),
  monthlyBudget: z.union([z.string(), z.number()]).nullable().optional(),
  maxDonationPerNgo: z.union([z.string(), z.number()]).nullable().optional(),
  maxNgosPerAllocation: z.number().int().min(1).max(10),
  minDonation: z.union([z.string(), z.number()]).nullable().optional(),
  donateAnyCause: z.boolean(),
  anonymous: z.boolean(),
});

const serializePrefs = (d) => ({
  preferredCauseIds: d.preferredCauseIds,
  excludedCauseIds: d.excludedCauseIds,
  preferredNgoIds: d.preferredNgoIds,
  monthlyBudget: d.monthlyBudgetPaise == null ? null : toAmount(d.monthlyBudgetPaise),
  maxDonationPerNgo: d.maxDonationPerNgoPaise == null ? null : toAmount(d.maxDonationPerNgoPaise),
  maxNgosPerAllocation: d.maxNgosPerAllocation,
  minDonation: toAmount(d.minDonationPaise),
  donateAnyCause: d.donateAnyCause,
  anonymous: d.anonymous,
});

export const getPreferences = asyncHandler(async (req, res) => {
  const donor = await getDonorContext(req.user.id);
  res.json({ success: true, data: serializePrefs(donor) });
});

export const updatePreferences = asyncHandler(async (req, res) => {
  const body = prefsSchema.parse(req.body);
  const donor = await getDonorContext(req.user.id);
  const monthly = optionalRupeesToPaise(body.monthlyBudget);
  const perNgo = optionalRupeesToPaise(body.maxDonationPerNgo);
  const min = optionalRupeesToPaise(body.minDonation) ?? 0n;
  if (body.preferredCauseIds.some((id) => body.excludedCauseIds.includes(id))) throw badRequest("A cause cannot be both preferred and excluded");
  if (monthly !== null && perNgo !== null && perNgo > monthly) throw badRequest("Maximum per NGO cannot exceed the monthly budget");
  if (perNgo !== null && min > perNgo) throw badRequest("Minimum donation cannot exceed the maximum per NGO");

  // Only reference real, active causes / verified NGOs.
  const [causeCount, ngoCount] = await Promise.all([
    prisma.cause.count({ where: { id: { in: [...body.preferredCauseIds, ...body.excludedCauseIds] }, isActive: true } }),
    prisma.nGOProfile.count({ where: { id: { in: body.preferredNgoIds }, status: "VERIFIED" } }),
  ]);
  if (causeCount !== new Set([...body.preferredCauseIds, ...body.excludedCauseIds]).size) throw badRequest("Unknown cause selected");
  if (ngoCount !== new Set(body.preferredNgoIds).size) throw badRequest("Preferred NGOs must be verified NGOs");

  const updated = await prisma.donorProfile.update({
    where: { id: donor.id },
    data: {
      preferredCauseIds: body.preferredCauseIds, excludedCauseIds: body.excludedCauseIds, preferredNgoIds: body.preferredNgoIds,
      monthlyBudgetPaise: monthly, maxDonationPerNgoPaise: perNgo, maxNgosPerAllocation: body.maxNgosPerAllocation,
      minDonationPaise: min, donateAnyCause: body.donateAnyCause, anonymous: body.anonymous,
    },
  });
  res.json({ success: true, message: "Preferences saved", data: serializePrefs(updated) });
});

/* ---------------- NGO discovery ---------------- */
const ngoCard = (n, favIds) => ({
  id: n.id,
  name: n.organizationName,
  description: n.description,
  mission: n.mission,
  city: n.city,
  state: n.state,
  logoUrl: n.logoUrl,
  status: n.status,
  minimumDonation: n.minimumDonationPaise == null ? null : toAmount(n.minimumDonationPaise),
  causes: n.causes.map((c) => ({ id: c.cause.id, name: c.cause.name, slug: c.cause.slug })),
  isFavorite: favIds.has(n.id),
  reports: {
    published: n.impactReports.length,
    adminReviewed: n.impactReports.filter((r) => r.verificationLevel === "ADMIN_REVIEWED").length,
    independentlyVerified: n.impactReports.filter((r) => r.verificationLevel === "INDEPENDENTLY_VERIFIED").length,
  },
});

const ngoSelect = {
  id: true, organizationName: true, description: true, mission: true, city: true, state: true, logoUrl: true, status: true, minimumDonationPaise: true,
  causes: { select: { cause: { select: { id: true, name: true, slug: true } } } },
  impactReports: { where: { status: { in: ["SUBMITTED", "REVIEWED"] } }, select: { verificationLevel: true } },
};

export const discoverNgos = asyncHandler(async (req, res) => {
  const donor = await getDonorContext(req.user.id);
  const { search, cause, location, impact, favorites } = req.query;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 9));
  // Donors can only ever see VERIFIED, active NGOs.
  const where = { status: "VERIFIED", user: { isActive: true } };
  if (search) where.OR = [{ organizationName: { contains: String(search), mode: "insensitive" } }, { description: { contains: String(search), mode: "insensitive" } }];
  if (cause) where.causes = { some: { cause: { slug: String(cause) } } };
  if (location) where.AND = [{ OR: [{ city: { contains: String(location), mode: "insensitive" } }, { state: { contains: String(location), mode: "insensitive" } }] }];
  if (impact === "ADMIN_REVIEWED" || impact === "INDEPENDENTLY_VERIFIED") where.impactReports = { some: { status: { in: ["SUBMITTED", "REVIEWED"] }, verificationLevel: impact } };
  if (impact === "ANY_REPORTS") where.impactReports = { some: { status: { in: ["SUBMITTED", "REVIEWED"] } } };
  if (favorites === "true") where.favorites = { some: { donorId: donor.id } };

  const [rows, total, favs] = await Promise.all([
    prisma.nGOProfile.findMany({ where, select: ngoSelect, orderBy: { organizationName: "asc" }, skip: (page - 1) * limit, take: limit }),
    prisma.nGOProfile.count({ where }),
    prisma.donorFavorite.findMany({ where: { donorId: donor.id }, select: { ngoId: true } }),
  ]);
  const favIds = new Set(favs.map((f) => f.ngoId));
  res.json({ success: true, data: rows.map((n) => ngoCard(n, favIds)), pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

export const getNgoDetail = asyncHandler(async (req, res) => {
  const donor = await getDonorContext(req.user.id);
  const ngo = await prisma.nGOProfile.findFirst({
    where: { id: req.params.id, status: "VERIFIED", user: { isActive: true } },
    select: {
      ...ngoSelect, website: true, galleryUrls: true, vision: true,
      initiatives: { where: { status: "ACTIVE" }, select: { id: true, title: true, description: true, cause: { select: { name: true } } } },
      impactReports: {
        where: { status: { in: ["SUBMITTED", "REVIEWED"] } },
        orderBy: { reportedAt: "desc" },
        select: { id: true, title: true, description: true, peopleImpacted: true, amountUsedPaise: true, reportedAt: true, verificationLevel: true, evidence: { select: { id: true, type: true, title: true } } },
      },
    },
  });
  if (!ngo) throw notFound("NGO not found");
  const fav = await prisma.donorFavorite.findUnique({ where: { donorId_ngoId: { donorId: donor.id, ngoId: ngo.id } } });
  res.json({
    success: true,
    data: {
      ...ngoCard(ngo, new Set(fav ? [ngo.id] : [])),
      vision: ngo.vision, website: ngo.website, galleryUrls: ngo.galleryUrls, initiatives: ngo.initiatives,
      impactReports: ngo.impactReports.map((r) => ({ ...r, amountUsed: r.amountUsedPaise == null ? null : toAmount(r.amountUsedPaise), amountUsedPaise: undefined })),
    },
  });
});

export const addFavorite = asyncHandler(async (req, res) => {
  const donor = await getDonorContext(req.user.id);
  const ngo = await prisma.nGOProfile.findFirst({ where: { id: req.params.ngoId, status: "VERIFIED" }, select: { id: true } });
  if (!ngo) throw notFound("NGO not found");
  await prisma.donorFavorite.upsert({ where: { donorId_ngoId: { donorId: donor.id, ngoId: ngo.id } }, update: {}, create: { donorId: donor.id, ngoId: ngo.id } });
  res.json({ success: true, message: "Added to favourites" });
});

export const removeFavorite = asyncHandler(async (req, res) => {
  const donor = await getDonorContext(req.user.id);
  await prisma.donorFavorite.deleteMany({ where: { donorId: donor.id, ngoId: req.params.ngoId } });
  res.json({ success: true, message: "Removed from favourites" });
});

export const listCauses = asyncHandler(async (req, res) => {
  const causes = await prisma.cause.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true, description: true }, orderBy: { name: "asc" } });
  res.json({ success: true, data: causes });
});

/* ---------------- policy / authorization ---------------- */
export const getPolicy = asyncHandler(async (req, res) => {
  const donor = await getDonorContext(req.user.id);
  const draft = draftPolicyFromDonor(donor);
  const [current, auth] = await Promise.all([getCurrentPolicy(donor.id), buildAuthorizationText(draft)]);
  const problems = validateDraftPolicy(draft);
  const spent = await spentThisMonth(prisma, donor.id);
  res.json({
    success: true,
    data: {
      current: serializePolicy(current),
      authorizationPreview: { ...auth, problems, canAuthorize: problems.length === 0 },
      spentThisMonth: toAmount(spent),
      // Has the donor changed preferences since they last authorized?
      outOfSync: Boolean(current && current.authorizationText && current.authorizationText !== auth.text),
    },
  });
});

const authorizeSchema = z.object({ version: z.string(), text: z.string() });

export const authorize = asyncHandler(async (req, res) => {
  const body = authorizeSchema.parse(req.body);
  const donor = await getDonorContext(req.user.id);
  const policy = await authorizePolicy(donor, { confirmVersion: body.version, confirmText: body.text });
  await audit({ actorId: req.user.id, action: "POLICY_AUTHORIZED", entity: "AllocationPolicy", entityId: policy.id, metadata: { version: body.version }, req });
  res.json({ success: true, message: "Automatic allocation authorized", data: serializePolicy(policy) });
});

export const changePolicyState = (action) =>
  asyncHandler(async (req, res) => {
    const donor = await getDonorContext(req.user.id);
    const policy = await setPolicyState(donor.id, action);
    if (action === "revoke" || action === "pause") {
      // Stop automatic activity immediately.
      await prisma.donationSchedule.updateMany({ where: { donorId: donor.id, status: "ACTIVE" }, data: { lastError: `Paused: authorization ${action === "revoke" ? "revoked" : "paused"}` } });
    }
    await audit({ actorId: req.user.id, action: `POLICY_${action.toUpperCase()}`, entity: "AllocationPolicy", entityId: policy.id, req });
    res.json({ success: true, message: `Authorization ${action}d`.replace("pauseed", "paused").replace("resumed", "resumed"), data: serializePolicy(policy) });
  });

/* ---------------- wallet ---------------- */
export const getWallet = asyncHandler(async (req, res) => {
  const donor = await getDonorContext(req.user.id);
  const recent = await prisma.walletLedger.findMany({ where: { walletId: donor.walletAccount.id }, orderBy: { createdAt: "desc" }, take: 10 });
  res.json({ success: true, data: { ...serializeWallet(donor.walletAccount), recent: recent.map(serializeLedger) } });
});

const topupSchema = z.object({ amount: z.union([z.string(), z.number()]), idempotencyKey: z.string().min(8).max(100) });

export const topUpWallet = asyncHandler(async (req, res) => {
  const body = topupSchema.parse(req.body);
  const donor = await getDonorContext(req.user.id);
  const amountPaise = rupeesToPaise(body.amount);
  const result = await topUp({ walletId: donor.walletAccount.id, amountPaise, idempotencyKey: body.idempotencyKey });
  const wallet = await prisma.walletAccount.findUnique({ where: { id: donor.walletAccount.id } });
  if (!result.duplicate) await audit({ actorId: req.user.id, action: "WALLET_TOPUP_SIMULATED", entity: "WalletLedger", entityId: result.entry.id, metadata: { amountPaise: amountPaise.toString() }, req });
  res.status(result.duplicate ? 200 : 201).json({
    success: true,
    duplicate: result.duplicate,
    message: result.duplicate ? "This top-up was already applied" : "Simulated funds added",
    data: { ...serializeWallet(wallet), entry: serializeLedger(result.entry) },
  });
});

/* ---------------- ambassador ---------------- */
const makeCode = (name) => `SEVA-${name.replace(/[^a-z]/gi, "").slice(0, 4).toUpperCase().padEnd(4, "X")}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export const getAmbassador = asyncHandler(async (req, res) => {
  let donor = await getDonorContext(req.user.id);
  if (!donor.referralCode) {
    for (let i = 0; i < 5 && !donor.referralCode; i += 1) {
      try {
        donor = await prisma.donorProfile.update({ where: { id: donor.id }, data: { referralCode: makeCode(req.user.name) }, include: { walletAccount: true } });
      } catch (e) { if (e.code !== "P2002") throw e; }
    }
  }
  const referred = await prisma.donorProfile.findMany({
    where: { referredByCode: donor.referralCode },
    select: { createdAt: true, donations: { where: { status: "COMPLETED" }, select: { id: true }, take: 1 } },
  });
  const base = process.env.CLIENT_URL || "http://localhost:5173";
  res.json({
    success: true,
    data: {
      referralCode: donor.referralCode,
      referralLink: `${base}/signup?ref=${donor.referralCode}`,
      stats: {
        signups: referred.length,
        activeDonors: referred.filter((r) => r.donations.length > 0).length,
        lastSignupAt: referred.length ? referred.map((r) => r.createdAt).sort((a, b) => b - a)[0] : null,
      },
    },
  });
});

export { HttpError, available };
