import { NextResponse } from "next/server";

import { flags } from "@/lib/feature-flags";
import { getPOIsForMap } from "@/lib/geo/vibe";
import { rateLimit } from "@/lib/http/rate";

export const runtime = "nodejs";

type Cat =
  | "BAR"
  | "RESTAURANT"
  | "NIGHTCLUB"
  | "PARK"
  | "SCHOOL"
  | "KINDERGARTEN"
  | "PLAYGROUND"
  | "SUPERMARKET"
  | "PHARMACY"
  | "GYM";

const VALID_CATEGORIES = new Set<Cat>([
  "BAR", "RESTAURANT", "NIGHTCLUB", "PARK", "SCHOOL",
  "KINDERGARTEN", "PLAYGROUND", "SUPERMARKET", "PHARMACY", "GYM",
]);

const LAYER_PRESETS: Record<string, Cat[]> = {
  nightlife: ["BAR", "RESTAURANT", "NIGHTCLUB"],
  parks: ["PARK", "PLAYGROUND"],
  family: ["SCHOOL", "KINDERGARTEN", "PLAYGROUND"],
};

/**
 * GET /api/poi/nearby?lat=44.43&lng=26.10&layer=nightlife&radius=1000
 *
 * layer can be a preset name (nightlife, parks, family)
 * or comma-separated categories (BAR,RESTAURANT).
 */
export async function GET(req: Request) {
  if (!flags.poi) {
    return NextResponse.json({ pois: [], disabled: true });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try {
    await rateLimit(`poi:${ip}`, 60, 60_000);
  } catch {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get("lat") ?? "");
  const lng = parseFloat(url.searchParams.get("lng") ?? "");
  const layerParam = url.searchParams.get("layer") ?? "";
  const radius = Math.min(parseInt(url.searchParams.get("radius") ?? "1000", 10), 2000);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  let categories: Cat[];
  if (LAYER_PRESETS[layerParam]) {
    categories = LAYER_PRESETS[layerParam];
  } else {
    categories = layerParam
      .split(",")
      .map((s) => s.trim().toUpperCase() as Cat)
      .filter((c) => VALID_CATEGORIES.has(c));
  }

  if (categories.length === 0) {
    return NextResponse.json({ pois: [] });
  }

  const pois = await getPOIsForMap(lat, lng, categories, radius);

  return NextResponse.json(
    { pois },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } },
  );
}
