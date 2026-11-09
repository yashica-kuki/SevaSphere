import { spawn } from "node:child_process";
import http from "node:http";

export const PORT = Number(process.env.TEST_PORT || 5056);
export const PAYPAL_MOCK_PORT = 5099;
export const BASE = `http://localhost:${PORT}`;

export class Client {
  constructor() { this.cookie = ""; }
  async req(method, path, body, { raw = false, headers = {} } = {}) {
    const res = await fetch(BASE + path, {
      method,
      headers: { ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}), ...headers },
      body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) { const kv = c.split(";")[0]; if (kv.endsWith("=")) this.cookie = ""; else this.cookie = kv; }
    if (raw) return res;
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = { text }; }
    return { status: res.status, body: json };
  }
  get(p, o) { return this.req("GET", p, null, o); }
  post(p, b, o) { return this.req("POST", p, b ?? {}, o); }
  put(p, b) { return this.req("PUT", p, b); }
  patch(p, b) { return this.req("PATCH", p, b); }
  del(p) { return this.req("DELETE", p); }
  async login(email, password) {
    const r = await this.post("/api/auth/login", { email, password });
    if (r.status !== 200) throw new Error(`login failed ${email}: ${r.status}`);
    return r.body.user;
  }
}

export const uniqueEmail = (p) => `${p}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@test.local`;
export const key = () => `k-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** Minimal PayPal Orders mock (sandbox is unreachable from CI). Behaviour is steered by the order amount. */
export const startPaypalMock = () => {
  const orders = new Map();
  const server = http.createServer((req, res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
      if (req.url === "/v1/oauth2/token") return send(200, { access_token: "mock-token", expires_in: 3600 });
      if (req.method === "POST" && req.url === "/v2/checkout/orders") {
        const body = JSON.parse(data);
        const id = "ORDER" + Math.random().toString(36).slice(2, 12).toUpperCase();
        orders.set(id, { id, status: "CREATED", amount: body.purchase_units[0].amount, captured: null });
        return send(201, { id, status: "CREATED" });
      }
      const m = req.url.match(/^\/v2\/checkout\/orders\/([^/]+)(\/capture)?$/);
      if (m) {
        const o = orders.get(m[1]);
        if (!o) return send(404, { name: "RESOURCE_NOT_FOUND" });
        if (req.method === "POST") {
          if (o.captured) return send(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_ALREADY_CAPTURED" }] });
          if (o.amount.value === "13.00") return send(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "INSTRUMENT_DECLINED" }] });
          const value = o.amount.value === "14.00" ? "1.00" : o.amount.value; // tampered amount scenario
          o.status = "COMPLETED";
          o.captured = { id: "CAP" + o.id, status: "COMPLETED", amount: { currency_code: o.amount.currency_code, value } };
        }
        return send(200, { id: o.id, status: o.status, purchase_units: [{ payments: { captures: o.captured ? [o.captured] : [] } }] });
      }
      send(404, {});
    });
  });
  return new Promise((r) => server.listen(PAYPAL_MOCK_PORT, () => r(server)));
};

export const startServer = async () => {
  const child = spawn("node", ["src/server.js"], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "test", SCHEDULER_ENABLED: "false", GEMINI_API_KEY: "",
      PAYPAL_CLIENT_ID: "mock-client", PAYPAL_CLIENT_SECRET: "mock-secret", PAYPAL_MODE: "sandbox", PAYPAL_API_BASE: `http://localhost:${PAYPAL_MOCK_PORT}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 60; i += 1) {
    try { const r = await fetch(`${BASE}/api/health`); if (r.ok) return { child, log: () => log }; } catch { /* waiting */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill();
  throw new Error("Server did not start:\n" + log);
};
