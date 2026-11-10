import { z } from "zod";
import { prisma } from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import { HttpError, badRequest, notFound } from "../utils/httpError.js";
import { audit } from "../services/auditService.js";
import * as paypal from "../services/paypalService.js";

const toData = (t) => ({
  id: t.id, orderId: t.providerOrderId, captureId: t.providerPaymentId, amount: t.amount.toString(), currency: t.currency,
  status: t.status, outcome: t.metadata?.outcome ?? t.status, createdAt: t.createdAt, ngoId: t.metadata?.ngoId ?? null,
  sandbox: true,
});

export const getConfig = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      configured: paypal.paypalConfigured(),
      clientId: paypal.paypalConfigured() ? process.env.PAYPAL_CLIENT_ID : null, // public client id, safe for the browser
      currency: paypal.PAYPAL_CURRENCY,
      mode: "sandbox",
      notice: "PayPal runs in Sandbox mode with USD. It is separate from the simulated INR wallet and nothing is converted.",
    },
  });
});

const createSchema = z.object({
  amountUsd: z.string().regex(/^\d{1,5}(\.\d{1,2})?$/, "Enter an amount like 10.00"),
  ngoId: z.string().uuid().optional().nullable(),
  idempotencyKey: z.string().min(8).max(100),
});

export const createOrder = asyncHandler(async (req, res) => {
  const body = createSchema.parse(req.body);
  const amount = Number(body.amountUsd);
  if (!(amount >= 1 && amount <= 500)) throw badRequest("Sandbox donations must be between $1.00 and $500.00");
  const value = Number(body.amountUsd).toFixed(2);

  if (body.ngoId) {
    const ngo = await prisma.nGOProfile.findFirst({ where: { id: body.ngoId, status: "VERIFIED" }, select: { id: true } });
    if (!ngo) throw badRequest("Selected NGO is not verified");
  }
  const key = `paypal:${req.user.id}:${body.idempotencyKey}`;
  const existing = await prisma.paymentTransaction.findUnique({ where: { idempotencyKey: key } });
  if (existing) return res.json({ success: true, duplicate: true, data: { ...toData(existing), orderId: existing.providerOrderId } });

  const order = await paypal.createOrder({ amountUsd: value, description: "SevaKarma sandbox donation", requestId: key });
  const tx = await prisma.paymentTransaction.create({
    data: {
      userId: req.user.id, provider: "PAYPAL_SANDBOX", providerOrderId: order.id, amount: value, currency: paypal.PAYPAL_CURRENCY,
      status: "PENDING", idempotencyKey: key, metadata: { ngoId: body.ngoId ?? null, purpose: "SANDBOX_DONATION", outcome: "CREATED" },
    },
  });
  await audit({ actorId: req.user.id, action: "PAYPAL_ORDER_CREATED", entity: "PaymentTransaction", entityId: tx.id, metadata: { amount: value, currency: "USD" }, req });
  res.status(201).json({ success: true, data: toData(tx) });
});

const orderSchema = z.object({ orderId: z.string().min(5).max(64) });

const ownTx = async (req, orderId) => {
  const tx = await prisma.paymentTransaction.findFirst({ where: { providerOrderId: orderId, userId: req.user.id } });
  if (!tx) throw notFound("Payment order not found");
  return tx;
};

