/**
 * Zone intel POI pipeline (production).
 *
 * AUDIT SUMMARY (false zeros):
 * - Previously: one fetch radius + uniform post-filter to `userRadiusM` erased POIs that are
 *   legitimately between 500–1500 m for schools / healthcare / shops.
 * - Previously: narrow shop tags missed dense `shop=*` mapping.
 * - Fix: batched Overpass with per-tag semantic `around:` + `floorRadiusM = userRadiusM`,
 *   normalization + dedupe, then per-intel-category display cap
 *   `max(userRadiusM, INTEL_CATEGORY_MIN_RADIUS_M[k])`.
 *
 * @see src/lib/geo/poi/pipeline-audit.md
 */
import { fetchGooglePlacesByCategory } from "@/lib/geo/googlePlacesNearby";
import {
  buildIngestionMeta,
  countAllPois,
  mergeAndDedupeCategory,
  type PoiIngestionMeta,
} from "@/lib/geo/poiIngestion";
import type { OverpassPoi } from "@/lib/geo/overpass";
import {
  INTEL_CATEGORY_MIN_RADIUS_M,
  MAX_POI_RADIUS_M,
  isPoiPipelineDebugEnabled,
} from "@/lib/geo/poi/constants";
import {
  groupNormalizedIntoIntelBuckets,
  trimIntelBucketsToLimits,
} from "@/lib/geo/poi/map-to-intel";
import { OsmPoiProvider } from "@/lib/geo/poi/providers/osm-poi-provider";
import type { PoiDataQuality } from "@/lib/geo/poi/types";
import {
  POI_CATEGORIES,
  POI_CATEGORY_KEYS,
  type PoiCategoryKey,
} from "@/lib/geo/poiCategories";

/** If OSM normalized count (pre-Google) is below this, try Google Places when configured. */
export const GOOGLE_POI_FALLBACK_THRESHOLD = 18;

const osmProvider = new OsmPoiProvider();

/** Bump when Overpass catalog or normalization changes (invalidates POI cache consumers). */
export const INTEL_POI_PIPELINE_VERSION = "poi-v4-batched";

function filterIntelBucketsBySemanticDisplay(
  pois: Record<PoiCategoryKey, OverpassPoi[]>,
  userRadiusM: number,
): Record<PoiCategoryKey, OverpassPoi[]> {
  const out = {} as Record<PoiCategoryKey, OverpassPoi[]>;
  for (const k of POI_CATEGORY_KEYS) {
    const cap = Math.min(
      MAX_POI_RADIUS_M,
      Math.max(userRadiusM, INTEL_CATEGORY_MIN_RADIUS_M[k]),
    );
    out[k] = (pois[k] ?? []).filter((p) => p.distanceM <= cap);
  }
  return out;
}

function attachPipelineMeta(
  base: PoiIngestionMeta,
  quality: PoiDataQuality,
  rawElements: number,
  queriesExecuted: number,
): PoiIngestionMeta {
  return {
    ...base,
    rawOsmElementCount: rawElements,
    overpassQueriesRun: queriesExecuted,
    dataConfidence: quality.confidence,
    dataQualityReasons: quality.reasons,
  };
}

export async function fetchIntelPoisMerged(params: {
  lat: number;
  lng: number;
  userRadiusM: number;
  /** Set when geocode is block / centroid — lowers confidence */
  lowCoordinatePrecision?: boolean;
}): Promise<{
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>;
  poiIngestion: PoiIngestionMeta;
  pipelineQuality: PoiDataQuality;
}> {
  const { lat, lng, userRadiusM, lowCoordinatePrecision } = params;

  const osmResult = await osmProvider.getNearbyPois({
    lat,
    lng,
    userRadiusM,
    options: {
      debug: isPoiPipelineDebugEnabled(),
      lowCoordinatePrecision,
    },
  });

  let intelBuckets = trimIntelBucketsToLimits(
    filterIntelBucketsBySemanticDisplay(
      groupNormalizedIntoIntelBuckets(osmResult.normalized),
      userRadiusM,
    ),
  );

  const osmByCat = { ...intelBuckets };
  const osmTotal = countAllPois(osmByCat);

  let googleByCat: Record<PoiCategoryKey, OverpassPoi[]> = Object.fromEntries(
    POI_CATEGORY_KEYS.map((k) => [k, [] as OverpassPoi[]]),
  ) as Record<PoiCategoryKey, OverpassPoi[]>;
  let usedGoogleFallback = false;

  const fetchR = Math.min(
    MAX_POI_RADIUS_M,
    Math.max(
      userRadiusM,
      ...POI_CATEGORY_KEYS.map((k) => INTEL_CATEGORY_MIN_RADIUS_M[k]),
    ),
  );

  if (osmTotal < GOOGLE_POI_FALLBACK_THRESHOLD) {
    usedGoogleFallback = true;
    googleByCat = await fetchGooglePlacesByCategory(lat, lng, fetchR);
  }

  let mergedByCat = {} as Record<PoiCategoryKey, OverpassPoi[]>;
  for (const k of POI_CATEGORY_KEYS) {
    const lim = POI_CATEGORIES[k].defaultLimit;
    mergedByCat[k] = mergeAndDedupeCategory(
      osmByCat[k] ?? [],
      googleByCat[k] ?? [],
      lim,
    );
  }

  mergedByCat = trimIntelBucketsToLimits(
    filterIntelBucketsBySemanticDisplay(mergedByCat, userRadiusM),
  );

  let poiIngestion = buildIngestionMeta(
    osmByCat,
    googleByCat,
    mergedByCat,
    fetchR,
    usedGoogleFallback,
  );
  poiIngestion = attachPipelineMeta(
    poiIngestion,
    osmResult.quality,
    osmResult.rawElementCount,
    osmResult.queriesExecuted,
  );

  if (osmResult.quality.lowDataMode && !poiIngestion.notice) {
    poiIngestion = {
      ...poiIngestion,
      notice:
        "Vizibilitate redusa asupra zonei — nu am identificat suficiente puncte din datele disponibile. Scorurile pot fi subestimate.",
    };
  }

  return {
    poisByCategory: mergedByCat,
    poiIngestion,
    pipelineQuality: osmResult.quality,
  };
}
