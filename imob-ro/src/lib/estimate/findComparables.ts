/**
 * Comparable-finding logic: shared between /report and /api/estimate.
 *
 * Two entry points:
 *  - findCompsForReport()  - reads pre-computed CompMatch rows for an analysis
 *  - fetchCompsFromListings() - queries ExtractedListing by geo proximity
 *
 * Both funnel through the same scoreAndClassify() pure function.
 */

import { prisma } from "@/lib/db";
import { haversineM } from "@/lib/geo";

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

export const TIGHT_RADIUS_M = 800;
export const RELAXED_RADIUS_M = 2000;
export const AREA_TOLERANCE = 0.2;
export const ROOMS_TOLERANCE = 1;
export const YEAR_BUCKET_SIZE = 15;
export const MIN_COMPS_TIGHT = 3;

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface CompSubject {
  lat?: number | null;
  lng?: number | null;
  areaM2: number;
  rooms?: number | null;
  yearBuilt?: number | null;
}

export interface RawComp {
  id: string;
  sourceUrl: string | null;
  priceEur: number;
  areaM2: number;
  eurM2: number;
  rooms: number | null;
  yearBuilt: number | null;
  lat: number | null;
  lng: number | null;
  distanceM: number;
  source: string | null;
  title?: string | null;
  photo?: string | null;
  score?: number;
}

export interface ScoredComp extends RawComp {
  similarityScore: number;
  matchType: "tight" | "relaxed";
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function yearBucketMatch(
  ref: number | null | undefined,
  comp: number | null | undefined,
): boolean {
  if (!ref || !comp) return true;
  return Math.abs(ref - comp) <= YEAR_BUCKET_SIZE;
}

/**
 * Scores comps against a subject listing, classifies as tight/relaxed,
 * and returns the best set (preferring tight when >= MIN_COMPS_TIGHT).
 */
export function scoreAndClassify(comps: RawComp[], subject: CompSubject): ScoredComp[] {
  const scored: ScoredComp[] = comps.map((c) => {
    let s = 100;

    if (c.distanceM <= 200) s -= 0;
    else if (c.distanceM <= 500) s -= 10;
    else if (c.distanceM <= 800) s -= 20;
    else s -= 30;

    const areaDiff = Math.abs(c.areaM2 - subject.areaM2) / subject.areaM2;
    s -= Math.min(20, Math.round(areaDiff * 100));

    const roomDiff =
      subject.rooms != null && c.rooms != null ? Math.abs(c.rooms - subject.rooms) : 0;
    s -= roomDiff * 10;

    if (subject.yearBuilt && c.yearBuilt) {
      const yd = Math.abs(subject.yearBuilt - c.yearBuilt);
      if (yd <= 5) s -= 0;
      else if (yd <= 15) s -= 5;
      else s -= 15;
    }

    const tight =
      c.distanceM <= TIGHT_RADIUS_M &&
      areaDiff <= AREA_TOLERANCE &&
      roomDiff <= ROOMS_TOLERANCE &&
      yearBucketMatch(subject.yearBuilt, c.yearBuilt);

    return {
      ...c,
      similarityScore: Math.max(0, s),
      matchType: tight ? ("tight" as const) : ("relaxed" as const),
    };
  });

  scored.sort((a, b) => b.similarityScore - a.similarityScore);

  const tight = scored.filter((c) => c.matchType === "tight");
  if (tight.length >= MIN_COMPS_TIGHT) return tight;

  return scored;
}

// ---------------------------------------------------------------------------
// DB queries
// ---------------------------------------------------------------------------

/**
 * Fetches comparables from CompMatch for an existing analysis.
 * Used by the report page.
 */
export async function findCompsForReport(params: {
  analysisId: string;
  lat: number | null;
  lng: number | null;
  areaM2: number;
  rooms: number | null;
  yearBuilt: number | null;
}): Promise<ScoredComp[]> {
  const { analysisId, lat, lng, areaM2, rooms, yearBuilt } = params;

  const raw = await prisma.compMatch.findMany({
    where: { analysisId },
    orderBy: { score: "desc" },
  });

  if (raw.length === 0) return [];

  const comps: RawComp[] = raw
    .filter((c) => c.priceEur && c.areaM2 && c.eurM2)
    .map((c) => {
      const dist =
        c.distanceM ??
        (lat != null && lng != null && c.lat != null && c.lng != null
          ? Math.round(haversineM(lat, lng, c.lat, c.lng))
          : null);
      return {
        id: c.id,
        sourceUrl: c.sourceUrl,
        title: c.title,
        photo: c.photo,
        priceEur: c.priceEur!,
        areaM2: c.areaM2!,
        eurM2: c.eurM2!,
        rooms: c.rooms ?? null,
        yearBuilt: c.yearBuilt ?? null,
        lat: c.lat ?? null,
        lng: c.lng ?? null,
        distanceM: dist ?? 9999,
        source: null,
        score: c.score ?? 0,
      };
    });

  return scoreAndClassify(comps, { lat, lng, areaM2, rooms, yearBuilt });
}

export interface ListingSearchFilters {
  lat: number;
  lng: number;
  areaM2: number;
  rooms: number;
  yearBuilt?: number | null;
  daysBack?: number;
}

/**
 * Fetches comparables directly from ExtractedListing by geo proximity.
 * Used by the standalone /api/estimate endpoint.
 */
export async function fetchCompsFromListings(filters: ListingSearchFilters): Promise<RawComp[]> {
  const { lat, lng, areaM2, rooms } = filters;
  const daysBack = filters.daysBack ?? 90;

  const degPerKm = 1 / 111.32;
  const radiusKm = RELAXED_RADIUS_M / 1000;
  const latDelta = degPerKm * radiusKm;
  const lngDelta = latDelta / Math.cos((lat * Math.PI) / 180);

  const minArea = areaM2 * (1 - AREA_TOLERANCE);
  const maxArea = areaM2 * (1 + AREA_TOLERANCE);
  const minRooms = Math.max(1, rooms - ROOMS_TOLERANCE);
  const maxRooms = rooms + ROOMS_TOLERANCE;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);

