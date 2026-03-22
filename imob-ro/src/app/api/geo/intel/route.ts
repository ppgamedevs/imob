/**
 * GET /api/geo/intel?lat=44.43&lng=26.10&radius=1000
 *
 * Fetches POIs for all categories in parallel, computes intel scores,
 * and returns a comprehensive neighborhood intelligence payload.
 */
import { NextResponse } from "next/server";
import { validateLatLng } from "@/lib/geo/coords";
import { fetchIntelPoisMerged } from "@/lib/geo/fetchIntelPois";
import { computeIntelScores } from "@/lib/geo/intelScoring";

const VALID_RADII = [500, 1000, 1500, 2000];

export const dynamic = "force-dynamic";

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

  const coordCheck = validateLatLng(lat, lng);
  if (!coordCheck.ok) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  if (!VALID_RADII.includes(radius)) {
    return NextResponse.json(
      { error: `Invalid radius. Allowed: ${VALID_RADII.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const merged = await fetchIntelPoisMerged({ lat, lng, userRadiusM: radius });
    const intel = computeIntelScores(merged.poisByCategory, {
      pipelineQuality: merged.pipelineQuality,
    });
    return NextResponse.json({
      ...intel,
      poisByCategory: merged.poisByCategory,
      poiIngestion: merged.poiIngestion,
      radius,
      center: { lat, lng },
    });
  } catch (e) {
    console.error("[intel] fetchIntelPoisMerged failed:", e);
    return NextResponse.json({ error: "Failed to load POI data" }, { status: 502 });
  }
}
