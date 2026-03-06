import { getTransportSummary } from "@/lib/geo/transport";
import { fetchCustomOverpassFeatures } from "@/lib/geo/overpass";

import type { RiskLayerResult } from "../types";
import { clampScore, resolveLocation, riskLevelFromScore, unknownRiskLayer } from "./shared";

export async function evalTraffic(
  features: Record<string, unknown>,
): Promise<RiskLayerResult> {
  const { lat, lng, addressRaw, areaSlug } = resolveLocation(features);

  if (lat == null || lng == null) {
    return unknownRiskLayer(
      "traffic",
      "Date indisponibile momentan pentru stratul de trafic. Fara coordonate nu putem calcula proxy-ul de expunere.",
      [
        addressRaw || areaSlug
          ? `Locatie pregatita pentru evaluare ulterioara: ${addressRaw ?? areaSlug}.`
          : "Adauga coordonate precise pentru a activa scorul de trafic.",
        "Cand exista coordonate, stratul foloseste artere majore si accesul la transport public.",
      ],
    );
  }

  const [majorRoads, transportSummary] = await Promise.all([
    fetchCustomOverpassFeatures({
      lat,
      lng,
      radiusM: 800,
      cacheCategory: "risk-traffic-roads",
      limit: 50,
      filters: [
        'way["highway"="motorway"]',
        'way["highway"="trunk"]',
        'way["highway"="primary"]',
        'way["highway"="secondary"]',
      ],
    }).catch(() => []),
    getTransportSummary(lat, lng).catch(() => null),
  ]);

  const nearestRoad = majorRoads[0]?.distanceM ?? null;
  const transitScore = transportSummary?.transitScore ?? null;
  const metroWalk = transportSummary?.nearestMetro?.walkMinutes ?? null;
  const nearbyStops = transportSummary?.totalNearby ?? 0;

  let score = 10;
  if (nearestRoad != null) {
    if (nearestRoad <= 25) score += 48;
    else if (nearestRoad <= 60) score += 34;
    else if (nearestRoad <= 120) score += 20;
    else score += 8;
  }
  score += Math.min(majorRoads.length * 2, 18);

  if (transitScore != null) {
    // Better public transport slightly offsets road exposure for mobility,
    // but keeps the layer focused on traffic pressure / noise proxy.
    if (transitScore >= 70) score -= 8;
    else if (transitScore >= 45) score -= 4;
  }

  const finalScore = clampScore(score);
  const level = riskLevelFromScore(finalScore);

  return {
    key: "traffic",
    level,
    score: finalScore,
    confidence: transportSummary ? 0.56 : 0.42,
    summary:
      nearestRoad != null
        ? `Presiunea de trafic estimata este influentata de o artera majora aflata la aproximativ ${nearestRoad} m de proprietate.`
        : "Presiunea de trafic estimata pare limitata in imediata proximitate, pe baza retelei rutiere disponibile.",
    details: [
      `${majorRoads.length} segmente de drum major detectate in 800 m.`,
      metroWalk != null
        ? `Metrou la aproximativ ${metroWalk} min pe jos; ${nearbyStops} statii in 800 m.`
        : transportSummary
          ? `${nearbyStops} statii de transport in 800 m, fara metrou apropiat confirmat.`
          : "Datele de transport public nu au fost disponibile pentru aceasta evaluare.",
      "Scorul combina expunerea la artere cu accesibilitatea de transport si functioneaza ca proxy de trafic, presiune rutiera si potential zgomot urban.",
    ],
    sourceName: transportSummary ? "OpenStreetMap + GTFS (proxy)" : "OpenStreetMap (proxy)",
    sourceUrl: "https://www.openstreetmap.org",
    updatedAt: new Date().toISOString(),
  };
}
