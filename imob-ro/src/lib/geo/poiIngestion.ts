/**
 * Merge OSM + Google Places POIs per category, dedupe by proximity.
 */
import { haversineM } from "@/lib/geo";
import type { OverpassPoi } from "@/lib/geo/overpass";
import type { PoiCategoryKey } from "@/lib/geo/poiCategories";

const DEDUP_M = 42;

export type PoiDataConfidence = "low" | "medium" | "high";

export interface PoiIngestionMeta {
  osmTotal: number;
  googleTotal: number;
  mergedTotal: number;
  fetchRadiusM: number;
  usedGoogleFallback: boolean;
  /** Non-empty if merge still sparse or partial failure */
  notice?: string;
  /** Raw Overpass elements summed across batched queries (pre-normalization). */
  rawOsmElementCount?: number;
  overpassQueriesRun?: number;
  dataConfidence?: PoiDataConfidence;
  /** Machine-readable quality flags from `evaluate-poi-quality` */
  dataQualityReasons?: string[];
}

export function countAllPois(poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>): number {
  let n = 0;
  for (const list of Object.values(poisByCategory)) n += list.length;
  return n;
}

export function mergeAndDedupeCategory(
  osm: OverpassPoi[],
  google: OverpassPoi[],
  maxResults: number,
): OverpassPoi[] {
  const combined: OverpassPoi[] = [...osm];
  for (const g of google) {
    const dup = combined.some(
      (o) =>
        o.category === g.category && haversineM(o.lat, o.lng, g.lat, g.lng) < DEDUP_M,
    );
    if (!dup) combined.push(g);
  }
  combined.sort((a, b) => a.distanceM - b.distanceM);
  return combined.slice(0, maxResults);
}

export function buildIngestionMeta(
  osmByCat: Record<PoiCategoryKey, OverpassPoi[]>,
  googleByCat: Record<PoiCategoryKey, OverpassPoi[]>,
  mergedByCat: Record<PoiCategoryKey, OverpassPoi[]>,
  fetchRadiusM: number,
  usedGoogleFallback: boolean,
): PoiIngestionMeta {
  const osmTotal = countAllPois(osmByCat);
  const googleTotal = countAllPois(googleByCat);
  const mergedTotal = countAllPois(mergedByCat);
  let notice: string | undefined;
  if (mergedTotal === 0) {
    notice =
      "Nu am putut incarca puncte de interes din surse externe pentru aceste coordonate. Incearca din nou sau verifica locatia.";
  } else if (mergedTotal < 8) {
    notice = "Date limitate, estimare bazata pe surse disponibile.";
  }
  return {
    osmTotal,
    googleTotal,
    mergedTotal,
    fetchRadiusM,
    usedGoogleFallback,
    notice,
  };
}
