import { prisma } from "@/lib/db";
import type { NormalizedFeatures } from "@/types/analysis";

const RENT_EUR_M2_DEFAULT = Number(process.env.RENT_EUR_M2_DEFAULT ?? 10);

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

async function getRentEurM2Baseline(areaSlug?: string | null, city?: string | null) {
  if (areaSlug) {
    const row = await prisma.areaDaily.findFirst({
      where: { areaSlug },
      orderBy: { date: "desc" },
      select: { medianEurM2: true },
    });
    const m2 = (row?.medianEurM2 as any) ?? null;
    if (typeof m2 === "number" && m2 > 3 && m2 < 4000) return m2;
  }
  if (city && /bucure/i.test(city)) return 11;
  return RENT_EUR_M2_DEFAULT;
}

function adjRooms(rooms?: number | null) {
  if (!rooms) return 1.0;
  if (rooms <= 1.5) return 1.1;
  if (rooms === 2) return 1.0;
  if (rooms >= 3) return 0.93;
  return 1.0;
}

function adjCondition(score?: number | null) {
  if (score == null) return 1.0;
  return 0.9 + score * 0.2;
}

function adjMetro(dist?: number | null) {
  if (dist == null) return 1.0;
  if (dist <= 300) return 1.06;
  if (dist <= 600) return 1.03;
  return 1.0;
}

function adjSize(areaM2?: number | null) {
  if (!areaM2) return 1.0;
  if (areaM2 < 30) return 1.05;
  if (areaM2 > 85) return 0.95;
  return 1.0;
}

export type RentResult = {
  rentEur: number | null;
  eurM2: number;
  explain: Record<string, any>;
};

export async function estimateRent(features: NormalizedFeatures): Promise<RentResult> {
  const { areaSlug, city, areaM2, rooms, conditionScore, distMetroM } = features as any;
  if (!areaM2 || areaM2 < 8)
    return { rentEur: null, eurM2: RENT_EUR_M2_DEFAULT, explain: { reason: "invalid_area" } };

  const base = await getRentEurM2Baseline(areaSlug, city);
  const fRooms = adjRooms(rooms);
  const fCond = adjCondition(conditionScore);
  const fMetro = adjMetro(distMetroM);
  const fSize = adjSize(areaM2);

  const eurM2 = clamp(base * fRooms * fCond * fMetro * fSize, 4, 50);
  const rentEur = Math.round(eurM2 * areaM2);

  return {
    rentEur,
    eurM2,
    explain: {
      baseEurM2: base,
      adjustments: { rooms: fRooms, condition: fCond, metro: fMetro, size: fSize },
    },
  };
}
