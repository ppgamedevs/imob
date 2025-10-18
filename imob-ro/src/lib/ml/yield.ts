/**
 * Yield estimator (v1)
 * - estimateRent(features, compsRent): returns median EUR/m2/month (or null)
 * - computeYield(priceEur, rentPerMonthEur, capex): returns { yieldGross, yieldNet, verdict }
 *
 * Simple heuristics:
 * - estimateRent: prefer explicit comps rent array (in EUR/m2), otherwise fall back to features.estimated_rent_m2
 * - computeYield: gross yield = (rentPerMonth * 12) / priceEur
 *   net yield subtracts capex (one-off adjusted across first-year allowance): net = (rent*12 - capex) / price
 * - verdict: 'ok' if netYield >= 0.06, 'mediocre' if >= 0.035, else 'slab'
 */

export function estimateRent(features: unknown, compsRent: Array<number> | null) {
  // compsRent expected as array of EUR/m2/month values
  if (Array.isArray(compsRent) && compsRent.length > 0) {
    const sorted = compsRent.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[mid];
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // fallback to feature-provided value (expected EUR/m2/month)
  let fallback: number | null = null;
  if (features && typeof features === "object") {
    const f = features as Record<string, unknown>;
    const val = (f.estimated_rent_m2 ?? f.rent_m2) as unknown;
    if (typeof val === "number" && !Number.isNaN(val)) fallback = val;
  }
  if (fallback !== null) return fallback;

  return null;
}

export type YieldResult = {
  yieldGross: number; // decimal, e.g., 0.06
  yieldNet: number;
  verdict: "ok" | "mediocre" | "slab";
};

export function computeYield(
  priceEur: number,
  rentPerMonthEur: number,
  capex: number = 0,
): YieldResult {
  const rentAnnual = rentPerMonthEur * 12;
  const yieldGross = priceEur > 0 ? rentAnnual / priceEur : 0;

  // amortize capex over first year impact (conservative) => subtract full capex in year 1
  const yieldNet = priceEur > 0 ? (rentAnnual - capex) / priceEur : 0;

  let verdict: YieldResult["verdict"] = "slab";
  if (yieldNet >= 0.06) verdict = "ok";
  else if (yieldNet >= 0.035) verdict = "mediocre";

  return { yieldGross, yieldNet, verdict };
}

// Named exports only to avoid anonymous default export lint warnings
