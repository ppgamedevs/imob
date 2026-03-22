import type { ProductPoiCategory } from "@/lib/geo/poi/constants";

/**
 * Normalized POI — provider-agnostic shape for scoring and UI mapping.
 */
export interface NormalizedPoi {
  id: string;
  source: "osm" | "google" | "foursquare";
  category: ProductPoiCategory;
  subcategory?: string;
  name?: string;
  lat: number;
  lng: number;
  distanceM: number;
  rawTags: Record<string, string>;
}

export interface PoiQueryInput {
  lat: number;
  lng: number;
  /** User-selected radius (map / report). */
  userRadiusM: number;
  options?: {
    debug?: boolean;
    /** Approximate coords → lower confidence in quality evaluator */
    lowCoordinatePrecision?: boolean;
  };
}

export type PoiConfidence = "low" | "medium" | "high";

export interface PoiDataQuality {
  totalPoiCount: number;
  categoryCoverage: Record<ProductPoiCategory, number>;
  confidence: PoiConfidence;
  lowDataMode: boolean;
  reasons: string[];
}

export interface PoiProviderResult {
  normalized: NormalizedPoi[];
  rawElementCount: number;
  dedupedCount: number;
  quality: PoiDataQuality;
  queriesExecuted: number;
}
