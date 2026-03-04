/**
 * Transport summary: nearest metro, transit density, walk times.
 * Uses pre-imported GeoTransportStop data with fallback to static metro list.
 */
import { prisma } from "@/lib/db";
import { haversineM } from "@/lib/geo";
import { METRO_STATIONS } from "@/lib/data/metro";
import { WALKING_SPEED_M_PER_MIN } from "@/lib/constants";

// ---- Types ----

type Mode = "METRO" | "TRAM" | "BUS" | "TROLLEY";

export interface NearbyStop {
  id: string;
  name: string;
  mode: Mode;
  distanceM: number;
  walkMinutes: number;
  lat: number;
  lng: number;
}

export interface TransportSummary {
  nearestMetro: NearbyStop | null;
  nearestTram: NearbyStop | null;
  /** Stops within 400m by mode */
  within400m: Record<Mode, number>;
  /** Stops within 800m by mode */
  within800m: Record<Mode, number>;
  /** Total unique stops within 800m */
  totalNearby: number;
  /** Transit density score 0-100 */
  transitScore: number;
  /** All stops within 800m, sorted by distance */
  stops: NearbyStop[];
}

// ---- Constants ----

const INNER_RADIUS_M = 400;
const OUTER_RADIUS_M = 800;
const METRO_SEARCH_RADIUS_M = 2000;

const ZERO_MODES: Record<Mode, number> = { METRO: 0, TRAM: 0, BUS: 0, TROLLEY: 0 };

// ---- Score computation ----

function computeTransitScore(
  within400m: Record<Mode, number>,
  within800m: Record<Mode, number>,
  nearestMetroM: number | null,
): number {
  let score = 0;

  // Metro proximity (up to 40 points)
  if (nearestMetroM != null) {
    if (nearestMetroM <= 300) score += 40;
    else if (nearestMetroM <= 600) score += 30;
    else if (nearestMetroM <= 1000) score += 20;
    else if (nearestMetroM <= 1500) score += 10;
  }

  // Inner ring density (up to 35 points)
  const inner = within400m.METRO + within400m.TRAM + within400m.BUS + within400m.TROLLEY;
  score += Math.min(inner * 5, 35);

  // Outer ring density (up to 15 points)
  const outer = within800m.METRO + within800m.TRAM + within800m.BUS + within800m.TROLLEY;
  score += Math.min(outer * 2, 15);

  // Mode variety bonus (up to 10 points)
  const modesPresent = (["METRO", "TRAM", "BUS", "TROLLEY"] as Mode[]).filter(
    (m) => within800m[m] > 0,
  ).length;
  score += modesPresent * 2.5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ---- Main API ----

export async function getTransportSummary(
  lat: number,
  lng: number,
): Promise<TransportSummary> {
  const degBuffer = METRO_SEARCH_RADIUS_M / 111_000 + 0.002;

  const dbStops = await prisma.geoTransportStop.findMany({
    where: {
      lat: { gte: lat - degBuffer, lte: lat + degBuffer },
      lng: { gte: lng - degBuffer, lte: lng + degBuffer },
    },
  });

  // Compute distances
  const withDist = dbStops
    .map((s) => {
      const d = haversineM(lat, lng, s.lat, s.lng);
      return {
        id: s.id,
        name: s.name,
        mode: s.mode as Mode,
        distanceM: Math.round(d),
        walkMinutes: Math.round(d / WALKING_SPEED_M_PER_MIN),
        lat: s.lat,
        lng: s.lng,
      };
    })
    .filter((s) => s.distanceM <= METRO_SEARCH_RADIUS_M)
    .sort((a, b) => a.distanceM - b.distanceM);

  // Find nearest metro from DB
  let nearestMetro: NearbyStop | null =
    withDist.find((s) => s.mode === "METRO") ?? null;

  // Fallback: if no metro in DB, use static METRO_STATIONS
  if (!nearestMetro) {
    let bestStaticDist = Infinity;
    let bestStaticName = "";
    for (const st of METRO_STATIONS) {
      const d = haversineM(lat, lng, st.lat, st.lng);
      if (d < bestStaticDist) {
        bestStaticDist = d;
        bestStaticName = st.name;
      }
    }
    if (bestStaticDist <= METRO_SEARCH_RADIUS_M) {
      nearestMetro = {
        id: "static-metro",
        name: bestStaticName,
        mode: "METRO",
        distanceM: Math.round(bestStaticDist),
        walkMinutes: Math.round(bestStaticDist / WALKING_SPEED_M_PER_MIN),
        lat: 0,
        lng: 0,
      };
    }
  }

  const nearestTram: NearbyStop | null =
    withDist.find((s) => s.mode === "TRAM") ?? null;

  // Count by mode within radii
  const within400m: Record<Mode, number> = { ...ZERO_MODES };
  const within800m: Record<Mode, number> = { ...ZERO_MODES };

  for (const s of withDist) {
    if (s.distanceM <= OUTER_RADIUS_M) {
      within800m[s.mode]++;
      if (s.distanceM <= INNER_RADIUS_M) {
        within400m[s.mode]++;
      }
    }
  }

  const stopsWithin800 = withDist.filter((s) => s.distanceM <= OUTER_RADIUS_M);

  const transitScore = computeTransitScore(
    within400m,
    within800m,
    nearestMetro?.distanceM ?? null,
  );

  return {
    nearestMetro,
    nearestTram,
    within400m,
    within800m,
    totalNearby: stopsWithin800.length,
    transitScore,
    stops: stopsWithin800,
  };
}

/**
 * Load transport stops within a radius for map layer display.
 */
export async function getTransportStopsForMap(
  lat: number,
  lng: number,
  radiusM = 1000,
): Promise<NearbyStop[]> {
  const clamped = Math.min(radiusM, 2000);
  const degBuffer = clamped / 111_000 + 0.002;

  const dbStops = await prisma.geoTransportStop.findMany({
    where: {
      lat: { gte: lat - degBuffer, lte: lat + degBuffer },
      lng: { gte: lng - degBuffer, lte: lng + degBuffer },
    },
  });

  const results: NearbyStop[] = [];
  for (const s of dbStops) {
    const d = haversineM(lat, lng, s.lat, s.lng);
    if (d <= clamped) {
      results.push({
        id: s.id,
        name: s.name,
        mode: s.mode as Mode,
        distanceM: Math.round(d),
        walkMinutes: Math.round(d / WALKING_SPEED_M_PER_MIN),
        lat: s.lat,
        lng: s.lng,
      });
    }
  }

  results.sort((a, b) => a.distanceM - b.distanceM);
  return results;
}
