/**
 * Low-data detection: distinguish poor coverage from “empty neighborhood”.
 */
import {
  isLikelyBucharestUrban,
  PRODUCT_POI_CATEGORIES,
  type ProductPoiCategory,
} from "@/lib/geo/poi/constants";
import type { NormalizedPoi } from "@/lib/geo/poi/types";
import type { PoiConfidence, PoiDataQuality } from "@/lib/geo/poi/types";

function emptyCoverage(): Record<ProductPoiCategory, number> {
  return Object.fromEntries(PRODUCT_POI_CATEGORIES.map((k) => [k, 0])) as Record<
    ProductPoiCategory,
    number
  >;
}

export function evaluatePoiDataQuality(params: {
  pois: NormalizedPoi[];
  lat: number;
  lng: number;
  lowCoordinatePrecision?: boolean;
}): PoiDataQuality {
  const { pois, lat, lng, lowCoordinatePrecision } = params;
  const categoryCoverage = emptyCoverage();
  for (const p of pois) {
    categoryCoverage[p.category] = (categoryCoverage[p.category] ?? 0) + 1;
  }

  const totalPoiCount = pois.length;
  const nonEmptyCats = PRODUCT_POI_CATEGORIES.filter((c) => categoryCoverage[c] > 0).length;
  const emptyCats = PRODUCT_POI_CATEGORIES.length - nonEmptyCats;
  const urbanBucharest = isLikelyBucharestUrban(lat, lng);

  const reasons: string[] = [];

  if (lowCoordinatePrecision) {
    reasons.push("precizie_redusa_coordonate");
  }

  /** Stricter thresholds inside Bucharest bbox — zeros are usually data gaps. */
  const lowTotal = urbanBucharest ? totalPoiCount < 22 : totalPoiCount < 12;
  const manyEmptyCats =
    urbanBucharest && emptyCats >= 4
      ? true
      : emptyCats >= 5 || (totalPoiCount < 20 && emptyCats >= 3);

  if (lowTotal) {
    reasons.push(urbanBucharest ? "putine_poi_in_zona_urbana" : "putine_poi_total");
  }
  if (manyEmptyCats) {
    reasons.push("multe_categorii_goale");
  }
  if (urbanBucharest && totalPoiCount < 30 && emptyCats >= 2) {
    reasons.push("acoperire_osm_posibil_incompleta_bucuresti");
  }

  const lowDataMode = lowTotal || manyEmptyCats || !!lowCoordinatePrecision;

  let confidence: PoiConfidence;
  if (lowDataMode) {
    confidence = "low";
  } else if (totalPoiCount >= 55 && emptyCats <= 1) {
    confidence = "high";
  } else if (totalPoiCount >= 32 && emptyCats <= 2) {
    confidence = "medium";
  } else {
    confidence = "medium";
  }

  return {
    totalPoiCount,
    categoryCoverage,
    confidence,
    lowDataMode,
    reasons,
  };
}
