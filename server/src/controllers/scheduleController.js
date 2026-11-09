import { z } from "zod";
import { prisma } from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import { rupeesToPaise, optionalRupeesToPaise, toAmount } from "../utils/money.js";
import { HttpError, badRequest, notFound } from "../utils/httpError.js";
import { getDonorContext } from "../services/walletService.js";
import { addInterval, runSchedule } from "../services/scheduleService.js";
import { audit } from "../services/auditService.js";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(["ONE_TIME", "RECURRING"]),
  amount: z.union([z.string(), z.number()]),
  frequency: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"]).default("MONTHLY"),
  intervalDays: z.number().int().min(1).max(365).optional().nullable(),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
  budgetLimit: z.union([z.string(), z.number()]).optional().nullable(),
  causeIds: z.array(z.string().uuid()).max(10).default([]),
});

const serialize = (s) => ({
  id: s.id, name: s.name, type: s.type, status: s.status, frequency: s.frequency, intervalDays: s.intervalDays,
  amount: toAmount(s.amountPaise), startDate: s.startDate, endDate: s.endDate, nextRunAt: s.nextRunAt,
  budgetLimit: s.budgetLimitPaise == null ? null : toAmount(s.budgetLimitPaise), spent: toAmount(s.spentPaise),
  causeIds: s.causeIds, lastRunAt: s.lastRunAt, lastRunStatus: s.lastRunStatus, lastError: s.lastError, runCount: s.runCount,
});

const parseBody = async (body, donor) => {
  const b = schema.parse(body);
  const amountPaise = rupeesToPaise(b.amount);
  if (amountPaise < 100n) throw badRequest("Amount must be at least ₹1");
  const budgetLimitPaise = optionalRupeesToPaise(b.budgetLimit);
  if (budgetLimitPaise !== null && budgetLimitPaise < amountPaise) throw badRequest("Budget limit must be at least one donation amount");
  if (b.frequency === "CUSTOM" && b.type === "RECURRING" && !b.intervalDays) throw badRequest("Enter the interval in days for a custom frequency");
  const startDate = new Date(b.startDate);
  const endDate = b.endDate ? new Date(b.endDate) : null;
  if (Number.isNaN(startDate.getTime())) throw badRequest("Invalid start date");
  if (endDate && endDate <= startDate) throw badRequest("End date must be after the start date");
  if (b.causeIds.length) {
    const n = await prisma.cause.count({ where: { id: { in: b.causeIds }, isActive: true } });
    if (n !== new Set(b.causeIds).size) throw badRequest("Unknown cause selected");
  }
  return { b, amountPaise, budgetLimitPaise, startDate, endDate, donor };
};

const owned = async (req) => {
  const donor = await getDonorContext(req.user.id);
  const s = await prisma.donationSchedule.findFirst({ where: { id: req.params.id, donorId: donor.id } });
  if (!s) throw notFound("Schedule not found"); // same response for other donors' ids
  return { donor, schedule: s };
};

export const listSchedules = asyncHandler(async (req, res) => {
  const donor = await getDonorContext(req.user.id);
  const rows = await prisma.donationSchedule.findMany({ where: { donorId: donor.id }, orderBy: { nextRunAt: "asc" } });
  res.json({ success: true, data: rows.map(serialize) });
});

/** Timeline data for the scheduler: past runs + projected upcoming occurrences. */
export const scheduleEvents = asyncHandler(async (req, res) => {
  const donor = await getDonorContext(req.user.id);
  const schedules = await prisma.donationSchedule.findMany({ where: { donorId: donor.id } });
  const runs = await prisma.scheduleRun.findMany({ where: { schedule: { donorId: donor.id } }, orderBy: { scheduledFor: "desc" }, take: 200 });
  const events = runs.map((r) => ({ id: `run-${r.id}`, scheduleId: r.scheduleId, startDate: r.scheduledFor, kind: "RUN", status: r.status, message: r.message }));
  const horizon = new Date(); horizon.setUTCMonth(horizon.getUTCMonth() + 6);
  for (const s of schedules) {
    if (s.status !== "ACTIVE" && s.status !== "PAUSED") continue;
    let when = new Date(s.nextRunAt);
    for (let i = 0; i < 24 && when <= horizon && (!s.endDate || when <= s.endDate); i += 1) {
      events.push({ id: `next-${s.id}-${i}`, scheduleId: s.id, startDate: when, kind: i === 0 ? "NEXT" : "PROJECTED", status: s.status === "PAUSED" ? "PAUSED" : "SCHEDULED" });
      if (s.type === "ONE_TIME") break;
      when = addInterval(when, s);
    }
  }
  res.json({ success: true, data: { schedules: schedules.map(serialize), events } });
});

