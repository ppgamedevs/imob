import { mapAqiToLabel, type AqiLabelResult } from "./aqi-label";

const WAQI_GEO = "https://api.waqi.info/feed/geo:";
const DEFAULT_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 45 * 60 * 1000;

export interface AirQualityReading {
  aqi: number;
  label: string;
  labelMeta: AqiLabelResult;
  updatedAt: string;
  pm25?: number;
  no2?: number;
  stationName?: string;
  source: "AQICN";
}

interface CacheEntry {
  at: number;
  data: AirQualityReading | null;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)};${lng.toFixed(2)}`;
}

function parseIaqiValue(raw: unknown): number | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const v = (raw as { v?: unknown }).v;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/**
 * World Air Quality Index (WAQI / AQICN) — geo feed.
 * Requires `WAQI_TOKEN` in env. Returns null if token missing, network error, or bad response.
 */
export async function getAirQuality(
  lat: number,
  lng: number,
  options?: { timeoutMs?: number },
): Promise<AirQualityReading | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const token = process.env.WAQI_TOKEN?.trim();
  if (!token) return null;

  const key = cacheKey(lat, lng);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_TTL_MS) {
    return hit.data;
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = `${WAQI_GEO}${lat};${lng}/?token=${encodeURIComponent(token)}`;

  let data: unknown;
  try {
    const res = await fetch(url, {
      next: { revalidate: 2700 },
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      cache.set(key, { at: now, data: null });
      return null;
    }
    data = await res.json();
  } catch {
    cache.set(key, { at: now, data: null });
    return null;
  }

  if (!data || typeof data !== "object") {
    cache.set(key, { at: now, data: null });
    return null;
  }
  const root = data as { status?: string; data?: Record<string, unknown> };
  if (root.status !== "ok" || !root.data || typeof root.data !== "object") {
    cache.set(key, { at: now, data: null });
    return null;
  }

  const d = root.data;
  const aqiRaw = d.aqi;
  const aqi =
    typeof aqiRaw === "number" && Number.isFinite(aqiRaw)
      ? aqiRaw
      : typeof aqiRaw === "string" && aqiRaw !== "-" && Number.isFinite(Number(aqiRaw))
        ? Number(aqiRaw)
        : NaN;
  if (!Number.isFinite(aqi)) {
    cache.set(key, { at: now, data: null });
    return null;
  }

  const time = d.time && typeof d.time === "object" ? (d.time as { s?: string }) : null;
  const updatedAt = typeof time?.s === "string" && time.s.trim() ? time.s.trim() : new Date().toISOString();

  const iaqi = d.iaqi && typeof d.iaqi === "object" ? (d.iaqi as Record<string, unknown>) : {};
  const pm25 = parseIaqiValue(iaqi.pm25);
  const no2 = parseIaqiValue(iaqi.no2);

  const city = d.city && typeof d.city === "object" ? (d.city as { name?: string }) : null;
  const stationName = typeof city?.name === "string" ? city.name : undefined;

  const labelMeta = mapAqiToLabel(aqi);
  const reading: AirQualityReading = {
    aqi: Math.round(aqi),
    label: labelMeta.label,
    labelMeta,
    updatedAt,
    pm25,
    no2,
    stationName,
    source: "AQICN",
  };

  cache.set(key, { at: now, data: reading });
  return reading;
}
