/**
 * Builds production Overpass QL: batched queries, per-fragment `around:` radii, `out center tags`.
 */
import {
  OVERPASS_MAX_FRAGMENTS_PER_QUERY,
  OSM_OVERPASS_CATALOG,
  expandNwr,
  type CatalogLine,
} from "@/lib/geo/poi/overpass-lines";

const DEFAULT_TIMEOUT_S = 45;

export function splitCatalogIntoBatches(catalog: CatalogLine[]): CatalogLine[][] {
  const batches: CatalogLine[][] = [];
  let cur: CatalogLine[] = [];
  let fragCount = 0;
  for (const row of catalog) {
    const add = expandNwr(row.nodeQl).length;
    if (fragCount + add > OVERPASS_MAX_FRAGMENTS_PER_QUERY && cur.length > 0) {
      batches.push(cur);
      cur = [];
      fragCount = 0;
    }
    cur.push(row);
    fragCount += add;
  }
  if (cur.length > 0) batches.push(cur);
  return batches;
}

export function buildOverpassQueryFromBatch(
  lat: number,
  lng: number,
  batch: CatalogLine[],
  timeoutS = DEFAULT_TIMEOUT_S,
  /** Raise every `around:` to at least this (user map radius). */
  floorRadiusM = 0,
): string {
  const lines: string[] = [];
  for (const row of batch) {
    const r = Math.max(row.radiusM, floorRadiusM);
    for (const frag of expandNwr(row.nodeQl)) {
      lines.push(`  ${frag}(around:${r},${lat},${lng});`);
    }
  }
  return `[out:json][timeout:${timeoutS}];
(
${lines.join("\n")}
);
out center tags;`;
}

export function buildAllOverpassQueries(
  lat: number,
  lng: number,
  floorRadiusM = 0,
): string[] {
  return splitCatalogIntoBatches(OSM_OVERPASS_CATALOG).map((b) =>
    buildOverpassQueryFromBatch(lat, lng, b, 45, floorRadiusM),
  );
}