export const createSchedule = asyncHandler(async (req, res) => {
  const donor = await getDonorContext(req.user.id);
  const { b, amountPaise, budgetLimitPaise, startDate, endDate } = await parseBody(req.body, donor);
  if (startDate < new Date(Date.now() - 60_000)) throw badRequest("Start date must be in the future");
  const s = await prisma.donationSchedule.create({
    data: {
      donorId: donor.id, name: b.name, type: b.type, amountPaise,
      frequency: b.type === "ONE_TIME" ? "MONTHLY" : b.frequency,
      intervalDays: b.frequency === "CUSTOM" ? b.intervalDays : null,
      startDate, endDate: b.type === "ONE_TIME" ? null : endDate, nextRunAt: startDate,
      budgetLimitPaise, causeIds: b.causeIds, status: "ACTIVE", isActive: true,
    },
  });
  await audit({ actorId: req.user.id, action: "SCHEDULE_CREATED", entity: "DonationSchedule", entityId: s.id, req });
  res.status(201).json({ success: true, message: "Schedule created", data: serialize(s) });
});

export const updateSchedule = asyncHandler(async (req, res) => {
  const { donor, schedule } = await owned(req);
  if (!["ACTIVE", "PAUSED"].includes(schedule.status)) throw new HttpError(409, `A ${schedule.status.toLowerCase()} schedule cannot be edited`);
  const { b, amountPaise, budgetLimitPaise, startDate, endDate } = await parseBody(req.body, donor);
  const startChanged = startDate.getTime() !== schedule.startDate.getTime();
  if (startChanged && startDate < new Date(Date.now() - 60_000)) throw badRequest("Start date must be in the future");
  const s = await prisma.donationSchedule.update({
    where: { id: schedule.id },
    data: {
      name: b.name, type: b.type, amountPaise,
      frequency: b.type === "ONE_TIME" ? "MONTHLY" : b.frequency,
      intervalDays: b.frequency === "CUSTOM" ? b.intervalDays : null,
      startDate, endDate: b.type === "ONE_TIME" ? null : endDate, budgetLimitPaise, causeIds: b.causeIds,
      ...(startChanged ? { nextRunAt: startDate } : {}),
    },
  });
  await audit({ actorId: req.user.id, action: "SCHEDULE_UPDATED", entity: "DonationSchedule", entityId: s.id, req });
  res.json({ success: true, message: "Schedule updated", data: serialize(s) });
});

export const pauseSchedule = asyncHandler(async (req, res) => {
  const { schedule } = await owned(req);
  if (schedule.status !== "ACTIVE") throw new HttpError(409, "Only active schedules can be paused");
  const s = await prisma.donationSchedule.update({ where: { id: schedule.id }, data: { status: "PAUSED", isActive: false } });
  await audit({ actorId: req.user.id, action: "SCHEDULE_PAUSED", entity: "DonationSchedule", entityId: s.id, req });
  res.json({ success: true, message: "Schedule paused", data: serialize(s) });
});

export const resumeSchedule = asyncHandler(async (req, res) => {
  const { schedule } = await owned(req);
  if (schedule.status !== "PAUSED") throw new HttpError(409, "Only paused schedules can be resumed");
  // Skip missed occurrences instead of firing a burst of catch-up donations.
  let next = schedule.nextRunAt;
  if (schedule.type === "ONE_TIME") { if (next < new Date()) next = new Date(Date.now() + 5 * 60_000); }
  else while (next < new Date()) next = addInterval(next, schedule);
  if (schedule.endDate && next > schedule.endDate) throw badRequest("The schedule's end date has passed");
  const s = await prisma.donationSchedule.update({ where: { id: schedule.id }, data: { status: "ACTIVE", isActive: true, nextRunAt: next } });
  await audit({ actorId: req.user.id, action: "SCHEDULE_RESUMED", entity: "DonationSchedule", entityId: s.id, req });
  res.json({ success: true, message: "Schedule resumed", data: serialize(s) });
});

export const cancelSchedule = asyncHandler(async (req, res) => {
  const { schedule } = await owned(req);
  if (["CANCELLED", "COMPLETED"].includes(schedule.status)) throw new HttpError(409, `Schedule is already ${schedule.status.toLowerCase()}`);
  const s = await prisma.donationSchedule.update({ where: { id: schedule.id }, data: { status: "CANCELLED", isActive: false } });
  await audit({ actorId: req.user.id, action: "SCHEDULE_CANCELLED", entity: "DonationSchedule", entityId: s.id, req });
  res.json({ success: true, message: "Schedule cancelled", data: serialize(s) });
});

/** Demo helper: execute the schedule now through the same validated workflow. */
export const runScheduleNow = asyncHandler(async (req, res) => {
  const { schedule } = await owned(req);
  const result = await runSchedule(schedule.id, { force: true });
  const s = await prisma.donationSchedule.findUnique({ where: { id: schedule.id } });
  res.status(result.status === "FAILED" ? 409 : 200).json({ success: result.status !== "FAILED", message: result.message ?? "Run complete", data: { run: result, schedule: serialize(s) } });
});
