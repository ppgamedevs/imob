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
import type { OverpassPoi } from "@/lib/geo/overpass";
import { validateLatLng, isLikelyRomania } from "@/lib/geo/coords";
import { fetchIntelPoisMerged } from "@/lib/geo/fetchIntelPois";
import type { PoiIngestionMeta } from "@/lib/geo/poiIngestion";
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
  return `intel-v2e:${roundCoord(lat)}:${roundCoord(lng)}:${radius}`;
}

export interface IntelV2Response {
  // Base intel
  scores: IntelResult["scores"];
  evidence: IntelResult["evidence"];
  redFlags: string[];
  zoneDataQuality: IntelResult["zoneDataQuality"];
  categoryCounts: IntelResult["categoryCounts"];
  uncertainScores: IntelResult["uncertainScores"];
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>;
  // V2 additions
  zoneType: ZoneTypeResult;
  signals: DemandSignals;
  commuter: CommuterResult;
  // Meta
  radius: number;
  center: { lat: number; lng: number };
  cachedAt: string | null;
  /** How POIs were loaded (OSM, optional Google, radii). Never omit when compute succeeded. */
  poiIngestion: PoiIngestionMeta;
}

type FallbackMetroData = { name: string; distanceM: number } | null;

function countPoisInPayload(pois: Record<PoiCategoryKey, OverpassPoi[]>): number {
  return POI_CATEGORY_KEYS.reduce((s, k) => s + (pois[k]?.length ?? 0), 0);
}

/** Backfill meta for snapshots saved before `poiIngestion` existed. */
function ensureIntelV2PoiMeta(payload: IntelV2Response, radius: number): IntelV2Response {
  if (payload.poiIngestion) return payload;
  const n = countPoisInPayload(payload.poisByCategory);
  return {
    ...payload,
    poiIngestion: {
      osmTotal: n,
      googleTotal: 0,
      mergedTotal: n,
      fetchRadiusM: Math.max(1000, radius),
      usedGoogleFallback: false,
      notice:
        n === 0
          ? "Date limitate, estimare bazata pe surse disponibile."
          : undefined,
    },
  };
}

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
      {
        scores: payload.scores,
        evidence: payload.evidence,
        redFlags,
        zoneDataQuality: payload.zoneDataQuality,
        categoryCounts: payload.categoryCounts,
        uncertainScores: payload.uncertainScores,
      },
      payload.poisByCategory,
      payload.signals,
    ),
  };
}

async function computeFullIntel(
  lat: number,
  lng: number,
  radius: number,
): Promise<IntelV2Response> {
  const coordCheck = validateLatLng(lat, lng);
  if (!coordCheck.ok) {
    throw new Error(`Invalid coordinates: ${coordCheck.reason}`);
  }

  // 1. POIs: batched Overpass (semantic radii) + optional Google merge + per-category display caps
  const merged = await fetchIntelPoisMerged({
    lat,
    lng,
    userRadiusM: radius,
  });
  const { poisByCategory, pipelineQuality } = merged;
  let { poiIngestion } = merged;
  if (!isLikelyRomania(lat, lng)) {
    const extra = "Coordonate in afara ariei Romania — rezultate orientative.";
    poiIngestion = {
      ...poiIngestion,
      notice: poiIngestion.notice ? `${poiIngestion.notice} ${extra}` : extra,
    };
  }

  // 2. Compute base scores
  const intel = computeIntelScores(poisByCategory, { pipelineQuality });
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
    zoneDataQuality: resolvedIntel.zoneDataQuality,
    categoryCounts: resolvedIntel.categoryCounts,
    uncertainScores: resolvedIntel.uncertainScores,
    poisByCategory,
    zoneType,
    signals,
    commuter,
    radius,
    center: { lat, lng },
    cachedAt: null,
    poiIngestion,
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

  const coordCheck = validateLatLng(lat, lng);
  if (!coordCheck.ok) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }
  if (!isLikelyRomania(lat, lng)) {
    console.warn("[intel-v2] coordinates outside Romania bbox — POI results are best-effort", {
      lat,
      lng,
    });
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
      const payload = ensureIntelV2PoiMeta(
        snapshot.payload as unknown as IntelV2Response,
        radius,
      );
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
