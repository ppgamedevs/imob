/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Day 28 - AVM estimation for owner-provided features
 * Pure function version that doesn't require an existing Analysis
 */

import { prisma } from "@/lib/db";

export type OwnerFeatures = {
  city?: string;
  areaSlug?: string | null;
  areaM2?: number | null;
  rooms?: number | null;
  yearBuilt?: number | null;
  level?: number | null;
  distMetroM?: number | null;
  conditionScore?: number | null;
};

export type AvmEstimate = {
  low: number | null;
  mid: number | null;
  high: number | null;
  conf: number; // 0..1
  explain: Record<string, any>;
};

const DEFAULT_MED_EUR_M2 = 1800;
const CITY_FALLBACK: Record<string, number> = {
  bucuresti: 1800,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function adjFloor(level?: number | null) {
  if (level == null) return 1.0;
  if (level < 0) return 0.97;
  if (level >= 1 && level <= 3) return 1.02;
  return 0.99;
}

function adjYear(year?: number | null) {
  if (!year) return 1.0;
  if (year >= 2015) return 1.05;
  if (year >= 2000) return 1.03;
  if (year >= 1980) return 1.0;
  if (year >= 1960) return 0.98;
  return 0.95;
}

function adjMetro(distMetroM?: number | null) {
  if (distMetroM == null) return 1.0;
  if (distMetroM <= 300) return 1.05;
  if (distMetroM <= 600) return 1.02;
  if (distMetroM <= 1000) return 1.0;
  return 0.97;
}

function adjCondition(score?: number | null) {
  if (score == null) return 1.0;
  return 0.95 + score * 0.1; // [0.95 .. 1.05]
}

function spreadFromConfidence(
  hasArea: boolean,
  hasMetro: boolean,
  hasCond: boolean,
  areaM2?: number | null,
) {
  let spread = 0.12;
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
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (CITY_FALLBACK[key]) return CITY_FALLBACK[key];
  }
  return DEFAULT_MED_EUR_M2;
}

/**
 * Estimate AVM from owner-provided features
 */
export async function estimateAVMFromFeatures(features: OwnerFeatures): Promise<AvmEstimate> {
  const { areaSlug, city, areaM2, level, yearBuilt, distMetroM, conditionScore } = features;

  const medEurM2 = await getAreaMedianEurM2(areaSlug, city);
  const explain: Record<string, any> = {
    baselineEurM2: medEurM2,
    adjustments: {} as Record<string, number>,
  };

  if (!areaM2 || areaM2 < 8 || areaM2 > 1000) {
    return { low: null, high: null, mid: null, conf: 0, explain: { reason: "invalid_area" } };
  }

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
  const conf = 1 - spread / 0.12;

  const low = Math.round(mid * (1 - spread));
  const high = Math.round(mid * (1 + spread));

  explain.spread = spread;
  explain.conf = conf;

  return { low, mid, high, conf: clamp(conf, 0, 1), explain };
}
