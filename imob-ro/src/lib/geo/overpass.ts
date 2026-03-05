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
import { POI_CATEGORIES, type PoiCategoryKey } from "./poiCategories";

const OVERPASS_ENDPOINT =
  process.env.OVERPASS_ENDPOINT ?? "https://overpass-api.de/api/interpreter";

const OVERPASS_TIMEOUT_S = 10;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

export interface OverpassPoi {
  id: string;
  name: string | null;
  lat: number;
  lng: number;
  category: PoiCategoryKey;
  subType: string | null;
  tags: Record<string, string>;
  distanceM: number;
}

export function buildOverpassQuery(
  lat: number,
  lng: number,
  radiusM: number,
  category: PoiCategoryKey,
): string {
  const cat = POI_CATEGORIES[category];
  if (!cat) throw new Error(`Unknown POI category: ${category}`);

  const filters = cat.overpassFilters
    .map((f) => `${f}(around:${radiusM},${lat},${lng});`)
    .join("\n  ");

  return `[out:json][timeout:${OVERPASS_TIMEOUT_S}];
(
  ${filters}
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

async function fetchWithRetry(
  query: string,
  retries = MAX_RETRIES,
): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        (OVERPASS_TIMEOUT_S + 5) * 1000,
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
  const cat = POI_CATEGORIES[category];
  const maxResults = limit ?? cat.defaultLimit;
  const query = buildOverpassQuery(lat, lng, radiusM, category);

  const json = (await fetchWithRetry(query)) as {
    elements?: {
      type: string;
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }[];
  } | null;

  if (!json?.elements) return [];

  const results: OverpassPoi[] = [];

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
  return results.slice(0, maxResults);
}
