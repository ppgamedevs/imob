/**
 * Overpass API client for fetching POIs from OpenStreetMap.
 *
 * Features:
 * - Builds Overpass QL queries from category definitions
 * - Timeout + retry logic (10s timeout, 2 retries)
 * - Normalizes results with Haversine distance
 * - Returns sorted by distance, capped to limit
 */
import { haversineM } from "@/lib/geo";
import { getCachedPoisTyped, makeCacheKey, setCachedPois } from "./cache";
import { fetchOverpassIntelCategory } from "@/lib/geo/poi/fetch-overpass-intel-category";
import type { PoiCategoryKey } from "./poiCategories";

const OVERPASS_ENDPOINT =
  process.env.OVERPASS_ENDPOINT ?? "https://overpass-api.de/api/interpreter";

const OVERPASS_TIMEOUT_S = 25;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

export interface OverpassFeature {
  id: string;
  name: string | null;
  lat: number;
  lng: number;
  category: string;
  subType: string | null;
  tags: Record<string, string>;
  distanceM: number;
}

export interface OverpassPoi extends OverpassFeature {
  category: PoiCategoryKey;
}

export function buildCustomOverpassQuery(
  lat: number,
  lng: number,
  radiusM: number,
  filters: string[],
): string {
  const compiledFilters = filters
    .map((filter) => `${filter}(around:${radiusM},${lat},${lng});`)
    .join("\n  ");

  return `[out:json][timeout:${OVERPASS_TIMEOUT_S}];
(
  ${compiledFilters}
);
out center tags;`;
}

function inferSubType(tags: Record<string, string>): string | null {
  return (
    tags.amenity ??
    tags.shop ??
    tags.leisure ??
    tags.tourism ??
    tags.railway ??
    tags.highway ??
    tags.station ??
    null
  );
}

/** Run arbitrary Overpass QL (used by batched POI pipeline). */
export async function fetchOverpassInterpret(
  query: string,
  retries = MAX_RETRIES,
): Promise<unknown> {
  return fetchWithRetry(query, retries);
}

async function fetchWithRetry(
  query: string,
  retries = MAX_RETRIES,
): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        (OVERPASS_TIMEOUT_S + 8) * 1000,
      );

      const res = await fetch(OVERPASS_ENDPOINT, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "ImobIntel/1.0",
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        return null;
      }

      if (!res.ok) return null;
      return await res.json();
    } catch {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      return null;
    }
  }
  return null;
}

export async function fetchOverpassPois(
  lat: number,
  lng: number,
  radiusM: number,
  category: PoiCategoryKey,
  limit?: number,
): Promise<OverpassPoi[]> {
  return fetchOverpassIntelCategory(lat, lng, radiusM, category, limit);
}

async function fetchOverpassFeatures(
  query: string,
  lat: number,
  lng: number,
  radiusM: number,
  category: string,
  limit: number,
): Promise<OverpassFeature[]> {
  const json = (await fetchWithRetry(query)) as {
    elements?: {
      type: string;
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }[];
    remark?: string;
  } | null;

  if (json?.remark) {
    console.warn(`[overpass] remark (${category}):`, json.remark);
  }

  if (!json?.elements) return [];

  const results: OverpassFeature[] = [];

  for (const el of json.elements) {
    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    if (elLat == null || elLng == null) continue;

    const tags = el.tags ?? {};
    const dist = haversineM(lat, lng, elLat, elLng);

    if (dist > radiusM) continue;

    results.push({
      id: `${el.type}/${el.id}`,
      name: tags.name ?? tags["name:ro"] ?? null,
      lat: elLat,
      lng: elLng,
      category,
      subType: inferSubType(tags),
      tags,
      distanceM: Math.round(dist),
    });
  }

  results.sort((a, b) => a.distanceM - b.distanceM);
  return results.slice(0, limit);
}

export async function fetchCustomOverpassFeatures(params: {
  lat: number;
  lng: number;
  radiusM: number;
  filters: string[];
  cacheCategory: string;
  limit?: number;
}): Promise<OverpassFeature[]> {
  const {
    lat,
    lng,
    radiusM,
    filters,
    cacheCategory,
    limit = 50,
  } = params;
  const cacheKey = makeCacheKey(lat, lng, radiusM, cacheCategory);
  const cached = await getCachedPoisTyped<OverpassFeature>(cacheKey);
  if (cached) return cached.slice(0, limit);

  const query = buildCustomOverpassQuery(lat, lng, radiusM, filters);
  const results = await fetchOverpassFeatures(query, lat, lng, radiusM, cacheCategory, limit);
  void setCachedPois(cacheKey, lat, lng, radiusM, cacheCategory, results);
  return results;
}
