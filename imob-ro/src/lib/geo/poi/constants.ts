/**
 * POI pipeline constants: per-category search radii (meters) and geo bounds.
 *
 * Radii apply to Overpass `around:` and to minimum display/analysis distance
 * so short UI rings (500m) do not produce false “zero amenities” in dense cities.
 */
import type { PoiCategoryKey } from "@/lib/geo/poiCategories";

/** Product / OSM semantic groups (normalization layer). */
export const PRODUCT_POI_CATEGORIES = [
  "shops",
  "transport",
  "education",
  "healthcare",
  "restaurants",
  "parks",
  "sports",
  "parking",
] as const;

export type ProductPoiCategory = (typeof PRODUCT_POI_CATEGORIES)[number];

/** Default Overpass / analysis radius per product category (meters). */
export const POI_RADIUS_M_BY_PRODUCT: Record<ProductPoiCategory, number> = {
  shops: 1000,
  restaurants: 1000,
  transport: 800,
  education: 1500,
  healthcare: 2000,
  parks: 1200,
  sports: 1500,
  parking: 600,
};

/**
 * Minimum radius used when combining with user-selected map radius:
 * `effectiveCap = min(MAX_POI_RADIUS_M, max(userRadiusM, INTEL_CATEGORY_MIN_RADIUS_M[k]))`
 */
export const INTEL_CATEGORY_MIN_RADIUS_M: Record<PoiCategoryKey, number> = {
  supermarket: 1000,
  transport: 800,
  school: 1500,
  medical: 2000,
  restaurant: 1000,
  park: 1200,
  gym: 1500,
  parking: 600,
};

export const MAX_POI_RADIUS_M = 5000;

/** Bucharest metropolitan bbox (approximate) — urban low-data heuristics. */
export const BUCHAREST_METRO_BOUNDS = {
  minLat: 44.32,
  maxLat: 44.54,
  minLng: 25.9,
  maxLng: 26.2,
} as const;

export function isLikelyBucharestUrban(lat: number, lng: number): boolean {
  return (
    lat >= BUCHAREST_METRO_BOUNDS.minLat &&
    lat <= BUCHAREST_METRO_BOUNDS.maxLat &&
    lng >= BUCHAREST_METRO_BOUNDS.minLng &&
    lng <= BUCHAREST_METRO_BOUNDS.maxLng
  );
}

/** Enable verbose POI pipeline logs (server). */
export function isPoiPipelineDebugEnabled(): boolean {
  return (
    process.env.POI_PIPELINE_DEBUG === "1" ||
    process.env.POI_PIPELINE_DEBUG === "true"
  );
}
