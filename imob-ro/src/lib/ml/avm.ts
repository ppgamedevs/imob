import {
  ADJ_CONDITION_BASE,
  ADJ_CONDITION_RANGE,
  ADJ_FLOOR_BASEMENT,
  ADJ_FLOOR_GOOD,
  ADJ_FLOOR_HIGH,
  ADJ_METRO_CLOSE,
  ADJ_METRO_FAR,
  ADJ_METRO_MEDIUM,
  ADJ_METRO_NORMAL,
  ADJ_YEAR_OLD,
  ADJ_YEAR_POST_1960,
  ADJ_YEAR_POST_1980,
  ADJ_YEAR_POST_2000,
  ADJ_YEAR_POST_2015,
  AVM_AREA_MAX,
  AVM_AREA_MIN,
  AVM_CITY_FALLBACK,
  AVM_DEFAULT_EUR_M2,
  AVM_FALLBACK_BASE_EUR_M2,
  AVM_SPREAD_BASE,
  AVM_SPREAD_MAX,
  AVM_SPREAD_MIN,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { slugifyRo } from "@/lib/geo";
import { clamp } from "@/lib/math";
import type { AvmResult, NormalizedFeatures } from "@/lib/types/pipeline";

export type AreaStats = {
  medianEurPerM2: number;
  count: number;
  ts?: string | number | Date;
};

function adjFloor(level?: number | null): number {
  if (level == null) return 1.0;
  if (level < 0) return ADJ_FLOOR_BASEMENT;
  if (level >= 1 && level <= 3) return ADJ_FLOOR_GOOD;
  return ADJ_FLOOR_HIGH;
}

function adjYear(year?: number | null): number {
  if (!year) return 1.0;
  if (year >= 2015) return ADJ_YEAR_POST_2015;
  if (year >= 2000) return ADJ_YEAR_POST_2000;
  if (year >= 1980) return ADJ_YEAR_POST_1980;
  if (year >= 1960) return ADJ_YEAR_POST_1960;
  return ADJ_YEAR_OLD;
}

function adjMetro(distMetroM?: number | null): number {
  if (distMetroM == null) return 1.0;
  if (distMetroM <= 300) return ADJ_METRO_CLOSE;
  if (distMetroM <= 600) return ADJ_METRO_MEDIUM;
  if (distMetroM <= 1000) return ADJ_METRO_NORMAL;
  return ADJ_METRO_FAR;
}

function adjCondition(score?: number | null): number {
  if (score == null) return 1.0;
  return ADJ_CONDITION_BASE + score * ADJ_CONDITION_RANGE;
}

function spreadFromConfidence(
  hasArea: boolean,
  hasMetro: boolean,
  hasCond: boolean,
  areaM2?: number | null,
): number {
  let spread = AVM_SPREAD_BASE;
  if (hasArea) spread -= 0.03;
  if (hasMetro) spread -= 0.02;
  if (hasCond) spread -= 0.02;
  if (areaM2 && areaM2 >= 35 && areaM2 <= 80) spread -= 0.02;
  return clamp(spread, AVM_SPREAD_MIN, AVM_SPREAD_MAX);
}

async function getAreaMedianEurM2(areaSlug?: string | null, city?: string | null): Promise<number> {
  if (areaSlug) {
    const row = await prisma.areaDaily.findFirst({
      where: { areaSlug },
      orderBy: { date: "desc" },
      select: { medianEurM2: true },
    });
    if (row?.medianEurM2) return row.medianEurM2;
  }
  if (city) {
    const key = slugifyRo(city);
    if (key && AVM_CITY_FALLBACK[key]) return AVM_CITY_FALLBACK[key];
  }
  return AVM_DEFAULT_EUR_M2;
}

export async function estimateAvm(features: NormalizedFeatures): Promise<AvmResult> {
  const { areaSlug, city, areaM2, level, yearBuilt, distMetroM, conditionScore, priceEur } =
    features;

  const medEurM2 = await getAreaMedianEurM2(areaSlug, city);
  const explain: Record<string, unknown> = {
    baselineEurM2: medEurM2,
    adjustments: {} as Record<string, number>,
  };

  if (!areaM2 || areaM2 < AVM_AREA_MIN || areaM2 > AVM_AREA_MAX) {
    return { low: null, high: null, mid: null, conf: 0, explain: { reason: "invalid_area" } };
  }

  const aFloor = adjFloor(level);
  const aYear = adjYear(yearBuilt);
  const aMetro = adjMetro(distMetroM);
  const aCond = adjCondition(conditionScore);

  (explain.adjustments as Record<string, number>).floor = aFloor;
  (explain.adjustments as Record<string, number>).year = aYear;
  (explain.adjustments as Record<string, number>).metro = aMetro;
  (explain.adjustments as Record<string, number>).condition = aCond;

  const eurM2 = medEurM2 * aFloor * aYear * aMetro * aCond;
  const mid = Math.round(eurM2 * areaM2);

  const spread = spreadFromConfidence(
    !!areaSlug,
    distMetroM != null,
    conditionScore != null,
    areaM2,
  );
  const low = Math.round(mid * (1 - spread));
  const high = Math.round(mid * (1 + spread));
  const conf = clamp(1 - (spread - AVM_SPREAD_MIN) / (AVM_SPREAD_MAX - AVM_SPREAD_MIN), 0, 1);

  explain.askingVsMid = priceEur ? (priceEur - mid) / (mid || 1) : null;

  return { low, high, mid, conf, explain };
}

/**
 * Grid-smoothed estimator with volatility adjustments.
 * Accepts area stats from one or more grid cells/time periods.
 */
export function estimatePriceRange(
  features: NormalizedFeatures,
  areaStats: AreaStats | AreaStats[],
): AvmResult {
  let base = AVM_FALLBACK_BASE_EUR_M2;
  let totalCount = 1;

  if (Array.isArray(areaStats)) {
    const weights = areaStats.map((_, i) => 1 / (i + 1));
    const totalW = weights.reduce((a, b) => a + b, 0);
    const weighted =
      areaStats.reduce((acc, s, i) => acc + (s.medianEurPerM2 || 0) * weights[i], 0) /
      Math.max(1, totalW);
    base = weighted || base;
    totalCount = areaStats.reduce((a, s) => a + (s.count || 0), 0) || 1;
  } else if (areaStats && typeof areaStats === "object") {
    base = areaStats.medianEurPerM2 ?? base;
    totalCount = areaStats.count ?? 1;
  }

  const area = Number(features.areaM2 ?? 50);
  let midEur = base * area;

  const floor = Number(features.level ?? 0);
  if (floor > 0) midEur *= 1 + Math.min(0.02 * floor, 0.15);

  const year = Number(features.yearBuilt ?? 0);
  if (year > 0) {
    const age = new Date().getFullYear() - year;
    if (age < 5) midEur *= 1.05;
    else if (age > 50) midEur *= 0.9;
  }

  const distMetro = Number(features.distMetroM ?? 0);
  if (distMetro > 0) midEur *= 1 - Math.min(distMetro / 2000, 0.2);

  const conf = Math.min(0.98, 0.2 + Math.log10(Math.max(1, totalCount)) * 0.18);
  const baseVol = 0.08 + (area < 50 ? 0.05 : 0);
  const scarcityFactor = 1 + Math.max(0, 1 - Math.min(1, totalCount / 10));
  const volatility = baseVol * scarcityFactor;

  return {
    low: Math.round(midEur * (1 - volatility)),
    high: Math.round(midEur * (1 + volatility)),
    mid: Math.round(midEur),
    conf,
    explain: { base, totalCount, volatility },
  };
}

export default estimatePriceRange;
