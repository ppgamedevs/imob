import { NextResponse } from "next/server";

import { flags } from "@/lib/feature-flags";
import { getTransportStopsForMap } from "@/lib/geo/transport";
import { rateLimit } from "@/lib/http/rate";

export const runtime = "nodejs";

/**
 * GET /api/transport/nearby?lat=44.43&lng=26.10&radius=1000
 *
 * Returns transport stops within the given radius for map display.
 * Rate-limited to 60 req/min per IP.
 */
export async function GET(req: Request) {
  if (!flags.transport) {
    return NextResponse.json({ stops: [], disabled: true });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try {
    await rateLimit(`transport:${ip}`, 60, 60_000);
  } catch {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get("lat") ?? "");
  const lng = parseFloat(url.searchParams.get("lng") ?? "");
  const radius = Math.min(parseInt(url.searchParams.get("radius") ?? "1000", 10), 2000);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const stops = await getTransportStopsForMap(lat, lng, radius);

  return NextResponse.json(
    { stops },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } },
  );
}
