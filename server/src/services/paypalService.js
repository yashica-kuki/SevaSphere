import { HttpError } from "../utils/httpError.js";

/**
 * PayPal Orders v2 (server-side). Sandbox only; USD only.
 * PayPal does not process INR here and nothing is converted into the INR wallet.
 */
export const PAYPAL_CURRENCY = "USD";

const baseUrl = () =>
  process.env.PAYPAL_API_BASE || (process.env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

export const paypalConfigured = () => Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

const ensureConfigured = () => {
  if (process.env.PAYPAL_MODE === "live") throw new HttpError(500, "Only PayPal Sandbox is supported by this prototype");
  if (!paypalConfigured()) throw new HttpError(503, "PayPal Sandbox is not configured on the server (set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET).");
};

let tokenCache = { token: null, exp: 0 };
const getToken = async () => {
  if (tokenCache.token && tokenCache.exp > Date.now() + 30_000) return tokenCache.token;
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new HttpError(502, "Could not authenticate with PayPal Sandbox");
  const json = await res.json();
  tokenCache = { token: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return tokenCache.token;
};

const call = async (path, { method = "GET", body, requestId } = {}) => {
  ensureConfigured();
  const token = await getToken();
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const issue = json?.details?.[0]?.issue || json?.name || "PAYPAL_ERROR";
    const err = new HttpError(res.status === 422 ? 409 : 502, `PayPal error: ${issue}`);
    err.paypalIssue = issue;
    throw err;
  }
  return json;
};

export const createOrder = ({ amountUsd, description, requestId }) =>
  call("/v2/checkout/orders", {
    method: "POST",
    requestId,
    body: {
      intent: "CAPTURE",
      purchase_units: [{ description, amount: { currency_code: PAYPAL_CURRENCY, value: amountUsd } }],
    },
  });

export const captureOrder = (orderId, requestId) =>
  call(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST", requestId, body: {} });

export const getOrder = (orderId) => call(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);

/** Pull the verified capture facts out of a PayPal order/capture response. */
export const extractCapture = (order) => {
  const capture = order?.purchase_units?.[0]?.payments?.captures?.[0];
  return capture
    ? { id: capture.id, status: capture.status, reason: capture.status_details?.reason ?? null, value: capture.amount?.value, currency: capture.amount?.currency_code }
    : null;
};
