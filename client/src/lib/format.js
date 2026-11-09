export const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(Number(n) || 0);
export const inrFromAmount = (a) => inr(a?.rupees ?? 0);
export const usd = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n) || 0);
export const dateTime = (d) => (d ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d)) : "—");
export const dateOnly = (d) => (d ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(d)) : "—");
export const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`);
export const title = (s) => String(s ?? "").replaceAll("_", " ").toLowerCase().replace(/^\w|\s\w/g, (m) => m.toUpperCase());
