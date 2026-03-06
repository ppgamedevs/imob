import type { Prisma } from "@prisma/client";

import {
  COMPS_AREA_RANGE_HIGH,
  COMPS_AREA_RANGE_LOW,
  COMPS_FETCH_LIMIT,
  COMPS_MAX_AGE_DAYS,
  COMPS_MAX_DISTANCE_M,
  COMPS_TOP_N,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { filterOutliersIQR, median as calcMedian, percentile } from "@/lib/math";
import { logger } from "@/lib/obs/logger";
import { computeConfidence } from "@/lib/scoring/confidence";
import type { NormalizedFeatures } from "@/lib/types/pipeline";

import { eurM2, metersBetween, overallScore } from "./similarity";

function inRange(v?: number | null, lo?: number, hi?: number): boolean {
  if (v == null) return false;
  if (lo != null && v < lo) return false;
  if (hi != null && v > hi) return false;
  return true;
}

export async function applyCompsToAnalysis(analysisId: string) {
  const A = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: { extractedListing: true, featureSnapshot: true },
  });
  const F = (A?.featureSnapshot?.features ?? {}) as NormalizedFeatures;
  if (!A || !F?.areaM2 || !F.priceEur) return null;

  const refArea = F.areaM2!;
  const refRooms = F.rooms ?? null;
  const refYear = F.yearBuilt ?? null;

  const since = new Date();
  since.setDate(since.getDate() - COMPS_MAX_AGE_DAYS);

  const candidates = await prisma.analysis.findMany({
    where: { id: { not: analysisId }, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: COMPS_FETCH_LIMIT,
    include: { extractedListing: true, featureSnapshot: true },
  });

  const pool = candidates
    .map((c) => {
      const f = (c.featureSnapshot?.features ?? {}) as NormalizedFeatures;
      const meters = metersBetween({ lat: F.lat, lng: F.lng }, { lat: f.lat, lng: f.lng });
      const price = f.priceEur ?? null;
      const e2 = eurM2(price ?? undefined, f.areaM2 ?? undefined);
      const score = overallScore({
        meters,
        areaRef: refArea,
        area: f.areaM2 ?? undefined,
        roomsRef: refRooms ?? undefined,
        rooms: f.rooms ?? undefined,
        yearRef: refYear ?? undefined,
        year: f.yearBuilt ?? undefined,
      });

      const photosArray = c.extractedListing?.photos;
      const photo =
        Array.isArray(photosArray) && photosArray.length > 0 ? (photosArray[0] as string) : null;

      return {
        id: c.id,
        url: c.sourceUrl,
        title: c.extractedListing?.title ?? null,
        photo,
        lat: f.lat ?? null,
        lng: f.lng ?? null,
        meters: meters ?? null,
        priceEur: price,
        areaM2: f.areaM2 ?? null,
        rooms: f.rooms ?? null,
        yearBuilt: f.yearBuilt ?? null,
        eurM2: e2,
        score,
        city: f.city,
        createdAt: c.createdAt,
      };
    })
    .filter((x) => x.priceEur && x.areaM2 && x.eurM2)
    .filter((x) => {
      if (!F.city || !x.city) return true;
      return x.city.toLowerCase() === F.city.toLowerCase();
    })
    .filter((x) => x.meters == null || x.meters <= COMPS_MAX_DISTANCE_M)
    .filter((x) => inRange(x.areaM2, refArea * COMPS_AREA_RANGE_LOW, refArea * COMPS_AREA_RANGE_HIGH))
    .filter((x) => !refRooms || !x.rooms || Math.abs((refRooms ?? 0) - (x.rooms ?? 0)) <= 1)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // IQR outlier filtering on EUR/m2
  const rawEurM2s = pool.map((c) => c.eurM2!);
  const { filtered: cleanEurM2s, excluded } = filterOutliersIQR(rawEurM2s);

  if (excluded.length > 0) {
    logger.debug(
      { analysisId, excludedCount: excluded.length, excluded },
      "Outlier comps excluded by IQR",
    );
  }

  const cleanSet = new Set(cleanEurM2s);
  const filteredPool = pool.filter((c) => cleanSet.has(c.eurM2!));
  const top = filteredPool.slice(0, COMPS_TOP_N);

  // Write CompMatch records
  await prisma.compMatch.deleteMany({ where: { analysisId } });
  if (top.length) {
    await prisma.compMatch.createMany({
      data: top.map((c) => ({
        analysisId,
        compId: c.id,
        sourceUrl: c.url ?? undefined,
        title: c.title ?? undefined,
        photo: c.photo ?? undefined,
        lat: c.lat ?? undefined,
        lng: c.lng ?? undefined,
        distanceM: c.meters ? Math.round(c.meters) : null,
        priceEur: c.priceEur ?? undefined,
        areaM2: c.areaM2 ?? undefined,
        rooms: c.rooms ?? undefined,
        yearBuilt: c.yearBuilt ?? undefined,
        eurM2: c.eurM2 ?? undefined,
        score: Number((c.score ?? 0).toFixed(3)),
      })),
      skipDuplicates: true,
    });
  }

  // Compute stats with IQR-filtered values
  const eurM2Vals = top.map((c) => c.eurM2!).sort((a, b) => a - b);
  const medianVal = calcMedian(eurM2Vals);
  const q1 = percentile(eurM2Vals, 25);
  const q3 = percentile(eurM2Vals, 75);

  // Compute confidence
  const oldestComp = top.length > 0
    ? Math.max(...top.map((c) => Math.round((Date.now() - c.createdAt.getTime()) / 86400000)))
    : undefined;
  const confidence = computeConfidence(F, top.length, oldestComp);

  // Persist to ScoreSnapshot
  const existingScore = await prisma.scoreSnapshot.findUnique({ where: { analysisId } });
  const existingExplain = (existingScore?.explain as Record<string, unknown>) ?? {};

  await prisma.scoreSnapshot.upsert({
    where: { analysisId },
    update: {
      explain: {
        ...existingExplain,
        comps: { count: top.length, eurM2: { median: medianVal, q1, q3 }, outlierCount: excluded.length },
        confidence,
      } as unknown as Prisma.JsonObject,
    },
    create: {
      analysisId,
      explain: {
        comps: { count: top.length, eurM2: { median: medianVal, q1, q3 }, outlierCount: excluded.length },
        confidence,
      } as unknown as Prisma.JsonObject,
    },
  });

  return { count: top.length, medianEurM2: medianVal, confidence };
}
