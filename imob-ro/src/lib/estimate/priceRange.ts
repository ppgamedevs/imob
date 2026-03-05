/**
 * Price range computation - shared between /report and /api/estimate.
 *
 * Pure functions only (no DB calls).
 */

import { filterOutliersIQR, median, percentile } from "@/lib/math";

import type { ScoredComp } from "./findComparables";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EurM2Stats {
  medianEurM2: number;
  q1EurM2: number | null;
  q3EurM2: number | null;
  dispersion: number;
  valuesUsed: number;
  cleanValues: number[];
}

export interface FairPriceResult {
  fairMin: number;
  fairMax: number;
  fairMid: number;
  medianEurM2: number;
  q1EurM2: number | null;
  q3EurM2: number | null;
  confidence: { level: "high" | "medium" | "low"; score: number };
  dispersion: number;
  compsUsed: number;
  comps: ScoredComp[];
  eurM2Values: number[];
}

export interface SpreadRangeResult {
  fairLikely: number;
  range80: { min: number; max: number };
  range95: { min: number; max: number };
}

export const BUCHAREST_FALLBACK_EUR_M2 = 1450;

// ---------------------------------------------------------------------------
// EUR/m² statistics (pure)
// ---------------------------------------------------------------------------

export function computeEurM2Stats(eurM2Values: number[]): EurM2Stats {
  if (eurM2Values.length === 0) {
    return {
      medianEurM2: 0,
      q1EurM2: null,
      q3EurM2: null,
      dispersion: 1,
      valuesUsed: 0,
      cleanValues: [],
    };
  }

  const { filtered } = filterOutliersIQR(eurM2Values);
  const values = filtered.length >= 3 ? filtered : eurM2Values;

  const medianVal = median(values) ?? 0;
  const q1 = percentile(values, 25);
  const q3 = percentile(values, 75);

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  const cov = mean > 0 ? Math.sqrt(variance) / mean : 1;

  return {
    medianEurM2: Math.round(medianVal),
    q1EurM2: q1 != null ? Math.round(q1) : null,
    q3EurM2: q3 != null ? Math.round(q3) : null,
    dispersion: Math.round(cov * 100) / 100,
    valuesUsed: values.length,
    cleanValues: values.sort((a, b) => a - b),
  };
}

// ---------------------------------------------------------------------------
// IQR-based fair price range (used by /report)
// ---------------------------------------------------------------------------

const EMPTY_FAIR: FairPriceResult = {
  fairMin: 0,
  fairMax: 0,
  fairMid: 0,
  medianEurM2: 0,
  q1EurM2: null,
  q3EurM2: null,
  confidence: { level: "low", score: 5 },
  dispersion: 1,
  compsUsed: 0,
  comps: [],
  eurM2Values: [],
};

export function computeFairRange(comps: ScoredComp[], subjectAreaM2: number): FairPriceResult {
  if (comps.length === 0 || subjectAreaM2 <= 0) return { ...EMPTY_FAIR };

  const stats = computeEurM2Stats(comps.map((c) => c.eurM2));

  const fairMinEurM2 = stats.q1EurM2 ?? stats.medianEurM2 * 0.92;
  const fairMaxEurM2 = stats.q3EurM2 ?? stats.medianEurM2 * 1.08;

  const fairMin = Math.round(Math.max(0, fairMinEurM2) * subjectAreaM2);
  const fairMax = Math.round(fairMaxEurM2 * subjectAreaM2);
  const fairMid = Math.round(stats.medianEurM2 * subjectAreaM2);

  let confScore = 0;
  if (stats.valuesUsed >= 8) confScore += 50;
  else if (stats.valuesUsed >= 5) confScore += 35;
  else if (stats.valuesUsed >= 3) confScore += 20;
  else confScore += stats.valuesUsed * 5;

  if (stats.dispersion < 0.1) confScore += 30;
  else if (stats.dispersion < 0.2) confScore += 20;
  else if (stats.dispersion < 0.3) confScore += 10;

  const tightCount = comps.filter((c) => c.matchType === "tight").length;
  confScore += Math.round((tightCount / Math.max(1, comps.length)) * 20);
  confScore = Math.min(100, confScore);

  const confLevel: "high" | "medium" | "low" =
    confScore >= 65 ? "high" : confScore >= 35 ? "medium" : "low";

  return {
    fairMin,
    fairMax,
    fairMid,
    medianEurM2: stats.medianEurM2,
    q1EurM2: stats.q1EurM2,
    q3EurM2: stats.q3EurM2,
    confidence: { level: confLevel, score: confScore },
    dispersion: stats.dispersion,
    compsUsed: stats.valuesUsed,
    comps,
    eurM2Values: stats.cleanValues,
  };
}

// ---------------------------------------------------------------------------
// Spread-based ranges (used by /api/estimate)
// ---------------------------------------------------------------------------

export function computeSpreadRanges(
  medianEurM2: number,
  area: number,
  dispersion: number,
  confidence: number,
  adjTotalPct: number,
): SpreadRangeResult {
  const base = medianEurM2 * (1 + adjTotalPct / 100) * area;
  const likely = Math.round(base);

  let spread80: number;
  let spread95: number;

  if (confidence >= 75 && dispersion < 0.15) {
    spread80 = 0.06;
    spread95 = 0.12;
  } else if (confidence >= 50 && dispersion < 0.25) {
    spread80 = 0.1;
    spread95 = 0.18;
  } else if (confidence >= 30) {
    spread80 = 0.15;
    spread95 = 0.25;
  } else {
    spread80 = 0.22;
    spread95 = 0.35;
  }

  if (dispersion > 0.3) {
    spread80 = Math.max(spread80, 0.18);
    spread95 = Math.max(spread95, 0.3);
  }

  return {
    fairLikely: likely,
    range80: {
      min: Math.round(likely * (1 - spread80)),
      max: Math.round(likely * (1 + spread80)),
    },
    range95: {
      min: Math.round(likely * (1 - spread95)),
      max: Math.round(likely * (1 + spread95)),
    },
  };
}
