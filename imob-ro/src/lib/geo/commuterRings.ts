/**
 * Commuter rings computation.
 *
 * Provides 15-min and 30-min walk-time rings.
 * Uses OpenRouteService (ORS) isochrones if API key is set,
 * otherwise falls back to straight-line distance circles.
 */

const ORS_API_KEY = process.env.ORS_API_KEY;
const ORS_ENDPOINT = "https://api.openrouteservice.org/v2/isochrones/foot-walking";
const WALK_SPEED_M_PER_MIN = 80; // ~4.8 km/h

// ---- Types ----

export interface CommuterRing {
  minutes: number;
  label: string;
  /** If polygon from routing provider */
  polygon: [number, number][] | null;
  /** Fallback circle radius in meters */
  circleRadiusM: number;
  /** Whether this is real routing data or fallback */
  isEstimate: boolean;
}

export interface MetroCommute {
  stationName: string;
  distanceM: number;
  walkMinutes: number;
}

export interface CommuterResult {
  rings: CommuterRing[];
  nearestMetro: MetroCommute | null;
  provider: "ors" | "fallback";
}

// ---- ORS integration ----

async function fetchOrsIsochrones(
  lat: number,
  lng: number,
): Promise<CommuterRing[] | null> {
  if (!ORS_API_KEY) return null;

  try {
    const body = {
      locations: [[lng, lat]], // ORS uses [lng, lat]
      range: [900, 1800], // 15min, 30min in seconds
      range_type: "time",
    };

    const res = await fetch(ORS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: ORS_API_KEY,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const features = json?.features;
    if (!Array.isArray(features) || features.length === 0) return null;

    const rings: CommuterRing[] = [];

    for (const feature of features) {
      const minutes = Math.round((feature.properties?.value ?? 0) / 60);
      const coords: [number, number][] = feature.geometry?.coordinates?.[0]?.map(
        (c: [number, number]) => [c[1], c[0]] as [number, number], // flip to [lat, lng]
      ) ?? null;

      rings.push({
        minutes,
        label: `${minutes} min pe jos`,
        polygon: coords,
        circleRadiusM: minutes * WALK_SPEED_M_PER_MIN,
        isEstimate: false,
      });
    }

    return rings.length > 0 ? rings : null;
  } catch {
    return null;
  }
}

// ---- Fallback circles ----

function fallbackRings(): CommuterRing[] {
  return [
    {
      minutes: 15,
      label: "~15 min pe jos",
      polygon: null,
      circleRadiusM: 15 * WALK_SPEED_M_PER_MIN, // 1200m
      isEstimate: true,
    },
    {
      minutes: 30,
      label: "~30 min pe jos",
      polygon: null,
      circleRadiusM: 30 * WALK_SPEED_M_PER_MIN, // 2400m
      isEstimate: true,
    },
  ];
}

// ---- Main API ----

export async function computeCommuterRings(
  lat: number,
  lng: number,
  nearestMetroData?: { name: string; distanceM: number } | null,
): Promise<CommuterResult> {
  // Try ORS first
  const orsRings = await fetchOrsIsochrones(lat, lng);

  const rings = orsRings ?? fallbackRings();

  // Metro commute
  let nearestMetro: MetroCommute | null = null;
  if (nearestMetroData) {
    nearestMetro = {
      stationName: nearestMetroData.name,
      distanceM: nearestMetroData.distanceM,
      walkMinutes: Math.round(nearestMetroData.distanceM / WALK_SPEED_M_PER_MIN),
    };
  }

  return {
    rings,
    nearestMetro,
    provider: orsRings ? "ors" : "fallback",
  };
}
