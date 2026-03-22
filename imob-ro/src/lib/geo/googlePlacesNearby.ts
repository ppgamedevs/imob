/**
 * Google Places Nearby Search (legacy) — optional enrichment when OSM is sparse.
 * Env: GOOGLE_PLACES_API_KEY or GOOGLE_MAPS_API_KEY (server-side only).
 */
import { haversineM } from "@/lib/geo";
import type { OverpassPoi } from "@/lib/geo/overpass";
import type { PoiCategoryKey } from "@/lib/geo/poiCategories";
import { POI_CATEGORIES, POI_CATEGORY_KEYS } from "@/lib/geo/poiCategories";

const PLACES_ENDPOINT = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

function apiKey(): string | null {
  const k = process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? "";
  return k.trim() || null;
}

type GooglePlaceResult = {
  place_id: string;
  name: string;
  geometry?: { location?: { lat: number; lng: number } };
  types?: string[];
};

function categoryFromGoogleTypes(types: string[]): PoiCategoryKey | null {
  const t = new Set(types ?? []);
  if (
    t.has("subway_station") ||
    t.has("bus_station") ||
    t.has("train_station") ||
    t.has("transit_station") ||
    t.has("light_rail_station")
  ) {
    return "transport";
  }
  if (t.has("pharmacy")) return "supermarket";
  if (
    t.has("supermarket") ||
    t.has("convenience_store") ||
    t.has("grocery_or_supermarket") ||
    t.has("store") ||
    t.has("shopping_mall")
  ) {
    return "supermarket";
  }
  if (t.has("school") || t.has("university") || t.has("primary_school") || t.has("kindergarten")) {
    return "school";
  }
  if (
    t.has("hospital") ||
    t.has("doctor") ||
    t.has("dentist") ||
    t.has("physiotherapist") ||
    t.has("health")
  ) {
    return "medical";
  }
  if (
    t.has("restaurant") ||
    t.has("meal_takeaway") ||
    t.has("cafe") ||
    t.has("bar") ||
    t.has("night_club") ||
    t.has("pub")
  ) {
    return "restaurant";
  }
  if (t.has("park") || t.has("natural_feature")) return "park";
  if (t.has("gym")) return "gym";
  if (t.has("parking")) return "parking";
  return null;
}

function toPoi(
  place: GooglePlaceResult,
  category: PoiCategoryKey,
  centerLat: number,
  centerLng: number,
): OverpassPoi | null {
  const lat = place.geometry?.location?.lat;
  const lng = place.geometry?.location?.lng;
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return {
    id: `google:${place.place_id}`,
    name: place.name ?? null,
    lat,
    lng,
    category,
    subType: place.types?.[0] ?? "google_place",
    tags: {
      source: "google_places",
      types: (place.types ?? []).join("|"),
    },
    distanceM: Math.round(haversineM(centerLat, centerLng, lat, lng)),
  };
}

async function nearbyByType(
  lat: number,
  lng: number,
  radiusM: number,
  type: string,
  key: string,
): Promise<GooglePlaceResult[]> {
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(Math.min(radiusM, 5000)),
    type,
    key,
  });
  const res = await fetch(`${PLACES_ENDPOINT}?${params}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: GooglePlaceResult[]; status?: string };
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") return [];
  return data.results ?? [];
}

/** Google types to query (one legacy Nearby Search per type). */
const GOOGLE_TYPES: string[] = [
  "supermarket",
  "pharmacy",
  "school",
  "hospital",
  "restaurant",
  "cafe",
  "bar",
  "gym",
  "park",
  "parking",
  "bus_station",
  "subway_station",
  "train_station",
];

/**
 * Fetch Google Places near point; map into our POI categories.
 * Returns empty buckets if no API key or error.
 */
export async function fetchGooglePlacesByCategory(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<Record<PoiCategoryKey, OverpassPoi[]>> {
  const empty = POI_CATEGORY_KEYS.reduce(
    (acc, k) => {
      acc[k] = [];
      return acc;
    },
    {} as Record<PoiCategoryKey, OverpassPoi[]>,
  );
  const key = apiKey();
  if (!key) return empty;

  const byCat: Record<PoiCategoryKey, OverpassPoi[]> = { ...empty };
  const seenPlace = new Set<string>();

  await Promise.all(
    GOOGLE_TYPES.map(async (gtype) => {
      try {
        const results = await nearbyByType(lat, lng, radiusM, gtype, key);
        for (const r of results) {
          if (!r.place_id || seenPlace.has(r.place_id)) continue;
          const cat = categoryFromGoogleTypes(r.types ?? []);
          if (!cat) continue;
          const poi = toPoi(r, cat, lat, lng);
          if (!poi) continue;
          seenPlace.add(r.place_id);
          byCat[cat].push(poi);
        }
      } catch {
        /* non-fatal */
      }
    }),
  );

  for (const k of POI_CATEGORY_KEYS) {
    byCat[k].sort((a, b) => a.distanceM - b.distanceM);
    const lim = POI_CATEGORIES[k].defaultLimit;
    byCat[k] = byCat[k].slice(0, lim);
  }

  return byCat;
}
