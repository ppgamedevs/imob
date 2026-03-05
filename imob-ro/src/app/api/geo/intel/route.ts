/**
 * GET /api/geo/intel?lat=44.43&lng=26.10&radius=1000
 *
 * Fetches POIs for all categories in parallel, computes intel scores,
 * and returns a comprehensive neighborhood intelligence payload.
 */
import { NextResponse } from "next/server";
import { POI_CATEGORY_KEYS, type PoiCategoryKey } from "@/lib/geo/poiCategories";
import { fetchOverpassPois, type OverpassPoi } from "@/lib/geo/overpass";
import { makeCacheKey, getCachedPois, setCachedPois } from "@/lib/geo/cache";
import { computeIntelScores } from "@/lib/geo/intelScoring";

const VALID_RADII = [500, 1000, 1500, 2000];
const MAX_LAT = 90;
const MAX_LNG = 180;

export const dynamic = "force-dynamic";

async function fetchCategoryWithCache(
  lat: number,
  lng: number,
  radius: number,
  category: PoiCategoryKey,
): Promise<OverpassPoi[]> {
  const cacheKey = makeCacheKey(lat, lng, radius, category);

  const cached = await getCachedPois(cacheKey);
  if (cached) return cached;

  try {
    const pois = await fetchOverpassPois(lat, lng, radius, category);
    setCachedPois(cacheKey, lat, lng, radius, category, pois).catch(() => {});
    return pois;
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const radiusStr = searchParams.get("radius");

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: "Missing required params: lat, lng" },
      { status: 400 },
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  const radius = radiusStr ? parseInt(radiusStr, 10) : 1000;

  if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > MAX_LAT || Math.abs(lng) > MAX_LNG) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  if (!VALID_RADII.includes(radius)) {
    return NextResponse.json(
      { error: `Invalid radius. Allowed: ${VALID_RADII.join(", ")}` },
      { status: 400 },
    );
  }

  // Fetch all categories in parallel
  const results = await Promise.all(
    POI_CATEGORY_KEYS.map(async (cat) => {
      const pois = await fetchCategoryWithCache(lat, lng, radius, cat);
      return [cat, pois] as const;
    }),
  );

  const poisByCategory = Object.fromEntries(results) as Record<
    PoiCategoryKey,
    OverpassPoi[]
  >;

  const intel = computeIntelScores(poisByCategory);

  return NextResponse.json({
    ...intel,
    poisByCategory,
    radius,
    center: { lat, lng },
  });
}
