import { NextResponse } from "next/server";

import { flags } from "@/lib/feature-flags";
import { getSeismicBuildingsForMap } from "@/lib/geo/seismic";
import { rateLimit } from "@/lib/http/rate";

export const runtime = "nodejs";

/**
 * GET /api/seismic/nearby?lat=44.43&lng=26.10&radius=1000
 *
 * Returns seismic risk buildings within the given radius for map display.
 * Rate-limited to 60 req/min per IP.
 */
export async function GET(req: Request) {
  if (!flags.seismic) {
    return NextResponse.json({ buildings: [], disabled: true });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try {
    await rateLimit(`seismic:${ip}`, 60, 60_000);
  } catch {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get("lat") ?? "");
  const lng = parseFloat(url.searchParams.get("lng") ?? "");
  const radius = parseInt(url.searchParams.get("radius") ?? "1000", 10);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng query params are required" },
      { status: 400 },
    );
  }

  if (lat < 43 || lat > 46 || lng < 24 || lng > 28) {
    return NextResponse.json({ buildings: [] });
  }

  const buildings = await getSeismicBuildingsForMap(lat, lng, radius);

  return NextResponse.json(
    { buildings },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
