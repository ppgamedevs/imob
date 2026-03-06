/**
 * Geo POI cache backed by Prisma (GeoPoiCache model).
 *
 * Keys are built from rounded lat/lng + category + radius.
 * TTL defaults to 7 days.
 */
import { prisma } from "@/lib/db";
import type { OverpassFeature, OverpassPoi } from "./overpass";

const DEFAULT_TTL_DAYS = 7;
const COORD_PRECISION = 3; // ~111m grid cells

export function makeCacheKey(
  lat: number,
  lng: number,
  radiusM: number,
  category: string,
): string {
  const latR = lat.toFixed(COORD_PRECISION);
  const lngR = lng.toFixed(COORD_PRECISION);
  return `poi:${latR}:${lngR}:${radiusM}:${category}`;
}

export function roundCoord(val: number): number {
  return parseFloat(val.toFixed(COORD_PRECISION));
}

export async function getCachedPois(
  key: string,
): Promise<OverpassPoi[] | null> {
  try {
    const row = await prisma.geoPoiCache.findUnique({ where: { key } });
    if (!row) return null;
    if (row.expiresAt < new Date()) {
      // Expired but don't delete here; background cleanup can handle it
      return null;
    }
    return row.payload as unknown as OverpassPoi[];
  } catch {
    return null;
  }
}

export async function getCachedPoisTyped<T extends OverpassFeature>(
  key: string,
): Promise<T[] | null> {
  const cached = await getCachedPois(key);
  return cached as T[] | null;
}

export async function setCachedPois(
  key: string,
  lat: number,
  lng: number,
  radiusM: number,
  category: string,
  payload: OverpassFeature[],
  ttlDays = DEFAULT_TTL_DAYS,
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  try {
    await prisma.geoPoiCache.upsert({
      where: { key },
      update: {
        payload: payload as unknown as Parameters<typeof prisma.geoPoiCache.update>[0]["data"]["payload"],
        fetchedAt: new Date(),
        expiresAt,
      },
      create: {
        key,
        latRounded: roundCoord(lat),
        lngRounded: roundCoord(lng),
        radiusM,
        category,
        payload: payload as unknown as Parameters<typeof prisma.geoPoiCache.create>[0]["data"]["payload"],
        expiresAt,
      },
    });
  } catch {
    // Non-critical: if caching fails, queries still work
  }
}

/**
 * Remove expired cache entries. Call periodically or on-demand.
 */
export async function purgeExpiredCache(): Promise<number> {
  const result = await prisma.geoPoiCache.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
