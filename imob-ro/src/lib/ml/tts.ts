// Copilot: Implement a cheap TTS estimator.
// Inputs: priceDelta (asking vs avmMid), demandScore (area), month (1..12), areaM2, conditionScore.
// Output: { bucket: "<30"|"30-60"|"60-90"|"90+", scoreDays: number, explain:{} }

import { prisma } from "@/lib/db";

export type TtsInput = {
  avmMid?: number | null;
  asking?: number | null;
  areaSlug?: string | null;
  month?: number;
  areaM2?: number | null;
  conditionScore?: number | null;
};

export type TtsResult = {
  bucket: "<30" | "30-60" | "60-90" | "90+";
  scoreDays: number; // model point estimate (just for internal use)
  explain: Record<string, unknown>;
};

const SEASONALITY: Record<number, number> = {
  // multipliers (1 = neutral). Faster in spring, slower in Aug/Dec.
  1: 1.1,
  2: 0.98,
  3: 0.92,
  4: 0.9,
  5: 0.92,
  6: 0.96,
  7: 1.04,
  8: 1.14,
  9: 0.94,
  10: 0.96,
  11: 1.02,
  12: 1.12,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function bucketize(days: number): TtsResult["bucket"] {
  if (days < 30) return "<30";
  if (days < 60) return "30-60";
  if (days < 90) return "60-90";
  return "90+";
}

async function getDemandScore(areaSlug?: string | null) {
  if (!areaSlug) return 1.0; // neutral
  const row = await prisma.areaDaily.findFirst({
    where: { areaSlug },
    orderBy: { date: "desc" },
    select: { demandScore: true },
  });
  return row?.demandScore ?? 1.0; // 1.0 = neutral; >1 more demand, <1 weak
}

/**
 * Core heuristic:
 * - baseDays = 60 (neutral listing clears ~2 months)
 * - priceDelta% increases/decreases time: +1.2x per +10% overpriced, -0.8x per -10% underpriced
 * - demandScore scales inversely (higher demand => faster)
 * - seasonality multiplier
 * - small adjustment for condition and very small/very large area outliers
 */
export async function estimateTTS(input: TtsInput): Promise<TtsResult> {
  const {
    avmMid,
    asking,
    areaSlug,
    month = new Date().getMonth() + 1,
    areaM2,
    conditionScore,
  } = input;

  const explain: Record<string, unknown> = {};

  // base
  let days = 60;

  // price pressure
  let priceDelta = 0;
  if (avmMid && asking) priceDelta = (asking - avmMid) / avmMid;
  explain.priceDelta = priceDelta;

  // adjust for priceDelta: +12% days per +10% overpriced; -8% per -10%
  if (priceDelta > 0) {
    days *= 1 + 1.2 * priceDelta; // slower
  } else {
    days *= 1 + 0.8 * priceDelta; // faster (priceDelta negative)
  }

  // demand
  const demand = await getDemandScore(areaSlug);
  explain.demandScore = demand;
  // If demand=1.2 (20% above normal), cut days by ~15%; if 0.8, increase ~15%
  days *= clamp(1.0 - (demand - 1.0) * 0.75, 0.7, 1.3);

  // seasonality
  const season = SEASONALITY[month] ?? 1.0;
  explain.seasonality = season;
  days *= season;

  // condition
  if (conditionScore != null) {
    // 0..1 -> map to [-8%, +8%]
    days *= 1.0 + (0.5 - conditionScore) * 0.16;
    explain.conditionAdj = (0.5 - conditionScore) * 0.16;
  }

  // area outliers (garsoniere vând mai repede, foarte mari mai greu)
  if (areaM2 != null) {
    if (areaM2 <= 35) days *= 0.9;
    else if (areaM2 >= 90) days *= 1.08;
    explain.areaAdj = areaM2 <= 35 ? -0.1 : areaM2 >= 90 ? 0.08 : 0;
  }

  // clamp and round
  days = clamp(days, 10, 180);
  const scoreDays = Math.round(days);
  const bucket = bucketize(scoreDays);

  return { bucket, scoreDays, explain };
}

export default estimateTTS;
