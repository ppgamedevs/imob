import { fetchCustomOverpassFeatures } from "@/lib/geo/overpass";
import type { OverpassFeature } from "@/lib/geo/overpass";

/** Shown on pollution, traffic, flood proxy layers (web + PDF). */
export const OSM_PROXY_DISCLAIMER_RO =
  "Estimare bazata pe date publice si modele proprii.";

/** Major / through roads — stronger signal for air-noise exposure proxies. */
const MAJOR_HW = new Set([
  "motorway",
  "motorway_link",
  "trunk",
  "trunk_link",
  "primary",
  "primary_link",
  "secondary",
]);

/** Collector + local — traffic density / urban fabric. */
const COLLECTOR_HW = new Set(["tertiary", "unclassified"]);

const LOCAL_HW = new Set(["residential", "living_street", "service"]);

export type RoadBucketCounts = {
  major: number;
  collector: number;
  local: number;
  other: number;
};

export function bucketHighwayClass(tags: Record<string, string>): keyof RoadBucketCounts | "other" {
  const h = tags.highway ?? "";
  if (MAJOR_HW.has(h)) return "major";
  if (COLLECTOR_HW.has(h)) return "collector";
  if (LOCAL_HW.has(h)) return "local";
  return "other";
}

export function countRoadBuckets(roads: OverpassFeature[]): RoadBucketCounts {
  const out: RoadBucketCounts = { major: 0, collector: 0, local: 0, other: 0 };
  for (const r of roads) {
    const b = bucketHighwayClass(r.tags);
    out[b] += 1;
  }
  return out;
}

export function nearestRoad(
  roads: OverpassFeature[],
): { distanceM: number; highway: string } | null {
  if (roads.length === 0) return null;
  const first = roads[0];
  return { distanceM: first.distanceM, highway: first.tags.highway ?? "necunoscut" };
}

/** First hit by distance among roads whose highway satisfies predicate (list is distance-sorted). */
export function nearestRoadWhere(
  roads: OverpassFeature[],
  predicate: (highway: string) => boolean,
): { distanceM: number; highway: string } | null {
  for (const r of roads) {
    const hw = r.tags.highway ?? "";
    if (predicate(hw)) return { distanceM: r.distanceM, highway: hw };
  }
  return null;
}

export function isMajorHighway(highway: string): boolean {
  return MAJOR_HW.has(highway);
}

/**
 * Stress-adjusted proximity (meters): lower = worse expected exposure.
 * Major highways use a smaller multiplier so the same physical distance scores higher risk.
 */
export function pollutionProximityStress(distanceM: number, highway: string): number {
  const mult: Record<string, number> = {
    motorway: 0.32,
    motorway_link: 0.36,
    trunk: 0.38,
    trunk_link: 0.42,
    primary: 0.52,
    primary_link: 0.55,
    secondary: 0.68,
    tertiary: 0.82,
    unclassified: 0.92,
  };
  const m = mult[highway] ?? 0.88;
  return distanceM * m;
}

export function roadDensityPerKm2(count: number, radiusM: number): number {
  const km = radiusM / 1000;
  const area = Math.PI * km * km;
  if (area <= 0) return 0;
  return Math.round(count / area);
}

/** Append disclaimer as the last detail line (2–3 bullets + disclaimer). */
export function withProxyDisclaimer(bullets: string[]): string[] {
  const trimmed = bullets.filter((b) => b.trim().length > 0).slice(0, 3);
  return [...trimmed, OSM_PROXY_DISCLAIMER_RO];
}

/** Single Overpass pull: road hierarchy + density around point (OSM ways, center geometry). */
export async function fetchRoadNetworkAround(
  lat: number,
  lng: number,
  radiusM: number,
  cacheCategory: string,
  limit = 100,
): Promise<OverpassFeature[]> {
  return fetchCustomOverpassFeatures({
    lat,
    lng,
    radiusM,
    cacheCategory,
    limit,
    filters: [
      'way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|tertiary|unclassified|residential|living_street|service)$"]',
    ],
  }).catch(() => []);
}
