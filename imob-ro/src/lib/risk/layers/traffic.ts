import { getTransportSummary } from "@/lib/geo/transport";

import type { RiskLayerResult } from "../types";
import { clampScore, riskLevelFromScore } from "./shared";
import { proxyConfidenceFromLocationSource, resolveCoordsForOsmProxy } from "./location-fallback";
import {
  countRoadBuckets,
  fetchRoadNetworkAround,
  isMajorHighway,
  nearestRoad,
  nearestRoadWhere,
  roadDensityPerKm2,
  withProxyDisclaimer,
} from "./osm-proxy-shared";

const RADIUS_M = 800;

function scoreFromMajorDistance(distanceM: number): number {
  if (distanceM <= 25) return 48;
  if (distanceM <= 60) return 34;
  if (distanceM <= 120) return 22;
  if (distanceM <= 220) return 12;
  return 6;
}

function scoreFromAnyRoad(distanceM: number, highway: string): number {
  if (isMajorHighway(highway)) return scoreFromMajorDistance(distanceM);
  if (distanceM <= 35) return 22;
  if (distanceM <= 80) return 14;
  if (distanceM <= 160) return 8;
  return 4;
}

export async function evalTraffic(features: Record<string, unknown>): Promise<RiskLayerResult> {
  const { lat, lng, source: locSource } = await resolveCoordsForOsmProxy(features);

  const [roads, transportSummary] = await Promise.all([
    fetchRoadNetworkAround(lat, lng, RADIUS_M, "risk-traffic-roads-v2", 120),
    getTransportSummary(lat, lng).catch(() => null),
  ]);

  const majorNearest = nearestRoadWhere(roads, isMajorHighway);
  const anyNearest = nearestRoad(roads);
  const buckets = countRoadBuckets(roads);
  const densityKm2 = roadDensityPerKm2(roads.length, RADIUS_M);
  const transitScore = transportSummary?.transitScore ?? null;
  const metroWalk = transportSummary?.nearestMetro?.walkMinutes ?? null;
  const nearbyStops = transportSummary?.totalNearby ?? 0;

  let score = 8;
  if (majorNearest) {
    score += scoreFromMajorDistance(majorNearest.distanceM);
  } else if (anyNearest) {
    score += scoreFromAnyRoad(anyNearest.distanceM, anyNearest.highway);
  } else {
    score += 10;
  }

  score += Math.min(buckets.major * 3 + buckets.collector * 2 + buckets.local, 24);
  score += Math.min(Math.round(densityKm2 / 5), 16);

  const majorShare = roads.length > 0 ? buckets.major / roads.length : 0;
  score += Math.round(majorShare * 14);

  if (transitScore != null) {
    if (transitScore >= 70) score -= 9;
    else if (transitScore >= 45) score -= 4;
  }

  const finalScore = clampScore(score);
  const level = riskLevelFromScore(finalScore);
  const confidence = proxyConfidenceFromLocationSource(
    locSource,
    roads.length + (transportSummary ? 8 : 0),
  );

  let summary = `Proxy trafic: ierarhie rutiera OSM (motorway→primary), densitatea segmentelor si accesul la transport in comun.`;
  if (locSource === "bucharest_center") {
    summary +=
      " Locatie necunoscuta — ancora centru Bucuresti; valoarea este orientativa pentru comparatie intre anunturi.";
  } else if (locSource !== "coordinates") {
    summary += " Coordonate estimate din text/adresa.";
  }

  const hwMaj = majorNearest?.highway.replace(/_/g, " ") ?? null;
  const bullet1 = majorNearest
    ? `Artera majora cea mai apropiata: ${hwMaj} la ${majorNearest.distanceM} m.`
    : anyNearest
      ? `Fara motorway/trunk/primary/secondary in top distante; cel mai apropiat segment: ${anyNearest.highway.replace(/_/g, " ")} la ${anyNearest.distanceM} m.`
      : `Nu apar drumuri cartate in ${RADIUS_M} m (OSM poate lipsi din zona).`;

  const bullet2 = `Densitate si ierarhie: ${roads.length} segmente (~${densityKm2}/km²); majore ${buckets.major}, colectoare ${buckets.collector}, locale ${buckets.local}.`;

  const bullet3 =
    metroWalk != null
      ? `Transport: metrou la ~${metroWalk} min pe jos; ${nearbyStops} opriri in 800 m (scor tranzit ~${transitScore != null ? transitScore : "—"}).`
      : transportSummary
        ? `${nearbyStops} opriri de transport in 800 m; fara metrou apropiat in datele noastre.`
        : `Transport in comun: doar proxy rutier OSM (fara statii GTFS in acest calcul).`;

  return {
    key: "traffic",
    level,
    score: finalScore,
    confidence,
    summary,
    details: withProxyDisclaimer([bullet1, bullet2, bullet3]),
    sourceName: transportSummary
      ? "OpenStreetMap (Overpass) + GTFS + model proxy"
      : "OpenStreetMap (Overpass) + model proxy",
    sourceUrl: "https://www.openstreetmap.org",
    updatedAt: new Date().toISOString(),
  };
}
