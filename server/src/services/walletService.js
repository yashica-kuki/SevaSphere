import { prisma } from "../config/prisma.js";
import { HttpError, badRequest } from "../utils/httpError.js";
import { toAmount } from "../utils/money.js";

/**
 * Simulated INR wallet. All values are BigInt paise.
 * balancePaise  = total funds in wallet
 * reservedPaise = funds held for in-flight donations
 * available     = balance - reserved
 * Ledger rows are append-only (never updated or deleted).
 */

export const MAX_TOPUP_PAISE = 10_000_000n; // ₹1,00,000 per simulated top-up
export const MIN_TOPUP_PAISE = 100n; // ₹1

export const lockWallet = async (tx, walletId) => {
  const rows = await tx.$queryRaw`SELECT "id" FROM "WalletAccount" WHERE "id" = ${walletId}::uuid FOR UPDATE`;
  if (!rows.length) throw new HttpError(404, "Wallet not found");
  return tx.walletAccount.findUnique({ where: { id: walletId } });
};

const appendLedger = (tx, wallet, { type, amountPaise, description, referenceId, idempotencyKey }) =>
  tx.walletLedger.create({
    data: {
      walletId: wallet.id,
      type,
      amountPaise,
      balanceAfterPaise: wallet.balancePaise,
      reservedAfterPaise: wallet.reservedBalancePaise,
      description,
      referenceId: referenceId ?? null,
      idempotencyKey: idempotencyKey ?? null,
    },
  });

const writeBalances = (tx, wallet, balancePaise, reservedPaise) => {
  if (balancePaise < 0n || reservedPaise < 0n || reservedPaise > balancePaise) {
    throw new HttpError(409, "Wallet integrity check failed");
  }
  return tx.walletAccount.update({
    where: { id: wallet.id },
    data: { balancePaise, reservedBalancePaise: reservedPaise },
  });
};

export const available = (wallet) => wallet.balancePaise - wallet.reservedBalancePaise;

const scopedKey = (walletId, key) => (key ? `${walletId}:${key}` : null);

export const serializeWallet = (wallet) => ({
  currency: wallet.currency,
  total: toAmount(wallet.balancePaise),
  reserved: toAmount(wallet.reservedBalancePaise),
  available: toAmount(available(wallet)),
  simulated: true,
});

export const serializeLedger = (e) => ({
  id: e.id,
  type: e.type,
  amount: toAmount(e.amountPaise),
  balanceAfter: toAmount(e.balanceAfterPaise),
  reservedAfter: toAmount(e.reservedAfterPaise),
  description: e.description,
  referenceId: e.referenceId,
  createdAt: e.createdAt,
});

/** Add simulated funds. Safe to retry with the same idempotencyKey. */
export const topUp = async ({ walletId, amountPaise, idempotencyKey, description = "Simulated wallet top-up (demo)" }) => {
  if (amountPaise < MIN_TOPUP_PAISE || amountPaise > MAX_TOPUP_PAISE) {
    throw badRequest("Top-up must be between ₹1 and ₹1,00,000");
  }
  if (!idempotencyKey) throw badRequest("An idempotency key is required");
  const key = scopedKey(walletId, `topup:${idempotencyKey}`);

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.walletLedger.findUnique({ where: { idempotencyKey: key } });
      if (existing) return { entry: existing, duplicate: true };
      const wallet = await lockWallet(tx, walletId);
      const updated = await writeBalances(tx, wallet, wallet.balancePaise + amountPaise, wallet.reservedBalancePaise);
      const entry = await appendLedger(tx, updated, { type: "TOPUP", amountPaise, description, idempotencyKey: key });
      return { entry, duplicate: false, wallet: updated };
    });
  } catch (err) {
    if (err.code === "P2002") {
      const entry = await prisma.walletLedger.findUnique({ where: { idempotencyKey: key } });
      if (entry) return { entry, duplicate: true };
    }
    throw err;
  }
};

/** Reserve funds for a donation. Must run inside the donation transaction. */
export const holdFunds = async (tx, { walletId, amountPaise, referenceId, idempotencyKey, description }) => {
  const wallet = await lockWallet(tx, walletId);
  if (!wallet.isActive) throw new HttpError(409, "Wallet is inactive");
  if (available(wallet) < amountPaise) throw new HttpError(402, "Insufficient available wallet balance");
  const updated = await writeBalances(tx, wallet, wallet.balancePaise, wallet.reservedBalancePaise + amountPaise);
  const entry = await appendLedger(tx, updated, {
    type: "DONATION_HOLD",
    amountPaise,
    description,
    referenceId,
    idempotencyKey: scopedKey(walletId, `${idempotencyKey}:hold`),
  });
  return { wallet: updated, entry };
};

