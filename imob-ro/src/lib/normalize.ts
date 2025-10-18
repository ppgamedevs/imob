// Normalization and geocoding helpers for Link Analyzer (Ziua 6)
// - normalizeExtracted(ex) => canonical features JSON
// - normalizeAddress(addressRaw) => { lat, lng, areaSlug, components }

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

function toInt(v: any): number | null {
  if (v == null) return null;
  const n = parseInt(String(v).replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function toFloat(v: any): number | null {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[,\s]+/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parsePriceInt(v: any): number | null {
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
};

/**
 * Normalize an extracted listing into canonical features.
 * - parses numeric fields
 * - normalizes currency using EXCHANGE_RATE_EUR_TO_RON (fallback 4.9)
 * - optionally geocodes the raw address via Mapbox (MAPBOX_API_TOKEN env)
 */
export async function normalizeExtracted(ex: any): Promise<NormalizedFeatures> {
  const out: NormalizedFeatures = {
    title: ex?.title ?? null,
    currency: ex?.currency ? String(ex.currency).toUpperCase() : null,
    address_raw: ex?.addressRaw ?? null,
    photos: Array.isArray(ex?.photos) ? ex.photos : null,
    area_m2: toInt(ex?.areaM2 ?? ex?.area_m2 ?? null),
    rooms: toFloat(ex?.rooms ?? null),
    floor: toInt(ex?.floor ?? ex?.floorNumber ?? null),
    year_built: toInt(ex?.yearBuilt ?? ex?.year_built ?? null),
    lat: ex?.lat ?? null,
    lng: ex?.lng ?? null,
    price_eur: null,
    price_ron: null,
    area_slug: null,
    address_components: null,
  };

  // Normalize price/currency
  const rawPrice = parsePriceInt(ex?.price ?? ex?.price_eur ?? ex?.price_ron ?? null);
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
    } catch (e) {
      // swallow geocode errors and continue
      // eslint-disable-next-line no-console
      const err: any = e;
      console.warn("normalizeExtracted: geocode failed", err?.message ?? err);
    }
  }

  // If area_slug still missing, try derive from address components or raw address
  if (!out.area_slug) {
    const comp = out.address_components || {};
    const candidate = comp.neighbourhood || comp.locality || comp.place || comp.region || comp.city;
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
    const candidate = components.neighborhood || components.locality || components.place || components.region || components.city;
    const areaSlug = slugify(candidate ?? null);

    return {
      lat: lat ?? null,
      lng: lng ?? null,
      areaSlug,
      components,
    };
  } catch (e) {
    return null;
  }
}

export default normalizeExtracted;
