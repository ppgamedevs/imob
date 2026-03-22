/**
 * Single intel-layer Overpass fetch (map UI / legacy /api/geo/pois).
 */
import { fetchOverpassInterpret } from "@/lib/geo/overpass";
import type { OverpassPoi } from "@/lib/geo/overpass";
import { POI_CATEGORIES, type PoiCategoryKey } from "@/lib/geo/poiCategories";
import { dedupeNormalizedPois } from "@/lib/geo/poi/deduplicate-pois";
import {
  type OsmElement,
  osmElementToNormalizedPoi,
} from "@/lib/geo/poi/normalize-osm-poi";
import {
  buildOverpassQueryFromBatch,
  splitCatalogIntoBatches,
} from "@/lib/geo/poi/overpass-query";
import { catalogLinesForIntelCategory } from "@/lib/geo/poi/overpass-lines";
import {
  INTEL_CATEGORY_MIN_RADIUS_M,
  MAX_POI_RADIUS_M,
} from "@/lib/geo/poi/constants";
import { groupNormalizedIntoIntelBuckets } from "@/lib/geo/poi/map-to-intel";

function parseElements(json: unknown): OsmElement[] {
  const j = json as {
    elements?: OsmElement[];
    remark?: string;
  } | null;
  if (j?.remark) {
    console.warn("[overpass] remark (intel-category):", j.remark);
  }
  return j?.elements ?? [];
}

export async function fetchOverpassIntelCategory(
  lat: number,
  lng: number,
  clientRadiusM: number,
  category: PoiCategoryKey,
  limit?: number,
): Promise<OverpassPoi[]> {
  const lines = catalogLinesForIntelCategory(category);
  if (lines.length === 0) return [];

  const maxResults = limit ?? POI_CATEGORIES[category].defaultLimit;
  const batches = splitCatalogIntoBatches(lines);
  const seen = new Set<string>();
  const normalizedRaw: ReturnType<typeof osmElementToNormalizedPoi>[] = [];

  for (const batch of batches) {
    const query = buildOverpassQueryFromBatch(lat, lng, batch, 45, clientRadiusM);
    const json = await fetchOverpassInterpret(query);
    for (const el of parseElements(json)) {
      const key = `${el.type}/${el.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const p = osmElementToNormalizedPoi(el, lat, lng);
      if (p) normalizedRaw.push(p);
    }
  }

  const deduped = dedupeNormalizedPois(normalizedRaw.filter(Boolean) as NonNullable<(typeof normalizedRaw)[0]>[]);
  const buckets = groupNormalizedIntoIntelBuckets(deduped);
  const cap = Math.min(
    MAX_POI_RADIUS_M,
    Math.max(clientRadiusM, INTEL_CATEGORY_MIN_RADIUS_M[category]),
  );
  const list = (buckets[category] ?? []).filter((p) => p.distanceM <= cap);
  return list.slice(0, maxResults);
}
