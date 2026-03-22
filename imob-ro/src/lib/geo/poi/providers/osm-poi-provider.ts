/**
 * OSM / Overpass POI provider — batched queries, normalize, dedupe, quality.
 *
 * Failure modes we guard against (see also `pipeline-audit.md` in same folder):
 * - Uniform post-filter to a short user radius → false zeros for categories that need longer context
 * - Missing way/relation → undercount in mapped areas
 * - Too-narrow tags (e.g. only shop=supermarket) → empty dense cities
 * - Duplicate node+way for same feature → inflated counts before dedupe
 */
import { fetchOverpassInterpret } from "@/lib/geo/overpass";
import { isPoiPipelineDebugEnabled } from "@/lib/geo/poi/constants";
import { dedupeNormalizedPois } from "@/lib/geo/poi/deduplicate-pois";
import { evaluatePoiDataQuality } from "@/lib/geo/poi/evaluate-poi-quality";
import {
  type OsmElement,
  osmElementToNormalizedPoi,
} from "@/lib/geo/poi/normalize-osm-poi";
import { buildAllOverpassQueries } from "@/lib/geo/poi/overpass-query";
import type { PoiProvider } from "@/lib/geo/poi/providers/types";
import type { NormalizedPoi, PoiProviderResult, PoiQueryInput } from "@/lib/geo/poi/types";

function parseElements(json: unknown): OsmElement[] {
  const j = json as { elements?: OsmElement[]; remark?: string } | null;
  if (j?.remark) {
    console.warn("[osm-poi-provider] overpass remark:", j.remark);
  }
  return j?.elements ?? [];
}

function debugLog(input: PoiQueryInput, label: string, payload: unknown) {
  const on = input.options?.debug || isPoiPipelineDebugEnabled();
  if (!on) return;
  console.info(`[poi-pipeline] ${label}`, payload);
}

export class OsmPoiProvider implements PoiProvider {
  readonly id = "osm";

  async getNearbyPois(input: PoiQueryInput): Promise<PoiProviderResult> {
    const { lat, lng, userRadiusM, options } = input;
    const floorR = userRadiusM;
    const queries = buildAllOverpassQueries(lat, lng, floorR);

    debugLog(input, "input", { lat, lng, userRadiusM, queryCount: queries.length });

    const seen = new Set<string>();
    let rawElementCount = 0;
    const normalized: NormalizedPoi[] = [];

    for (const query of queries) {
      const json = await fetchOverpassInterpret(query);
      const els = parseElements(json);
      rawElementCount += els.length;
      for (const el of els) {
        const key = `${el.type}/${el.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const p = osmElementToNormalizedPoi(el, lat, lng);
        if (p) normalized.push(p);
      }
    }

    const preDedupe = normalized.length;
    const deduped = dedupeNormalizedPois(normalized);
    const quality = evaluatePoiDataQuality({
      pois: deduped,
      lat,
      lng,
      lowCoordinatePrecision: options?.lowCoordinatePrecision,
    });

    debugLog(input, "counts", {
      rawElements: rawElementCount,
      normalizedPreDedupe: preDedupe,
      deduped: deduped.length,
      categoryCoverage: quality.categoryCoverage,
      lowDataMode: quality.lowDataMode,
      confidence: quality.confidence,
      reasons: quality.reasons,
    });

    return {
      normalized: deduped,
      rawElementCount,
      dedupedCount: deduped.length,
      quality,
      queriesExecuted: queries.length,
    };
  }
}
