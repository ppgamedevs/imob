/* eslint-disable @typescript-eslint/no-explicit-any */
// AVM v1: baseline = median €/m2 în areaSlug (din AreaDaily de azi sau ultima zi disponibilă)
// Interval = [mid*(1 - spread), mid*(1 + spread)] unde spread scade când avem features bune.
// Adjustări multiplicative simple pentru etaj, an, distanță metrou, condiție.

import { prisma } from "@/lib/db";
import type { NormalizedFeatures } from "@/types/analysis";

type AvmResult = {
  low: number | null;
  high: number | null;
  mid: number | null;
  conf: number; // 0..1
  explain: Record<string, any>;
};

const DEFAULT_MED_EUR_M2 = 1800; // fallback București v0
const CITY_FALLBACK: Record<string, number> = {
  bucuresti: 1800,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function adjFloor(level?: number | null) {
  if (level == null) return 1.0;
  if (level < 0) return 0.97; // parter/demisol
  if (level >= 1 && level <= 3) return 1.02; // etaje bune
  return 0.99; // etaje înalte (lift incert, zgomot lift/terasa)
}

function adjYear(year?: number | null) {
  if (!year) return 1.0;
  if (year >= 2015) return 1.05;
  if (year >= 2000) return 1.03;
  if (year >= 1980) return 1.0;
  if (year >= 1960) return 0.98;
  return 0.95; // foarte vechi
}

function adjMetro(distMetroM?: number | null) {
  if (distMetroM == null) return 1.0;
  if (distMetroM <= 300) return 1.05;
  if (distMetroM <= 600) return 1.02;
  if (distMetroM <= 1000) return 1.0;
  return 0.97;
}

function adjCondition(score?: number | null) {
  // score 0..1: 0 = renovare, 1 = modern
  if (score == null) return 1.0;
  return 0.95 + score * 0.1; // [0.95 .. 1.05]
}

function spreadFromConfidence(
  hasArea: boolean,
  hasMetro: boolean,
  hasCond: boolean,
  areaM2?: number | null,
) {
  // Spread procentual al intervalului: mic când avem features bune și mărime rezonabilă
  let spread = 0.12; // 12%
  if (hasArea) spread -= 0.03;
  if (hasMetro) spread -= 0.02;
  if (hasCond) spread -= 0.02;
  if (areaM2 && areaM2 >= 35 && areaM2 <= 80) spread -= 0.02;
  return clamp(spread, 0.06, 0.18);
}

async function getAreaMedianEurM2(areaSlug?: string | null, city?: string | null) {
  if (areaSlug) {
    const row = await prisma.areaDaily.findFirst({
      where: { areaSlug },
      orderBy: { date: "desc" },
      select: { medianEurM2: true },
    });
    if (row?.medianEurM2) return row.medianEurM2;
  }
  if (city) {
    const key = city
      .normalize("NFD")
      .replace(/[00-\u036f]/g, "")
      .toLowerCase();
    if (CITY_FALLBACK[key]) return CITY_FALLBACK[key];
  }
  return DEFAULT_MED_EUR_M2;
}

export async function estimateAvm(features: NormalizedFeatures): Promise<AvmResult> {
  const { areaSlug, city, areaM2, level, yearBuilt, distMetroM, conditionScore, priceEur } =
    features;

  const medEurM2 = await getAreaMedianEurM2(areaSlug, city);
  const explain: Record<string, any> = {
    baselineEurM2: medEurM2,
    adjustments: {} as Record<string, number>,
  };

  if (!areaM2 || areaM2 < 8 || areaM2 > 1000) {
    return { low: null, high: null, mid: null, conf: 0, explain: { reason: "invalid_area" } };
  }

  // multiplicative adjustments
  const aFloor = adjFloor(level);
  const aYear = adjYear(yearBuilt);
  const aMetro = adjMetro(distMetroM);
  const aCond = adjCondition(conditionScore);

  explain.adjustments.floor = aFloor;
  explain.adjustments.year = aYear;
  explain.adjustments.metro = aMetro;
  explain.adjustments.condition = aCond;

  const eurM2 = medEurM2 * aFloor * aYear * aMetro * aCond;
  const midRaw = eurM2 * areaM2;
  const mid = Math.round(midRaw);

  const spread = spreadFromConfidence(
    !!areaSlug,
    distMetroM != null,
    conditionScore != null,
    areaM2,
  );
  const low = Math.round(mid * (1 - spread));
  const high = Math.round(mid * (1 + spread));

  // conf euristic: opusul spread-ului
  const conf = clamp(1 - (spread - 0.06) / (0.18 - 0.06), 0, 1); // 0.06->1.0, 0.18->0.0

  // Semnal pentru badge (nu scriem badge aici, doar informăm)
  explain.askingVsMid = priceEur ? (priceEur - mid) / (mid || 1) : null;

  return { low, high, mid, conf, explain };
}
/**
 * AVM v1+ estimator with simple grid smoothing and volatility adjustments.
 * estimatePriceRange(features, areaStats|areaStats[]) -> { low, high, mid, conf }
 * areaStats can be a single object or an array (recent grid cells / timeseries).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type AreaStats = {
  medianEurPerM2: number;
  count: number;
  ts?: string | number | Date;
};

export function estimatePriceRange(features: unknown, areaStats: AreaStats | AreaStats[]) {
  // Derive base €/m2 from either the single stats or a weighted average of recent stats
  let base = 1500;
  let totalCount = 1;
  if (Array.isArray(areaStats)) {
    // Weight recent entries slightly more: weight = 1/(index+1)
    const weights = areaStats.map((_, i) => 1 / (i + 1));
    const totalW = weights.reduce((a, b) => a + b, 0);
    const weighted =
      areaStats.reduce((acc, s, i) => acc + (s.medianEurPerM2 || 0) * weights[i], 0) /
      Math.max(1, totalW);
    base = weighted || base;
    totalCount = areaStats.reduce((a, s) => a + (s.count || 0), 0) || 1;
  } else if (areaStats && typeof areaStats === "object") {
    base = (areaStats as AreaStats).medianEurPerM2 ?? base;
    totalCount = (areaStats as AreaStats).count ?? 1;
  }

  const f = features as any;
  const area = Number(f?.area_m2 ?? f?.areaM2 ?? 50);

  // Base mid price
  let midEur = base * area;

  // Adjust for floor: higher floor -> small premium, with diminishing returns
  const floor = Number(f?.floor ?? 0);
  if (floor > 0) midEur *= 1 + Math.min(0.02 * floor, 0.15);

  // Adjust for year built: newer -> premium, older -> discount
  const year = Number(f?.year_built ?? f?.yearBuilt ?? 0);
  if (year > 0) {
    const age = new Date().getFullYear() - year;
    if (age < 5) midEur *= 1.05;
    else if (age > 50) midEur *= 0.9;
  }

  // Photo condition adjustments
  const photoCondition = f?.photo_condition ?? "unknown";
  if (photoCondition === "poor") midEur *= 0.95;
  if (photoCondition === "excellent") midEur *= 1.05;

  // Distance to metro: simple linear penalty up to 20% at 2km
  const distMetro = Number(f?.dist_to_metro ?? f?.distMetrou ?? 0);
  if (distMetro > 0) midEur *= 1 - Math.min(distMetro / 2000, 0.2);

  // Confidence based on sample count: log scale with clamp
  const conf = Math.min(0.98, 0.2 + Math.log10(Math.max(1, totalCount)) * 0.18);

  // Volatility: depends on area and totalCount (less data -> larger spread)
  const baseVol = 0.08 + (area < 50 ? 0.05 : 0);
  const scarcityFactor = 1 + Math.max(0, 1 - Math.min(1, totalCount / 10));
  const volatility = baseVol * scarcityFactor;

  // Final interval
  const low = Math.round(midEur * (1 - volatility));
  const high = Math.round(midEur * (1 + volatility));

  return {
    low,
    high,
    mid: Math.round(midEur),
    conf,
  };
}

export default estimatePriceRange;
