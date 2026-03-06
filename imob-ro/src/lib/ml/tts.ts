import {
  TTS_BASE_DAYS,
  TTS_CONDITION_SENSITIVITY,
  TTS_CONSERVATIVE_MULTIPLIER,
  TTS_DEMAND_MAX,
  TTS_DEMAND_MIN,
  TTS_DEMAND_SENSITIVITY,
  TTS_INTERVAL_SPREAD,
  TTS_LARGE_AREA_PENALTY,
  TTS_LARGE_AREA_THRESHOLD,
  TTS_MAX_DAYS,
  TTS_MIN_DAYS,
  TTS_OVERPRICED_FACTOR,
  TTS_SEASONALITY,
  TTS_SMALL_AREA_BOOST,
  TTS_SMALL_AREA_THRESHOLD,
  TTS_UNDERPRICED_FACTOR,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { clamp } from "@/lib/math";
import type { TtsResult } from "@/lib/types/pipeline";

export type TtsInput = {
  avmMid?: number | null;
  asking?: number | null;
  areaSlug?: string | null;
  month?: number;
  areaM2?: number | null;
  conditionScore?: number | null;
};

function bucketize(days: number): TtsResult["bucket"] {
  if (days < 30) return "<30";
  if (days < 60) return "30-60";
  if (days < 90) return "60-90";
  return "90+";
}

export function humanizeBucket(bucket: TtsResult["bucket"]): string {
  if (bucket === "<30") return "Sub 30 zile";
  if (bucket === "30-60") return "30-60 zile";
  if (bucket === "60-90") return "60-90 zile";
  return "90+ zile";
}

async function getDemandScore(areaSlug?: string | null): Promise<number> {
  if (!areaSlug) return 1.0;
  const row = await prisma.areaDaily.findFirst({
    where: { areaSlug },
    orderBy: { date: "desc" },
    select: { demandScore: true },
  });
  return row?.demandScore ?? 1.0;
}

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
  let days = TTS_BASE_DAYS;

  let priceDelta = 0;
  if (avmMid && asking) priceDelta = (asking - avmMid) / avmMid;
  explain.priceDelta = priceDelta;

  if (priceDelta > 0) {
    days *= 1 + TTS_OVERPRICED_FACTOR * priceDelta;
  } else {
    days *= 1 + TTS_UNDERPRICED_FACTOR * priceDelta;
  }

  const demand = await getDemandScore(areaSlug);
  explain.demandScore = demand;
  days *= clamp(1.0 - (demand - 1.0) * TTS_DEMAND_SENSITIVITY, TTS_DEMAND_MIN, TTS_DEMAND_MAX);

  const season = TTS_SEASONALITY[month] ?? 1.0;
  explain.seasonality = season;
  days *= season;

  if (conditionScore != null) {
    days *= 1.0 + (0.5 - conditionScore) * TTS_CONDITION_SENSITIVITY;
    explain.conditionAdj = (0.5 - conditionScore) * TTS_CONDITION_SENSITIVITY;
  }

  if (areaM2 != null) {
    if (areaM2 <= TTS_SMALL_AREA_THRESHOLD) days *= TTS_SMALL_AREA_BOOST;
    else if (areaM2 >= TTS_LARGE_AREA_THRESHOLD) days *= TTS_LARGE_AREA_PENALTY;
  }

  // Conservative bias: better to overestimate TTS than underestimate
  days *= TTS_CONSERVATIVE_MULTIPLIER;
  days = clamp(days, TTS_MIN_DAYS, TTS_MAX_DAYS);

  const scoreDays = Math.round(days);
  const estimateMonths = Math.round((scoreDays / 30) * 10) / 10;
  const minMonths = Math.max(0.5, Math.round((estimateMonths * (1 - TTS_INTERVAL_SPREAD)) * 10) / 10);
  const maxMonths = Math.round((estimateMonths * (1 + TTS_INTERVAL_SPREAD)) * 10) / 10;

  return {
    bucket: bucketize(scoreDays),
    scoreDays,
    estimateMonths,
    minMonths,
    maxMonths,
    explain,
  };
}

export default estimateTTS;
