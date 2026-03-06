/**
 * GET /api/geo/intel-v2?lat=44.43&lng=26.10&radius=1000
 *
 * Full Location Intelligence endpoint.
 * Returns: POIs + scores + zone type + signals + commuter rings.
 * Results are cached in GeoIntelSnapshot (24h TTL).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/http/rate";
import { POI_CATEGORY_KEYS, type PoiCategoryKey } from "@/lib/geo/poiCategories";
import { fetchOverpassPois, type OverpassPoi } from "@/lib/geo/overpass";
import { makeCacheKey, getCachedPois, setCachedPois } from "@/lib/geo/cache";
import { computeIntelScores, type IntelResult } from "@/lib/geo/intelScoring";
import { querySignals, type DemandSignals } from "@/lib/geo/signals/querySignals";
import { classifyZone, type ZoneTypeResult } from "@/lib/geo/zoneType";
import { computeCommuterRings, type CommuterResult } from "@/lib/geo/commuterRings";
import { getTransportSummary } from "@/lib/geo/transport";

export const dynamic = "force-dynamic";

const VALID_RADII = [500, 1000, 1500, 2000];
const SNAPSHOT_TTL_H = 24;
const COORD_PRECISION = 3;

function roundCoord(val: number): number {
  return parseFloat(val.toFixed(COORD_PRECISION));
}

function makeSnapshotKey(lat: number, lng: number, radius: number): string {
  return `intel-v2:${roundCoord(lat)}:${roundCoord(lng)}:${radius}`;
}

export interface IntelV2Response {
  // Base intel
  scores: IntelResult["scores"];
  evidence: IntelResult["evidence"];
  redFlags: string[];
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>;
  // V2 additions
  zoneType: ZoneTypeResult;
  signals: DemandSignals;
  commuter: CommuterResult;
  // Meta
  radius: number;
  center: { lat: number; lng: number };
  cachedAt: string | null;
}

type FallbackMetroData = { name: string; distanceM: number } | null;

async function getFallbackMetroData(
  lat: number,
  lng: number,
): Promise<FallbackMetroData> {
  const transportSummary = await getTransportSummary(lat, lng).catch(() => null);
  return transportSummary?.nearestMetro
    ? {
        name: transportSummary.nearestMetro.name,
        distanceM: transportSummary.nearestMetro.distanceM,
      }
    : null;
}

function reconcileTransitFallback(
  payload: IntelV2Response,
  fallbackMetro: FallbackMetroData,
): IntelV2Response {
  const hasNearbyTransitFallback = fallbackMetro != null && fallbackMetro.distanceM <= 800;
  const redFlags = hasNearbyTransitFallback
    ? payload.redFlags.filter((flag) => flag !== "0 statii de transport in 800m")
    : payload.redFlags;
  const commuter = payload.commuter?.nearestMetro || !fallbackMetro
    ? payload.commuter
    : {
        ...payload.commuter,
        nearestMetro: {
          stationName: fallbackMetro.name,
          distanceM: fallbackMetro.distanceM,
          walkMinutes: Math.round(fallbackMetro.distanceM / 80),
        },
      };

  if (redFlags === payload.redFlags && commuter === payload.commuter) {
    return payload;
  }

  return {
    ...payload,
    redFlags,
    commuter,
    zoneType: classifyZone(
      { scores: payload.scores, evidence: payload.evidence, redFlags },
      payload.poisByCategory,
      payload.signals,
    ),
  };
}

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

async function computeFullIntel(
  lat: number,
  lng: number,
  radius: number,
): Promise<IntelV2Response> {
  // 1. Fetch POIs (parallel)
  const results = await Promise.all(
    POI_CATEGORY_KEYS.map(async (cat) => {
      const pois = await fetchCategoryWithCache(lat, lng, radius, cat);
      return [cat, pois] as const;
    }),
  );
  const poisByCategory = Object.fromEntries(results) as Record<PoiCategoryKey, OverpassPoi[]>;

  // 2. Compute base scores
  const intel = computeIntelScores(poisByCategory);
  const fallbackMetro = await getFallbackMetroData(lat, lng);
  const hasNearbyTransitFallback = fallbackMetro != null && fallbackMetro.distanceM <= 800;
  const resolvedRedFlags = hasNearbyTransitFallback
    ? intel.redFlags.filter((flag) => flag !== "0 statii de transport in 800m")
    : intel.redFlags;
  const resolvedIntel: IntelResult = {
    ...intel,
    redFlags: resolvedRedFlags,
  };

  // 3. Load signals
  const signals = await querySignals(lat, lng, radius);

  // 4. Classify zone
  const zoneType = classifyZone(resolvedIntel, poisByCategory, signals);

  // 5. Commuter rings
  const metroStops = poisByCategory.transport?.filter(
    (p) => p.subType === "subway" || p.tags?.station === "subway",
  ) ?? [];
  const nearestMetroData = metroStops.length > 0
    ? { name: metroStops[0].name ?? "Metrou", distanceM: metroStops[0].distanceM }
    : fallbackMetro;
  const commuter = await computeCommuterRings(lat, lng, nearestMetroData);

  return {
    scores: resolvedIntel.scores,
    evidence: resolvedIntel.evidence,
    redFlags: resolvedIntel.redFlags,
    poisByCategory,
    zoneType,
    signals,
    commuter,
    radius,
    center: { lat, lng },
    cachedAt: null,
  };
}

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try {
    await rateLimit(`intel-v2:${ip}`, 20, 60_000);
  } catch {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);

  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const radiusStr = searchParams.get("radius");

  if (!latStr || !lngStr) {
    return NextResponse.json({ error: "Missing lat, lng" }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  const radius = radiusStr ? parseInt(radiusStr, 10) : 1000;

  if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }
  if (!VALID_RADII.includes(radius)) {
    return NextResponse.json({ error: `Invalid radius. Allowed: ${VALID_RADII.join(", ")}` }, { status: 400 });
  }

  // Check snapshot cache
  const snapshotKey = makeSnapshotKey(lat, lng, radius);
  try {
    const snapshot = await prisma.geoIntelSnapshot.findUnique({
      where: { key: snapshotKey },
    });
    if (snapshot && snapshot.expiresAt > new Date()) {
      const payload = snapshot.payload as unknown as IntelV2Response;
      const fallbackMetro = await getFallbackMetroData(lat, lng);
      const resolvedPayload = reconcileTransitFallback(payload, fallbackMetro);
      return NextResponse.json({ ...resolvedPayload, cachedAt: snapshot.computedAt.toISOString() });
    }
  } catch { /* continue to fresh compute */ }

  // Compute fresh
  let payload: IntelV2Response;
  try {
    payload = await computeFullIntel(lat, lng, radius);
  } catch (err) {
    console.error("[intel-v2] computeFullIntel failed:", err);
    return NextResponse.json(
      { error: "Failed to compute intel data" },
      { status: 500 },
    );
  }

  // Cache snapshot
  const expiresAt = new Date(Date.now() + SNAPSHOT_TTL_H * 60 * 60 * 1000);
  try {
    await prisma.geoIntelSnapshot.upsert({
      where: { key: snapshotKey },
      update: {
        payload: payload as unknown as Parameters<typeof prisma.geoIntelSnapshot.update>[0]["data"]["payload"],
        computedAt: new Date(),
        expiresAt,
      },
      create: {
        key: snapshotKey,
        latRounded: roundCoord(lat),
        lngRounded: roundCoord(lng),
        radiusM: radius,
        payload: payload as unknown as Parameters<typeof prisma.geoIntelSnapshot.create>[0]["data"]["payload"],
        expiresAt,
      },
    });
  } catch { /* cache write failed, non-fatal */ }

  return NextResponse.json(payload);
}