/** Convert a hold into a debit. Must run inside the donation transaction. */
export const debitHeldFunds = async (tx, { walletId, amountPaise, referenceId, idempotencyKey, description }) => {
  const wallet = await tx.walletAccount.findUnique({ where: { id: walletId } });
  if (wallet.reservedBalancePaise < amountPaise) throw new HttpError(409, "No matching hold to debit");
  const updated = await writeBalances(tx, wallet, wallet.balancePaise - amountPaise, wallet.reservedBalancePaise - amountPaise);
  const entry = await appendLedger(tx, updated, {
    type: "DONATION_DEBIT",
    amountPaise,
    description,
    referenceId,
    idempotencyKey: scopedKey(walletId, `${idempotencyKey}:debit`),
  });
  return { wallet: updated, entry };
};

/** Credit funds back after a donation is refunded. Runs inside caller's transaction. */
export const refundToWallet = async (tx, { walletId, amountPaise, referenceId, idempotencyKey, description }) => {
  const wallet = await lockWallet(tx, walletId);
  const updated = await writeBalances(tx, wallet, wallet.balancePaise + amountPaise, wallet.reservedBalancePaise);
  const entry = await appendLedger(tx, updated, {
    type: "REFUND",
    amountPaise,
    description,
    referenceId,
    idempotencyKey: scopedKey(walletId, idempotencyKey),
  });
  return { wallet: updated, entry };
};

/** Reverse an earlier TOPUP (e.g. a mistaken demo top-up). */
export const reverseTopUp = async ({ ledgerEntryId, reason }) => {
  return prisma.$transaction(async (tx) => {
    const original = await tx.walletLedger.findUnique({ where: { id: ledgerEntryId } });
    if (!original) throw new HttpError(404, "Ledger entry not found");
    if (original.type !== "TOPUP") throw badRequest("Only TOPUP entries can be reversed");
    const key = scopedKey(original.walletId, `reversal:${original.id}`);
    const already = await tx.walletLedger.findUnique({ where: { idempotencyKey: key } });
    if (already) throw new HttpError(409, "This entry was already reversed");

    const wallet = await lockWallet(tx, original.walletId);
    if (available(wallet) < original.amountPaise) {
      throw new HttpError(409, "Cannot reverse: funds were already used or reserved");
    }
    const updated = await writeBalances(tx, wallet, wallet.balancePaise - original.amountPaise, wallet.reservedBalancePaise);
    const entry = await appendLedger(tx, updated, {
      type: "REVERSAL",
      amountPaise: original.amountPaise,
      description: `Reversal of top-up: ${reason}`,
      referenceId: original.id,
      idempotencyKey: key,
    });
    return { entry, wallet: updated };
  });
};

/** Manual correction by an admin (signed amount). */
export const adjustWallet = async ({ walletId, amountPaise, reason, idempotencyKey }) => {
  if (amountPaise === 0n) throw badRequest("Adjustment cannot be zero");
  return prisma.$transaction(async (tx) => {
    const key = scopedKey(walletId, `adjust:${idempotencyKey}`);
    const existing = await tx.walletLedger.findUnique({ where: { idempotencyKey: key } });
    if (existing) return { entry: existing, duplicate: true };
    const wallet = await lockWallet(tx, walletId);
    const updated = await writeBalances(tx, wallet, wallet.balancePaise + amountPaise, wallet.reservedBalancePaise);
    const entry = await appendLedger(tx, updated, {
      type: "ADJUSTMENT",
      amountPaise,
      description: `Admin adjustment: ${reason}`,
      idempotencyKey: key,
    });
    return { entry, wallet: updated, duplicate: false };
  });
};

export const getDonorContext = async (userId) => {
  const donor = await prisma.donorProfile.findUnique({
    where: { userId },
    include: { walletAccount: true },
  });
  if (!donor) throw new HttpError(404, "Donor profile not found");
  if (!donor.walletAccount) {
    donor.walletAccount = await prisma.walletAccount.create({ data: { donorId: donor.id } });
  }
  return donor;
};
