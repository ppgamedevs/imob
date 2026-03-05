/**
 * GET /api/geocode?q=...
 *
 * Server-side geocoding proxy for address autocomplete.
 * Uses Nominatim with proper User-Agent, rate limiting, and caching.
 * Covers Bucharest + Ilfov with bounded search.
 */
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/http/rate";

export const dynamic = "force-dynamic";

const USER_AGENT = "ImobIntel/1.0 (https://imobintel.ro)";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const PHOTON = "https://photon.komoot.io/api";
const TIMEOUT_MS = 5_000;

// Bounding box: entire Bucharest + Ilfov county
// Format for Nominatim viewbox: west,south,east,north (lon,lat,lon,lat)
const VIEWBOX_W = 25.85;
const VIEWBOX_S = 44.30;
const VIEWBOX_E = 26.35;
const VIEWBOX_N = 44.62;

// In-memory LRU cache (survives across requests within the same server process)
const cache = new Map<string, { data: GeoResult[]; ts: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CACHE_MAX = 2000;

// Rate limiter: track last request time to Nominatim (max 1/sec)
let lastNominatimCall = 0;

interface GeoResult {
  placeId: string;
  display: string;
  lat: number;
  lng: number;
  type: string;
  road?: string;
  houseNumber?: string;
  suburb?: string;
  district?: string;
  city?: string;
}

function cacheKey(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

function evictOldest() {
  if (cache.size < CACHE_MAX) return;
  const oldest = cache.keys().next().value;
  if (oldest != null) cache.delete(oldest);
}

function formatPhotonResult(f: Record<string, unknown>): GeoResult | null {
  const props = f.properties as Record<string, unknown> | undefined;
  const geo = f.geometry as { coordinates?: [number, number] } | undefined;
  if (!props || !geo?.coordinates) return null;
  const [lng, lat] = geo.coordinates;
  if (lat < VIEWBOX_S || lat > VIEWBOX_N || lng < VIEWBOX_W || lng > VIEWBOX_E) return null;

  const parts: string[] = [];
  const street = props.street as string | undefined;
  const housenumber = props.housenumber as string | undefined;
  const name = props.name as string | undefined;
  if (street) {
    parts.push(housenumber ? `${street} ${housenumber}` : street);
  } else if (name) {
    parts.push(name);
  }
  const district = (props.district as string | undefined) ?? (props.locality as string | undefined);
  if (district) parts.push(district);
  const city = props.city as string | undefined;
  if (city) parts.push(city);

  return {
    placeId: `photon-${props.osm_id ?? lat.toFixed(5)}`,
    display: parts.filter(Boolean).join(", ") || (props.name as string) || "Necunoscut",
    lat,
    lng,
    type: (props.osm_value as string) ?? (props.type as string) ?? "place",
    road: street,
    houseNumber: housenumber,
    suburb: district,
    city,
  };
}

function formatNominatimResult(r: Record<string, unknown>): GeoResult | null {
  const lat = parseFloat(r.lat as string);
  const lng = parseFloat(r.lon as string);
  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < VIEWBOX_S || lat > VIEWBOX_N || lng < VIEWBOX_W || lng > VIEWBOX_E) return null;

  const addr = r.address as Record<string, string> | undefined;
  const parts: string[] = [];
  if (addr?.road) {
    parts.push(addr.house_number ? `${addr.road} ${addr.house_number}` : addr.road);
  }
  if (addr?.suburb || addr?.city_district) {
    parts.push(addr.suburb || addr.city_district || "");
  }
  if (addr?.city) parts.push(addr.city);
  const display =
    parts.filter(Boolean).join(", ") ||
    (r.display_name as string || "").split(",").slice(0, 3).join(",").trim();

  return {
    placeId: String(r.place_id ?? lat.toFixed(5)),
    display,
    lat,
    lng,
    type: (r.type as string) ?? "place",
    road: addr?.road,
    houseNumber: addr?.house_number,
    suburb: addr?.suburb || addr?.city_district,
    district: addr?.city_district,
    city: addr?.city,
  };
}

async function searchPhoton(query: string, signal: AbortSignal): Promise<GeoResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: "8",
    lat: "44.43",
    lon: "26.10",
    zoom: "16",
    bbox: `${VIEWBOX_W},${VIEWBOX_S},${VIEWBOX_E},${VIEWBOX_N}`,
  });
  const res = await fetch(`${PHOTON}?${params}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal,
  });
  if (!res.ok) return [];
  const json = await res.json();
  const features = json?.features;
  if (!Array.isArray(features)) return [];
  return features
    .map((f: Record<string, unknown>) => formatPhotonResult(f))
    .filter((r: GeoResult | null): r is GeoResult => r !== null);
}

async function searchNominatim(query: string, signal: AbortSignal): Promise<GeoResult[]> {
  // Rate limit: wait if needed
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastNominatimCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimCall = Date.now();

  const needsCity = !/bucure[sș]ti|ilfov|sector/i.test(query);
  const q = needsCity ? `${query}, Bucuresti` : query;

  const params = new URLSearchParams({
    q,
    format: "json",
    addressdetails: "1",
    limit: "8",
    countrycodes: "ro",
    viewbox: `${VIEWBOX_W},${VIEWBOX_S},${VIEWBOX_E},${VIEWBOX_N}`,
    bounded: "1",
  });
  const res = await fetch(`${NOMINATIM}?${params}`, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "ro",
      Accept: "application/json",
    },
    signal,
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .map((r: Record<string, unknown>) => formatNominatimResult(r))
    .filter((r: GeoResult | null): r is GeoResult => r !== null);
}

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try {
    await rateLimit(`geocode:${ip}`, 30, 60_000);
  } catch {
    return NextResponse.json({ results: [], error: "rate_limit" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2 || q.length > 200) {
    return NextResponse.json({ results: [] });
  }

  // Check cache
  const key = cacheKey(q);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({ results: cached.data, cached: true });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Try Photon first (faster, designed for autocomplete)
    let results = await searchPhoton(q, controller.signal);

    // Fallback to Nominatim if Photon returned nothing
    if (results.length === 0) {
      results = await searchNominatim(q, controller.signal);
    }

    // Cache the results
    evictOldest();
    cache.set(key, { data: results, ts: Date.now() });

    return NextResponse.json({ results });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return NextResponse.json({ results: [], error: "timeout" }, { status: 504 });
    }
    return NextResponse.json({ results: [], error: "geocode failed" }, { status: 500 });
  } finally {
    clearTimeout(timer);
  }
}