export const captureOrder = asyncHandler(async (req, res) => {
  const { orderId } = orderSchema.parse(req.body);
  const tx = await ownTx(req, orderId);
  // Repeated capture requests are safe: return the stored result.
  if (tx.status === "SUCCESS") return res.json({ success: true, duplicate: true, data: toData(tx) });
  if (tx.status !== "PENDING") throw new HttpError(409, `This payment is already ${tx.status.toLowerCase()}`);

  let order;
  try {
    order = await paypal.captureOrder(orderId, `capture:${tx.id}`);
  } catch (error) {
    if (error.paypalIssue === "ORDER_ALREADY_CAPTURED") order = await paypal.getOrder(orderId);
    else {
      const failed = await prisma.paymentTransaction.update({ where: { id: tx.id }, data: { status: "FAILED", metadata: { ...tx.metadata, outcome: "FAILED", error: String(error.message).slice(0, 200) } } });
      await audit({ actorId: req.user.id, action: "PAYPAL_CAPTURE_FAILED", entity: "PaymentTransaction", entityId: tx.id, metadata: { error: error.message }, req });
      return res.status(error.statusCode || 502).json({ success: false, message: error.message, data: toData(failed) });
    }
  }

  // Verify what PayPal says against what we stored — never trust the browser.
  const cap = paypal.extractCapture(order);
  const matches = order.id === tx.providerOrderId && cap && cap.currency === tx.currency &&
    Number(cap.value).toFixed(2) === Number(tx.amount).toFixed(2);
  const diagnostics = { paypalOrderStatus: order.status, captureStatus: cap?.status ?? null, pendingReason: cap?.reason ?? null, captureCurrency: cap?.currency ?? null, captureValue: cap?.value ?? null };

  // Money is verified but PayPal is holding it (common in sandbox when the merchant account must manually accept USD).
  if (matches && order.status === "COMPLETED" && cap.status === "PENDING") {
    const held = await prisma.paymentTransaction.update({
      where: { id: tx.id },
      data: { providerPaymentId: cap.id, metadata: { ...tx.metadata, outcome: "CAPTURE_PENDING", ...diagnostics } },
    });
    await audit({ actorId: req.user.id, action: "PAYPAL_CAPTURE_PENDING", entity: "PaymentTransaction", entityId: tx.id, metadata: diagnostics, req });
    return res.json({
      success: true,
      pending: true,
      message: `PayPal accepted the payment but is holding it as pending${cap.reason ? ` (${cap.reason})` : ""}. In the sandbox, log in to your Business sandbox account and accept it, (Sandbox → Accounts → your Business account → PayPal login → Activity). The payment stays listed as Pending here.`,
      data: toData(held),
    });
  }

  const ok = matches && order.status === "COMPLETED" && cap.status === "COMPLETED";
  const updated = await prisma.paymentTransaction.update({
    where: { id: tx.id },
    data: ok
      ? { status: "SUCCESS", providerPaymentId: cap.id, metadata: { ...tx.metadata, outcome: "CAPTURED", capturedAt: new Date().toISOString(), ...diagnostics } }
      : { status: "FAILED", metadata: { ...tx.metadata, outcome: "VERIFICATION_FAILED", ...diagnostics } },
  });
  await audit({ actorId: req.user.id, action: ok ? "PAYPAL_CAPTURED" : "PAYPAL_VERIFICATION_FAILED", entity: "PaymentTransaction", entityId: tx.id, metadata: ok ? undefined : diagnostics, req });
  if (!ok) {
    return res.status(409).json({
      success: false,
      message: `PayPal capture could not be verified (order ${order.status}, capture ${cap?.status ?? "none"}${cap?.currency ? `, ${cap.currency} ${cap.value}` : ""}).`,
      data: toData(updated),
    });
  }
  res.json({ success: true, message: "Sandbox payment captured", data: toData(updated) });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = orderSchema.parse(req.body);
  const tx = await ownTx(req, orderId);
  if (tx.status !== "PENDING") return res.json({ success: true, data: toData(tx) });
  const updated = await prisma.paymentTransaction.update({ where: { id: tx.id }, data: { status: "CANCELLED", metadata: { ...tx.metadata, outcome: "CANCELLED" } } });
  await audit({ actorId: req.user.id, action: "PAYPAL_CANCELLED", entity: "PaymentTransaction", entityId: tx.id, req });
  res.json({ success: true, message: "Payment cancelled", data: toData(updated) });
});

export const failOrder = asyncHandler(async (req, res) => {
  const { orderId } = orderSchema.parse(req.body);
  const tx = await ownTx(req, orderId);
  if (tx.status !== "PENDING") return res.json({ success: true, data: toData(tx) });
  const updated = await prisma.paymentTransaction.update({ where: { id: tx.id }, data: { status: "FAILED", metadata: { ...tx.metadata, outcome: "CHECKOUT_ERROR" } } });
  res.json({ success: true, data: toData(updated) });
});

export const listMyPayments = asyncHandler(async (req, res) => {
  const rows = await prisma.paymentTransaction.findMany({ where: { userId: req.user.id, provider: "PAYPAL_SANDBOX" }, orderBy: { createdAt: "desc" }, take: 20 });
  res.json({ success: true, data: rows.map(toData) });
});
