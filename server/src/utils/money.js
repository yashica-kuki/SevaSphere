// All INR amounts are integer paise (BigInt). Never use floating point for money.

export class MoneyError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
}

/** Parse a rupee string/number such as "1250.50" into BigInt paise without floats. */
export const rupeesToPaise = (value) => {
  if (value === null || value === undefined || value === "") {
    throw new MoneyError("Amount is required");
  }
  const text = String(value).trim();
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(text)) {
    throw new MoneyError("Amount must be a positive number with at most 2 decimals");
  }
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
};

export const optionalRupeesToPaise = (value) =>
  value === null || value === undefined || value === "" ? null : rupeesToPaise(value);

export const toBigInt = (value) => (typeof value === "bigint" ? value : BigInt(value));

export const minBig = (...values) => values.reduce((a, b) => (b < a ? b : a));
export const maxBig = (...values) => values.reduce((a, b) => (b > a ? b : a));

/** Presentation helper: { paise: "12050", rupees: 120.5 } (rupees is display-only). */
export const toAmount = (paise) => {
  const value = paise == null ? 0n : toBigInt(paise);
  return { paise: value.toString(), rupees: Number(value) / 100 };
};

export const formatInr = (paise) => {
  const value = toBigInt(paise ?? 0n);
  const whole = value / 100n;
  const frac = (value % 100n).toString().padStart(2, "0");
  return `₹${whole.toLocaleString("en-IN")}.${frac}`;
};

/**
 * Split `total` paise across weights using the largest-remainder method.
 * Result always sums to exactly `total` (integer arithmetic only).
 */
export const splitByWeights = (total, weights) => {
  const t = toBigInt(total);
  const scaled = weights.map((w) => BigInt(Math.max(0, Math.round(w * 1_000_000))));
  const sum = scaled.reduce((a, b) => a + b, 0n);
  if (sum === 0n || weights.length === 0) return weights.map(() => 0n);

  const base = scaled.map((w) => (t * w) / sum);
  let remainder = t - base.reduce((a, b) => a + b, 0n);
  const order = scaled
    .map((w, i) => ({ i, rem: (t * w) % sum }))
    .sort((a, b) => (a.rem === b.rem ? a.i - b.i : a.rem > b.rem ? -1 : 1));
  for (let k = 0; remainder > 0n; k = (k + 1) % order.length) {
    base[order[k].i] += 1n;
    remainder -= 1n;
  }
  return base;
};

export const startOfMonth = (date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
