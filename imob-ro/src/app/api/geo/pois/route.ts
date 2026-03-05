/**
 * GET /api/geo/pois?lat=44.43&lng=26.10&radius=1000&category=supermarket
 *
 * Returns POIs for a single category, with server-side Overpass caching.
 */
import { NextResponse } from "next/server";
import { isValidCategory, type PoiCategoryKey } from "@/lib/geo/poiCategories";
import { fetchOverpassPois } from "@/lib/geo/overpass";
import { makeCacheKey, getCachedPois, setCachedPois } from "@/lib/geo/cache";
import { rateLimit } from "@/lib/http/rate";

const VALID_RADII = [500, 1000, 1500, 2000];
const MAX_LAT = 90;
const MAX_LNG = 180;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try {
    await rateLimit(`geo-pois:${ip}`, 30, 60_000);
  } catch {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);

  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const radiusStr = searchParams.get("radius");
  const category = searchParams.get("category");

  if (!latStr || !lngStr || !category) {
    return NextResponse.json(
      { error: "Missing required params: lat, lng, category" },
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

  if (!isValidCategory(category)) {
    return NextResponse.json({ error: `Unknown category: ${category}` }, { status: 400 });
  }

  const cacheKey = makeCacheKey(lat, lng, radius, category);

  // Try cache first
  const cached = await getCachedPois(cacheKey);
  if (cached) {
    return NextResponse.json({ pois: cached, source: "cache" });
  }

  // Fetch from Overpass
  try {
    const pois = await fetchOverpassPois(lat, lng, radius, category as PoiCategoryKey);

    // Cache in background (don't block response)
    setCachedPois(cacheKey, lat, lng, radius, category, pois).catch(() => {});

    return NextResponse.json({ pois, source: "overpass" });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch POI data. Try again later.", pois: [] },
      { status: 502 },
    );
  }
}