  const rows = await prisma.extractedListing.findMany({
    where: {
      lat: { gte: lat - latDelta, lte: lat + latDelta },
      lng: { gte: lng - lngDelta, lte: lng + lngDelta },
      price: { gt: 0 },
      areaM2: { gte: Math.round(minArea), lte: Math.round(maxArea) },
      rooms: { gte: minRooms, lte: maxRooms },
      createdAt: { gte: cutoff },
    },
    select: {
      analysisId: true,
      price: true,
      currency: true,
      areaM2: true,
      rooms: true,
      yearBuilt: true,
      lat: true,
      lng: true,
      analysis: { select: { sourceUrl: true } },
    },
    take: 200,
    orderBy: { createdAt: "desc" },
  });

  const comps: RawComp[] = [];
  for (const r of rows) {
    if (!r.lat || !r.lng || !r.price || !r.areaM2) continue;

    let priceEur = r.price;
    if (r.currency === "RON") priceEur = Math.round(priceEur / 5);

    const dist = Math.round(haversineM(lat, lng, r.lat, r.lng));
    if (dist > RELAXED_RADIUS_M) continue;

    const eurM2 = Math.round(priceEur / r.areaM2);
    if (eurM2 < 300 || eurM2 > 10000) continue;

    const srcUrl = r.analysis?.sourceUrl ?? null;
    let source: string | null = null;
    if (srcUrl) {
      try {
        source = new URL(srcUrl).hostname.replace("www.", "");
      } catch {
        /* ignore */
      }
    }

    comps.push({
      id: r.analysisId,
      sourceUrl: srcUrl,
      priceEur,
      areaM2: r.areaM2,
      eurM2,
      rooms: r.rooms,
      yearBuilt: r.yearBuilt,
      lat: r.lat,
      lng: r.lng,
      distanceM: dist,
      source,
    });
  }

  return comps;
}
