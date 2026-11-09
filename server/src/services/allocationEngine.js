import { splitByWeights } from "../utils/money.js";

/**
 * Deterministic allocation. Integer paise only; the result always sums to
 * `totalPaise` exactly (largest-remainder rounding).
 *
 * @param {object} p
 * @param {bigint} p.requestedPaise
 * @param {bigint|null} p.maxTotalPaise    cap for this run (budget remaining, per-run limit)
 * @param {Array<{ngoId,matchScore,minimumDonationPaise}>} p.candidates  ELIGIBLE NGOs only
 * @param {number} p.maxNgos
 * @param {bigint|null} p.maxPerNgoPaise
 * @param {bigint} p.donorMinPaise
 */
export const allocateFunds = ({
  requestedPaise,
  maxTotalPaise = null,
  candidates,
  maxNgos,
  maxPerNgoPaise = null,
  donorMinPaise = 0n,
}) => {
  const total = maxTotalPaise !== null && maxTotalPaise < requestedPaise ? maxTotalPaise : requestedPaise;
  const empty = (message) => ({
    allocations: [],
    totalPaise: 0n,
    unallocatedPaise: total > 0n ? total : 0n,
    message,
  });

  if (total <= 0n) return empty("No budget is available for this donation.");
  if (!candidates.length) return empty("No eligible NGO matches your authorized causes and limits.");

  const prepared = candidates
    .map((c) => {
      const floor = (c.minimumDonationPaise ?? 0n) > donorMinPaise ? c.minimumDonationPaise : donorMinPaise;
      const cap = maxPerNgoPaise !== null && maxPerNgoPaise < total ? maxPerNgoPaise : total;
      return { ...c, floor, cap, weight: Math.max(c.matchScore, 1) };
    })
    .filter((c) => c.floor <= c.cap)
    .sort((a, b) => (b.matchScore === a.matchScore ? (a.ngoId < b.ngoId ? -1 : 1) : b.matchScore - a.matchScore))
    .slice(0, Math.max(1, maxNgos));

  if (!prepared.length) {
    return empty("No eligible NGO can accept a donation within your minimum and maximum limits.");
  }

  let pool = prepared;
  while (pool.length) {
    // Water-filling: split by score weights, respecting each NGO's cap.
    const assigned = pool.map(() => 0n);
    let remaining = total;
    let active = pool.map((_, i) => i);
    while (active.length && remaining > 0n) {
      const split = splitByWeights(remaining, active.map((i) => pool[i].weight));
      const capped = [];
      active.forEach((idx, k) => {
        if (assigned[idx] + split[k] > pool[idx].cap) capped.push(idx);
      });
      if (!capped.length) {
        active.forEach((idx, k) => (assigned[idx] += split[k]));
        remaining = 0n;
        break;
      }
      for (const idx of capped) {
        const room = pool[idx].cap - assigned[idx];
        assigned[idx] += room;
        remaining -= room;
      }
      active = active.filter((i) => !capped.includes(i));
    }

    const belowFloor = pool.findIndex((c, i) => assigned[i] > 0n && assigned[i] < c.floor);
    if (belowFloor === -1) {
      const allocations = pool
        .map((c, i) => ({ ngoId: c.ngoId, amountPaise: assigned[i], matchScore: c.matchScore }))
        .filter((a) => a.amountPaise > 0n);
      const totalPaise = allocations.reduce((s, a) => s + a.amountPaise, 0n);
      if (!allocations.length) return empty("No eligible NGO can accept this donation.");
      return {
        allocations,
        totalPaise,
        unallocatedPaise: total - totalPaise,
        message:
          total - totalPaise > 0n
            ? "Part of the amount was not allocated because per-NGO limits were reached."
            : "Allocated in full.",
      };
    }
    // Drop the lowest-scoring NGO and retry (pool is sorted by score desc).
    pool = pool.slice(0, pool.length - 1);
  }
  return empty("The amount is too small to meet the minimum donation of eligible NGOs.");
};
