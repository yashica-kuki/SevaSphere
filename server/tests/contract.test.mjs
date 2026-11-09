// Crawls every GET endpoint the React client calls, per role, with AG Grid style parameters.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Client, startServer } from "./helpers.mjs";
import { prisma } from "../src/config/prisma.js";

let server;
before(async () => { server = await startServer(); });
after(async () => { server?.child.kill(); await prisma.$disconnect(); });

const grid = (p) => `${p}${p.includes("?") ? "&" : "?"}startRow=0&endRow=10&sortModel=${encodeURIComponent(JSON.stringify([]))}&filterModel=${encodeURIComponent("{}")}`;

const ENDPOINTS = {
  "donor2@sevakarma.demo|Donor@12345": [
    "/api/auth/me", "/api/donor/dashboard", "/api/donor/profile", "/api/donor/preferences", "/api/donor/causes", "/api/donor/ngos?limit=30", "/api/donor/policy",
    "/api/donor/wallet", "/api/donor/schedules", "/api/donor/schedules/events", "/api/donor/ambassador", "/api/donor/agent/executions",
    "/api/donor/paypal/config", "/api/donor/paypal/payments", "/api/enquiries",
    grid("/api/donor/grids/donations"), grid("/api/donor/grids/wallet"), grid("/api/donor/grids/allocations"),
  ],
  "annapurna@sevakarma.demo|NGO@12345": [
    "/api/ngo/profile", "/api/ngo/verification", "/api/ngo/analytics", "/api/ngo/impact-reports/allocations", "/api/ngo/causes", "/api/ngo/initiatives",
    grid("/api/ngo/grids/donations"), grid("/api/ngo/grids/payouts"), grid("/api/ngo/grids/impact-reports"),
  ],
  "admin@sevakarma.demo|Admin@12345": [
    "/api/admin/dashboard", "/api/admin/ngo-verifications",
    ...["users", "verifications", "donations", "payments", "audit-logs", "executions", "impact-reports", "enquiries", "payouts"].map((g) => grid(`/api/admin/grids/${g}`)),
  ],
};

for (const [cred, paths] of Object.entries(ENDPOINTS)) {
  const [email, pw] = cred.split("|");
  test(`${email.split("@")[0]}: every client GET endpoint responds 200 with success`, async () => {
    const c = new Client(); await c.login(email, pw);
    for (const p of paths) {
      const r = await c.get(p);
      assert.equal(r.status, 200, `${p} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
      assert.notEqual(r.body.success, false, p);
      if (p.includes("/grids/")) { assert.ok(Array.isArray(r.body.rows) && typeof r.body.total === "number", `${p} grid shape`); for (const row of r.body.rows) assert.ok(row.id, `${p} rows need id`); }
    }
  });
}

test("every grid supports CSV export and an invalid filter model is a 400", async () => {
  const admin = new Client(); await admin.login("admin@sevakarma.demo", "Admin@12345");
  for (const g of ["users", "verifications", "donations", "payments", "audit-logs", "executions", "impact-reports", "enquiries", "payouts"]) {
    const r = await admin.get(`/api/admin/grids/${g}?format=csv`, { raw: true });
    assert.equal(r.status, 200, g); assert.match(r.headers.get("content-type"), /csv/);
    assert.equal((await admin.get(`/api/admin/grids/${g}?filterModel=%7B`)).status, 400, g);
  }
});
