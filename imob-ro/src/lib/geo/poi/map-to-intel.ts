/**
 * Bridge: NormalizedPoi → legacy OverpassPoi buckets for intelScoring + map UI.
 */
import type { PoiCategoryKey } from "@/lib/geo/poiCategories";
import { POI_CATEGORIES, POI_CATEGORY_KEYS } from "@/lib/geo/poiCategories";
import type { OverpassPoi } from "@/lib/geo/overpass";
import type { NormalizedPoi } from "@/lib/geo/poi/types";

/** Pharmacies score with “magazine” in intelScoring (subType pharmacy). */
export function mapNormalizedToIntelCategory(p: NormalizedPoi): PoiCategoryKey {
  if (p.category === "healthcare" && p.subcategory === "pharmacy") {
    return "supermarket";
  }
  switch (p.category) {
    case "shops":
      return "supermarket";
    case "transport":
      return "transport";
    case "education":
      return "school";
    case "healthcare":
      return "medical";
    case "restaurants":
      return "restaurant";
    case "parks":
      return "park";
    case "sports":
      return "gym";
    case "parking":
      return "parking";
    default:
      return "supermarket";
  }
}

export function normalizedPoiToOverpassPoi(p: NormalizedPoi): OverpassPoi {
  const category = mapNormalizedToIntelCategory(p);
  const subType = p.subcategory ?? null;
  return {
    id: p.id,
    name: p.name ?? null,
    lat: p.lat,
    lng: p.lng,
    category,
    subType,
    tags: { ...p.rawTags, _product: p.category },
    distanceM: p.distanceM,
  };
}

export function groupNormalizedIntoIntelBuckets(
  pois: NormalizedPoi[],
): Record<PoiCategoryKey, OverpassPoi[]> {
  const buckets = Object.fromEntries(
    POI_CATEGORY_KEYS.map((k) => [k, [] as OverpassPoi[]]),
  ) as Record<PoiCategoryKey, OverpassPoi[]>;

  for (const p of pois) {
    const op = normalizedPoiToOverpassPoi(p);
    buckets[op.category].push(op);
  }

  for (const k of POI_CATEGORY_KEYS) {
    buckets[k].sort((a, b) => a.distanceM - b.distanceM);
  }

  return buckets;
}

/** Cap list lengths for API / map payloads. */
export function trimIntelBucketsToLimits(
  buckets: Record<PoiCategoryKey, OverpassPoi[]>,
): Record<PoiCategoryKey, OverpassPoi[]> {
  const out = { ...buckets };
  for (const k of POI_CATEGORY_KEYS) {
    const lim = POI_CATEGORIES[k].defaultLimit;
    out[k] = (out[k] ?? []).slice(0, lim);
  }
  return out;
}
