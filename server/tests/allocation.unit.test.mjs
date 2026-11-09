import { test } from "node:test";
import assert from "node:assert/strict";
import { allocateFunds } from "../src/services/allocationEngine.js";
import { evaluateNgo } from "../src/services/matchingCore.js";
import { rupeesToPaise, splitByWeights } from "../src/utils/money.js";

const c = (id, s, min = 0n) => ({ ngoId: id, matchScore: s, minimumDonationPaise: min });

test("money parsing uses integers only", () => {
  assert.equal(rupeesToPaise("1250.50"), 125050n);
  assert.equal(rupeesToPaise("0.07"), 7n);
  assert.equal(rupeesToPaise(10), 1000n);
  for (const bad of ["-1", "1e3", "1.234", "", "abc", "99999999999999"]) assert.throws(() => rupeesToPaise(bad), bad);
});

test("splitByWeights always sums exactly to the total", () => {
  for (let i = 0; i < 300; i++) {
    const total = BigInt(1 + Math.floor(Math.random() * 1e7));
    const w = Array.from({ length: 1 + Math.floor(Math.random() * 6) }, () => Math.random() * 100 + 0.1);
    assert.equal(splitByWeights(total, w).reduce((a, b) => a + b, 0n), total);
  }
});

test("allocation respects totals, caps, floors, max NGO count (property test)", () => {
  for (let i = 0; i < 1000; i++) {
    const n = 1 + Math.floor(Math.random() * 6);
    const amt = BigInt(100 + Math.floor(Math.random() * 5e6));
    const donorMin = BigInt(Math.floor(Math.random() * 500));
    const cs = Array.from({ length: n }, (_, k) => c("n" + k, Math.random() * 100, BigInt(Math.floor(Math.random() * 3000))));
    const cap = Math.random() < 0.5 ? BigInt(1000 + Math.floor(Math.random() * 2e6)) : null;
    const maxNgos = 1 + Math.floor(Math.random() * 4);
    const x = allocateFunds({ requestedPaise: amt, candidates: cs, maxNgos, maxPerNgoPaise: cap, donorMinPaise: donorMin });
    assert.equal(x.totalPaise + x.unallocatedPaise, amt);
    assert.ok(x.allocations.length <= maxNgos);
    for (const a of x.allocations) {
      const ngo = cs.find((k) => k.ngoId === a.ngoId);
      assert.ok(a.amountPaise > 0n);
      assert.ok(a.amountPaise >= (ngo.minimumDonationPaise > donorMin ? ngo.minimumDonationPaise : donorMin));
      if (cap) assert.ok(a.amountPaise <= cap);
    }
  }
});

test("no candidates / no budget → empty allocation with a message", () => {
  assert.equal(allocateFunds({ requestedPaise: 1000n, candidates: [], maxNgos: 3 }).allocations.length, 0);
  assert.equal(allocateFunds({ requestedPaise: 1000n, maxTotalPaise: 0n, candidates: [c("a", 5)], maxNgos: 3 }).allocations.length, 0);
});

const ngo = (o = {}) => ({ id: "n1", name: "N", status: "VERIFIED", userActive: true, minimumDonationPaise: 0n, causes: [{ id: "c1", name: "Education", slug: "education" }], reportStats: { submitted: 0, reviewed: 0, verified: 0, withEvidence: 0 }, ...o });
const ctx = (o = {}) => ({ allowedCauseIds: new Set(["c1"]), excludedCauseIds: new Set(), preferredNgoIds: new Set(), favoriteNgoIds: new Set(), preferredCauseIds: new Set(["c1"]), allowAnyCause: false, focusCauseIds: null, requestedPaise: 100000n, maxPerNgoPaise: null, donorMinPaise: 0n, ...o });

test("eligibility rules: verification, activity, causes, exclusions, minimums", () => {
  assert.equal(evaluateNgo(ngo(), ctx()).eligible, true);
  assert.equal(evaluateNgo(ngo({ status: "SUBMITTED" }), ctx()).eligibilityStatus, "INELIGIBLE_NOT_VERIFIED");
  assert.equal(evaluateNgo(ngo({ userActive: false }), ctx()).eligibilityStatus, "INELIGIBLE_INACTIVE");
  assert.equal(evaluateNgo(ngo(), ctx({ excludedCauseIds: new Set(["c1"]) })).eligibilityStatus, "INELIGIBLE_EXCLUDED_CAUSE");
  assert.equal(evaluateNgo(ngo(), ctx({ allowedCauseIds: new Set(["c9"]), preferredCauseIds: new Set() })).eligibilityStatus, "INELIGIBLE_NO_CAUSE_MATCH");
  assert.equal(evaluateNgo(ngo({ minimumDonationPaise: 500000n }), ctx()).eligibilityStatus, "INELIGIBLE_MIN_DONATION");
  assert.equal(evaluateNgo(ngo(), ctx({ allowedCauseIds: new Set(), preferredCauseIds: new Set(), allowAnyCause: true })).eligible, true);
});

test("scoring weights: verified reporting and preferences raise the score", () => {
  const base = evaluateNgo(ngo(), ctx()).matchScore;
  const reported = evaluateNgo(ngo({ reportStats: { submitted: 2, reviewed: 1, verified: 1, withEvidence: 1 } }), ctx()).matchScore;
  const preferred = evaluateNgo(ngo(), ctx({ preferredNgoIds: new Set(["n1"]) })).matchScore;
  assert.ok(reported > base && preferred > base);
  assert.ok(evaluateNgo(ngo(), ctx()).matchScore <= 100);
});
