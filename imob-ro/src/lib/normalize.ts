// Normalization and geocoding helpers for Link Analyzer (Ziua 6)
// - normalizeExtracted(ex) => canonical features JSON
// - normalizeAddress(addressRaw) => { lat, lng, areaSlug, components }

/* eslint-disable @typescript-eslint/no-explicit-any */
const DEFAULT_EUR_TO_RON = Number(process.env.EXCHANGE_RATE_EUR_TO_RON) || 4.9;
const MAPBOX_TOKEN = process.env.MAPBOX_API_TOKEN || "";

function slugify(input?: string | null) {
  if (!input) return null;
  return input
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toInt(v: unknown): number | null {
  if (v == null) return null;
  const n = parseInt(String(v).replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function toFloat(v: unknown): number | null {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[,\s]+/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parsePriceInt(v: unknown): number | null {
  if (v == null) return null;
  // remove any non-digit characters (treat dots/commas/spaces as separators)
  const s = String(v).replace(/[^0-9]/g, "");
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export type NormalizedFeatures = {
  title?: string | null;
  price_eur?: number | null;
  price_ron?: number | null;
  currency?: string | null;
  area_m2?: number | null;
  rooms?: number | null;
  floor?: number | null;
  year_built?: number | null;
  lat?: number | null;
  lng?: number | null;
  address_raw?: string | null;
  area_slug?: string | null;
  address_components?: Record<string, any> | null;
  photos?: string[] | null;
  // commute attributes (meters and minutes)
  dist_to_metro?: number | null; // meters
  time_to_metro_min?: number | null; // minutes (walking)
  dist_to_office?: number | null; // meters (optional office coord via env)
  time_to_office_min?: number | null; // minutes
};

/**
 * Normalize an extracted listing into canonical features.
 * - parses numeric fields
 * - normalizes currency using EXCHANGE_RATE_EUR_TO_RON (fallback 4.9)
 * - optionally geocodes the raw address via Mapbox (MAPBOX_API_TOKEN env)
 */
export async function normalizeExtracted(ex: unknown): Promise<NormalizedFeatures> {
  const out: NormalizedFeatures = {
    title: (ex as any)?.title ?? null,
    // unknown-shaped `ex` is casted to any for property access

    currency: (ex as any)?.currency ? String((ex as any).currency).toUpperCase() : null,

    address_raw: (ex as any)?.addressRaw ?? null,

    photos: Array.isArray((ex as any)?.photos) ? (ex as any).photos : null,
    // numeric parsing helpers will coerce values

    area_m2: toInt((ex as any)?.areaM2 ?? (ex as any)?.area_m2 ?? null),

    rooms: toFloat((ex as any)?.rooms ?? null),

    floor: toInt((ex as any)?.floor ?? (ex as any)?.floorNumber ?? null),

    year_built: toInt((ex as any)?.yearBuilt ?? (ex as any)?.year_built ?? null),

    lat: (ex as any)?.lat ?? null,

    lng: (ex as any)?.lng ?? null,
    price_eur: null,
    price_ron: null,
    area_slug: null,
    address_components: null,
    dist_to_metro: null,
    time_to_metro_min: null,
    dist_to_office: null,
    time_to_office_min: null,
  };

  // Normalize price/currency

  const rawPrice = parsePriceInt(
    (ex as any)?.price ?? (ex as any)?.price_eur ?? (ex as any)?.price_ron ?? null,
  );
  const cur = out.currency;
  const rate = DEFAULT_EUR_TO_RON;
  if (rawPrice != null) {
    if (!cur || /eur|€|eur/i.test(String(cur))) {
      out.price_eur = Math.round(rawPrice);
      out.price_ron = Math.round(rawPrice * rate);
      out.currency = "EUR";
    } else if (/ron|lei|ron/i.test(String(cur))) {
      out.price_ron = Math.round(rawPrice);
      out.price_eur = Math.round(rawPrice / rate);
      out.currency = "RON";
    } else {
      // unknown currency, assume EUR
      out.price_eur = Math.round(rawPrice);
      out.price_ron = Math.round(rawPrice * rate);
    }
  }

  // If coordinates are missing but addressRaw exists, attempt geocode
  if ((out.lat == null || out.lng == null) && out.address_raw) {
    try {
      const g = await normalizeAddress(out.address_raw);
      if (g) {
        out.lat = g.lat ?? out.lat;
        out.lng = g.lng ?? out.lng;
        out.area_slug = g.areaSlug ?? out.area_slug;
        out.address_components = g.components ?? out.address_components;
      }
    } catch (_e) {
      // swallow geocode errors and continue
    }
  }

  // If we have coords, try to compute nearest metro station and walking time
  if (out.lat != null && out.lng != null) {
    try {
      const metro = await findNearestMetro(out.lat, out.lng);
      if (metro) {
        out.dist_to_metro = metro.dist ?? null;
        out.time_to_metro_min = metro.timeMin ?? null;
      }

      // Optional: compute time to configured office coord via env variables
      const officeLat = process.env.OFFICE_LAT ? Number(process.env.OFFICE_LAT) : null;
      const officeLng = process.env.OFFICE_LNG ? Number(process.env.OFFICE_LNG) : null;
      if (officeLat && officeLng) {
        const d = haversine(out.lat, out.lng, officeLat, officeLng);
        out.dist_to_office = Math.round(d);
        out.time_to_office_min = Math.round(d / 800); // driving/transport rough: 800 m/min ~ 48 km/h
      }
    } catch (_e) {
      // ignore failures
    }
  }

  // If area_slug still missing, try derive from address components or raw address
  if (!out.area_slug) {
    const comp = out.address_components || {};
    const candidate = comp.neighborhood || comp.locality || comp.place || comp.region || comp.city;
    out.area_slug = slugify(candidate ?? out.address_raw ?? null);
  }

  return out;
}

/**
 * Geocode a raw address using Mapbox and return structured components.
 * Returns null when MAPBOX_API_TOKEN is not set or geocoding fails.
 */
export async function normalizeAddress(addressRaw?: string | null): Promise<{
  lat?: number | null;
  lng?: number | null;
  areaSlug?: string | null;
  components?: Record<string, any> | null;
} | null> {
  if (!addressRaw) return null;
  if (!MAPBOX_TOKEN) return null;

  const q = encodeURIComponent(addressRaw);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${MAPBOX_TOKEN}&limit=1&types=address,place,locality,neighborhood,region&language=ro,en`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const body = await res.json();
    const f = body?.features?.[0];
    if (!f) return null;
    const [lng, lat] = f.center || [null, null];
    // build components map from context
    const components: Record<string, any> = {};
    if (f.context && Array.isArray(f.context)) {
      for (const c of f.context) {
        if (typeof c.id === "string") {
          const parts = c.id.split(".");
          const key = parts[0];
          // prefer text/name fields
          components[key] = c.text || c.name || c.id;
        }
      }
    }
    // top-level place types
    if (f.place_name) components.place_name = f.place_name;
    if (f.text) components.place = f.text;

    // areaSlug: prefer neighbourhood/locality/place then region
    const candidate =
      components.neighborhood ||
      components.locality ||
      components.place ||
      components.region ||
      components.city;
    const areaSlug = slugify(candidate ?? null);

    return {
      lat: lat ?? null,
      lng: lng ?? null,
      areaSlug,
      components,
    };
  } catch {
    return null;
  }
}

// basic haversine distance (meters)
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Try to find nearest metro station using Mapbox dataset: we can query Mapbox places for "metrou" near the coordinates
export async function findNearestMetro(
  lat: number,
  lng: number,
): Promise<{ dist?: number; timeMin?: number } | null> {
  if (!MAPBOX_TOKEN) return null;
  try {
    const q = encodeURIComponent("metrou");
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?proximity=${lng},${lat}&access_token=${MAPBOX_TOKEN}&limit=5&language=ro,en`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const body = await res.json();
    const features = body?.features ?? [];
    if (!Array.isArray(features) || features.length === 0) return null;
    // compute nearest
    let best: any = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const f of features) {
      const center = f.center || null;
      if (!center || center.length < 2) continue;
      const [mlng, mlat] = center;
      const d = haversine(lat, lng, mlat, mlng);
      if (d < bestDist) {
        bestDist = d;
        best = f;
      }
    }
    if (!best) return null;
    // walking speed ~80 m/min
    return { dist: Math.round(bestDist), timeMin: Math.round(bestDist / 80) };
  } catch {
    return null;
  }
}

export default normalizeExtracted;
