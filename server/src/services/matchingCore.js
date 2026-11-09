/**
 * Deterministic NGO eligibility + scoring. Pure functions (no I/O) so they are
 * easy to test. The LLM never decides eligibility or scores.
 *
 * Score weights (spec): cause relevance 40%, donor preferences 25%,
 * impact/reporting quality 20%, capacity & minimum-donation fit 15%.
 */
export const WEIGHTS = { cause: 0.4, preference: 0.25, impact: 0.2, capacity: 0.15 };

export const ELIGIBLE = "ELIGIBLE";

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/**
 * @param ngo  { id, name, status, userActive, causes:[{id,name,slug}], minimumDonationPaise, reportStats }
 * @param ctx  { allowedCauseIds:Set, excludedCauseIds:Set, preferredNgoIds:Set, favoriteNgoIds:Set,
 *               preferredCauseIds:Set, allowAnyCause:boolean, focusCauseIds:Set|null,
 *               requestedPaise:bigint, maxPerNgoPaise:bigint|null, donorMinPaise:bigint }
 */
export const evaluateNgo = (ngo, ctx) => {
  const reasons = [];
  const causeIds = ngo.causes.map((c) => c.id);
  const matchedCauses = ngo.causes.filter((c) => {
    if (ctx.focusCauseIds && ctx.focusCauseIds.size) return ctx.focusCauseIds.has(c.id);
    if (ctx.allowedCauseIds.size) return ctx.allowedCauseIds.has(c.id);
    return false;
  });

  let eligibilityStatus = ELIGIBLE;
  const fail = (status, text) => {
    if (eligibilityStatus === ELIGIBLE) eligibilityStatus = status;
    reasons.push(text);
  };

  if (ngo.status !== "VERIFIED") fail("INELIGIBLE_NOT_VERIFIED", "NGO is not verified");
  if (!ngo.userActive) fail("INELIGIBLE_INACTIVE", "NGO account is not active");
  if (!causeIds.length) fail("INELIGIBLE_NO_CAUSES", "NGO has not listed any causes");

  const excluded = ngo.causes.filter((c) => ctx.excludedCauseIds.has(c.id));
  if (excluded.length) {
    fail("INELIGIBLE_EXCLUDED_CAUSE", `Works on a cause you excluded (${excluded.map((c) => c.name).join(", ")})`);
  }

  const restrictToCauses = !ctx.allowAnyCause || (ctx.focusCauseIds && ctx.focusCauseIds.size > 0);
  if (restrictToCauses && matchedCauses.length === 0 && !ctx.preferredNgoIds.has(ngo.id)) {
    fail("INELIGIBLE_NO_CAUSE_MATCH", "Does not work on any cause you authorized");
  }
  // A named preferred NGO still must respect cause exclusions and verification (checked above).

  const cap = ctx.maxPerNgoPaise ?? ctx.requestedPaise;
  const effectiveCap = cap < ctx.requestedPaise ? cap : ctx.requestedPaise;
  const floor = (ngo.minimumDonationPaise ?? 0n) > ctx.donorMinPaise ? (ngo.minimumDonationPaise ?? 0n) : ctx.donorMinPaise;
  if (floor > effectiveCap) {
    fail("INELIGIBLE_MIN_DONATION", "Minimum donation is higher than the amount you can give this NGO");
  }

  // ---- scoring components (0..1) ----
  let cause = 0;
  const focusSize = ctx.focusCauseIds?.size || ctx.allowedCauseIds.size;
  if (focusSize === 0 && ctx.allowAnyCause) cause = 0.5;
  else if (focusSize > 0) cause = clamp01(matchedCauses.length / Math.max(1, Math.min(focusSize, ngo.causes.length || 1)));

  let preference = 0;
  if (ctx.preferredNgoIds.has(ngo.id)) preference = 1;
  else if (ctx.favoriteNgoIds.has(ngo.id)) preference = 0.7;
  else if (ngo.causes.some((c) => ctx.preferredCauseIds.has(c.id))) preference = 0.5;

  const rs = ngo.reportStats || { submitted: 0, reviewed: 0, verified: 0, withEvidence: 0 };
  const impact = clamp01(
    (rs.verified > 0 ? 0.5 : 0) +
      (rs.reviewed > 0 ? 0.3 : 0) +
      Math.min(rs.submitted, 3) * 0.1 +
      (rs.withEvidence > 0 ? 0.2 : 0)
  );

  const ref = effectiveCap > 0n ? effectiveCap : 1n;
  const minFloor = ngo.minimumDonationPaise ?? 0n;
  const capacity = clamp01(1 - Number((minFloor * 1000n) / ref) / 1000);

  const components = { cause, preference, impact, capacity };
  const matchScore =
    Math.round(
      100 *
        (WEIGHTS.cause * cause +
          WEIGHTS.preference * preference +
          WEIGHTS.impact * impact +
          WEIGHTS.capacity * capacity) *
        10
    ) / 10;

  if (eligibilityStatus === ELIGIBLE) {
    reasons.push(
      matchedCauses.length
        ? `Matches your causes: ${matchedCauses.map((c) => c.name).join(", ")}`
        : "Eligible under your 'any cause' setting"
    );
  }

  return {
    ngoId: ngo.id,
    ngoName: ngo.name,
    matchScore,
    matchedCauses: matchedCauses.map((c) => c.name),
    eligibilityStatus,
    eligible: eligibilityStatus === ELIGIBLE,
    components,
    ruleReasons: reasons,
    minimumDonationPaise: ngo.minimumDonationPaise ?? 0n,
  };
};
