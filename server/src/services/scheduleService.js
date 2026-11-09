import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/httpError.js";
import { getDonorContext, available } from "./walletService.js";
import { getCurrentPolicy } from "./policyService.js";
import { runAllocationWorkflow } from "./agentGraph.js";
import { audit } from "./auditService.js";

export const addInterval = (date, schedule) => {
  const d = new Date(date);
  switch (schedule.frequency) {
    case "WEEKLY": d.setUTCDate(d.getUTCDate() + 7); break;
    case "MONTHLY": d.setUTCMonth(d.getUTCMonth() + 1); break;
    case "QUARTERLY": d.setUTCMonth(d.getUTCMonth() + 3); break;
    case "YEARLY": d.setUTCFullYear(d.getUTCFullYear() + 1); break;
    default: d.setUTCDate(d.getUTCDate() + (schedule.intervalDays || 1));
  }
  return d;
};

/**
 * Execute one schedule occurrence. Calendar events never move money by themselves:
 * the full agent workflow re-validates authorization, wallet, budget and NGO eligibility.
 * A unique ScheduleRun key makes each occurrence run at most once.
 */
export const runSchedule = async (scheduleId, { force = false, now = new Date() } = {}) => {
  const schedule = await prisma.donationSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule) throw new HttpError(404, "Schedule not found");
  if (schedule.status !== "ACTIVE") throw new HttpError(409, `Schedule is ${schedule.status.toLowerCase()}`);
  if (!force && schedule.nextRunAt > now) return { skipped: true, reason: "NOT_DUE" };

  const occurrence = schedule.nextRunAt;
  const key = `schedule:${schedule.id}:${occurrence.toISOString()}${force ? ":manual:" + Date.now() : ""}`;

  let run;
  try {
    run = await prisma.scheduleRun.create({ data: { scheduleId: schedule.id, scheduledFor: occurrence, status: "RUNNING", idempotencyKey: key } });
  } catch (e) {
    if (e.code === "P2002") return { skipped: true, reason: "ALREADY_RAN" };
    throw e;
  }

  let status = "SUCCESS";
  let message = "";
  let donationId = null;
  let executionId = null;
  try {
    const donorRow = await prisma.donorProfile.findUnique({ where: { id: schedule.donorId }, include: { walletAccount: true, user: { select: { id: true, isActive: true } } } });
    if (!donorRow?.user.isActive) throw new Error("Donor account is not active");
    const policy = await getCurrentPolicy(donorRow.id);
    if (!policy || policy.authorizationStatus !== "ACTIVE") throw new Error("Authorization is not active — donation skipped");

    const remaining = schedule.budgetLimitPaise ? schedule.budgetLimitPaise - schedule.spentPaise : null;
    if (remaining !== null && remaining < schedule.amountPaise) throw new Error("Schedule budget exhausted");

    const result = await runAllocationWorkflow({
      donor: donorRow, wallet: donorRow.walletAccount, policy, requestedPaise: schedule.amountPaise,
      causeIds: schedule.causeIds, dryRun: false, idempotencyKey: key, trigger: "SCHEDULE",
      scheduleId: schedule.id, budgetCapPaise: remaining, userId: donorRow.user.id,
    });
    executionId = result.executionId;
    if (result.execution?.status === "FAILED") throw new Error(result.execution.error || "Workflow failed");
    donationId = result.state?.donation?.id ?? null;
    message = result.state?.explanation?.slice(0, 300) ?? "Donation completed";
  } catch (error) {
    status = "FAILED";
    message = String(error.message).slice(0, 300);
  }

  const spent = status === "SUCCESS" && donationId
    ? (await prisma.donation.findUnique({ where: { id: donationId }, select: { amountPaise: true } })).amountPaise
    : 0n;

  await prisma.$transaction(async (tx) => {
    await tx.scheduleRun.update({ where: { id: run.id }, data: { status, message, donationId, executionId } });
    const fresh = await tx.donationSchedule.findUnique({ where: { id: schedule.id } });
    const data = { lastRunAt: new Date(), lastRunStatus: status, lastError: status === "FAILED" ? message : null, runCount: { increment: 1 }, spentPaise: fresh.spentPaise + spent };
    if (schedule.type === "ONE_TIME") {
      data.status = status === "SUCCESS" ? "COMPLETED" : "FAILED";
      data.isActive = false;
    } else if (!force) {
      const next = addInterval(occurrence, schedule);
      data.nextRunAt = next;
      if (schedule.endDate && next > schedule.endDate) { data.status = "COMPLETED"; data.isActive = false; }
    }
    await tx.donationSchedule.update({ where: { id: schedule.id }, data });
    await audit({ actorId: null, action: `SCHEDULE_RUN_${status}`, entity: "DonationSchedule", entityId: schedule.id, metadata: { message, donationId } }, tx);
  });
  return { skipped: false, status, message, donationId, executionId };
};

/** Database-backed poller: claims due schedules with SKIP LOCKED so multiple workers can't double-run. */
export const processDueSchedules = async (limit = 10) => {
  const due = await prisma.$queryRaw`
    SELECT "id" FROM "DonationSchedule"
    WHERE "status" = 'ACTIVE' AND "nextRunAt" <= NOW()
    ORDER BY "nextRunAt" ASC LIMIT ${limit}`;
  const results = [];
  for (const { id } of due) {
    try { results.push({ id, ...(await runSchedule(id)) }); }
    catch (e) { results.push({ id, error: e.message }); }
  }
  return results;
};

let timer = null;
export const startScheduler = () => {
  if (process.env.SCHEDULER_ENABLED === "false" || timer) return;
  const every = Number(process.env.SCHEDULER_INTERVAL_MS || 30000);
  let busy = false;
  timer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try { const r = await processDueSchedules(); if (r.length) console.log(`[scheduler] processed ${r.length} schedule(s)`); }
    catch (e) { console.error("[scheduler] error:", e.message); }
    finally { busy = false; }
  }, every);
  timer.unref?.();
  console.log(`[scheduler] database-backed scheduler running every ${every}ms`);
};
export const stopScheduler = () => { if (timer) clearInterval(timer); timer = null; };

export { getDonorContext, available };
