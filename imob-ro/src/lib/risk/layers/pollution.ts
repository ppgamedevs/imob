import { fetchCustomOverpassFeatures } from "@/lib/geo/overpass";

import { getAirQuality, type AirQualityReading } from "../aqicn";
import type { RiskLayerResult } from "../types";
import { clampScore, riskLevelFromScore } from "./shared";
import { proxyConfidenceFromLocationSource, resolveCoordsForOsmProxy } from "./location-fallback";
import {
  countRoadBuckets,
  fetchRoadNetworkAround,
  nearestRoad,
  pollutionProximityStress,
  roadDensityPerKm2,
  withProxyDisclaimer,
} from "./osm-proxy-shared";

const RADIUS_M = 800;

/** Map WAQI AQI (higher = worse air) to our 0–100 exposure-style score. */
function scoreFromAqi(aqi: number): number {
  if (aqi <= 50) return 18;
  if (aqi <= 100) return 38;
  if (aqi <= 150) return 55;
  if (aqi <= 200) return 72;
  return 85;
}

function buildPollutionLayerFromWaqi(
  reading: AirQualityReading,
  locSource: string,
): RiskLayerResult {
  const finalScore = clampScore(scoreFromAqi(reading.aqi));
  const level = riskLevelFromScore(finalScore);
  const details: string[] = [
    `AQI ${reading.aqi} — ${reading.label}.`,
    reading.stationName ? `Stație WAQI: ${reading.stationName}.` : "",
    reading.pm25 != null ? `PM2.5: ${reading.pm25.toFixed(1)} µg/m³.` : "",
    reading.no2 != null ? `NO₂: ${reading.no2.toFixed(1)} µg/m³.` : "",
  ].filter(Boolean);
  details.push(
    "Indicele vine de la stația publică cea mai apropiată (WAQI); poate diferi de strada exactă a imobilului.",
  );
  if (locSource === "bucharest_center") {
    details.push(
      "Locație necunoscută — ancora centru București; folosiți și secțiunea „Calitatea aerului” din raport.",
    );
  } else if (locSource !== "coordinates") {
    details.push("Coordonate estimate din text/adresă, nu din GPS.");
  }

  return {
    key: "pollution",
    level,
    score: finalScore,
    confidence: 0.82,
    summary: `Poluare aer (WAQI): ${reading.label} — AQI ${reading.aqi}.`,
    details,
    sourceName: "WAQI / AQICN",
    sourceUrl: "https://waqi.info/",
    updatedAt: reading.updatedAt,
  };
}

function scoreFromProximityStress(stressM: number): number {
  if (stressM <= 35) return 44;
  if (stressM <= 75) return 30;
  if (stressM <= 150) return 18;
  if (stressM <= 280) return 10;
  return 5;
}

export async function evalPollution(features: Record<string, unknown>): Promise<RiskLayerResult> {
  const { lat, lng, source: locSource } = await resolveCoordsForOsmProxy(features);

  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    const waqiReading = await getAirQuality(lat, lng).catch(() => null);
    if (waqiReading) {
      return buildPollutionLayerFromWaqi(waqiReading, locSource);
    }
  }

  const [roads, industrialSources, fuelSources] = await Promise.all([
    fetchRoadNetworkAround(lat, lng, RADIUS_M, "risk-pollution-roads-v2", 100),
    fetchCustomOverpassFeatures({
      lat,
      lng,
      radiusM: 1000,
      cacheCategory: "risk-pollution-industrial",
      limit: 24,
      filters: [
        'node["landuse"="industrial"]',
        'way["landuse"="industrial"]',
        'relation["landuse"="industrial"]',
        'node["man_made"="works"]',
        'way["man_made"="works"]',
      ],
    }).catch(() => []),
    fetchCustomOverpassFeatures({
      lat,
      lng,
      radiusM: 500,
      cacheCategory: "risk-pollution-fuel",
      limit: 20,
      filters: ['node["amenity"="fuel"]', 'way["amenity"="fuel"]'],
    }).catch(() => []),
  ]);

  const nearest = nearestRoad(roads);
  const buckets = countRoadBuckets(roads);
  const densityKm2 = roadDensityPerKm2(roads.length, RADIUS_M);
  const nearestIndustrial = industrialSources[0]?.distanceM ?? null;
  const nearestFuel = fuelSources[0]?.distanceM ?? null;

  let score = 6;
  if (nearest) {
    const stress = pollutionProximityStress(nearest.distanceM, nearest.highway);
    score += scoreFromProximityStress(stress);
  } else {
    score += 12;
  }

  score += Math.min(buckets.major * 4 + buckets.collector * 2, 20);
  score += Math.min(Math.round(densityKm2 / 8), 14);

  if (nearestIndustrial != null) {
    if (nearestIndustrial <= 250) score += 26;
    else if (nearestIndustrial <= 500) score += 16;
    else score += 7;
  }
  if (nearestFuel != null) {
    if (nearestFuel <= 120) score += 11;
    else if (nearestFuel <= 250) score += 5;
  }

  const finalScore = clampScore(score);
  const level = riskLevelFromScore(finalScore);
  const osmHits = roads.length + industrialSources.length + fuelSources.length;
  const confidence = proxyConfidenceFromLocationSource(locSource, osmHits);

  const hwLabel = nearest?.highway.replace(/_/g, " ") ?? "—";
  let summary = nearest
    ? `Proxy poluare aer: distanta fata de artere majore (OSM), densitatea retelei rutiere si proximitatea zonelor industriale.`
    : `Proxy poluare aer: fara segmente highway cartate in ${RADIUS_M} m; estimare din zone industriale / benzinarii si fond urban.`;

  if (locSource === "bucharest_center") {
    summary +=
      " Locatie necunoscuta — ancora centru Bucuresti; rezultatul este doar orientativ pentru piata locala.";
  } else if (locSource !== "coordinates") {
    summary += " Coordonate estimate din text/adresa, nu din GPS.";
  }

  const bullet1 = nearest
    ? `Artera cea mai apropiata (OSM): ${hwLabel} la ${nearest.distanceM} m (drumurile de rang inalt pondereaza mai mult).`
    : `In ${RADIUS_M} m nu apar drumuri cu highway in OSM — zona poate fi sub-cartata.`;

  const bullet2 = `Densitate rutiera: ${roads.length} segmente in ${RADIUS_M} m (~${densityKm2}/km²); majore ${buckets.major}, colectoare ${buckets.collector}, strazi locale ${buckets.local}.`;

  const bullet3 =
    nearestIndustrial != null
      ? `Zona industriala / lucrari cartate la ~${nearestIndustrial} m.`
      : nearestFuel != null
        ? `Nu apare zona industriala in 1 km (OSM); benzinarie la ~${nearestFuel} m.`
        : `Nu apare zona industriala in 1 km si nici benzinarie in 500 m (conform OSM).`;

  return {
    key: "pollution",
    level,
    score: finalScore,
    confidence,
    summary,
    details: withProxyDisclaimer([bullet1, bullet2, bullet3]),
    sourceName: "OpenStreetMap (Overpass) + model proxy",
    sourceUrl: "https://www.openstreetmap.org",
    updatedAt: new Date().toISOString(),
  };
}
