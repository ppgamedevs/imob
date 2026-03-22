import { fetchCustomOverpassFeatures } from "@/lib/geo/overpass";

import type { RiskLayerResult } from "../types";
import { clampScore, riskLevelFromScore } from "./shared";
import { proxyConfidenceFromLocationSource, resolveCoordsForOsmProxy } from "./location-fallback";
import { withProxyDisclaimer } from "./osm-proxy-shared";

export async function evalFlood(features: Record<string, unknown>): Promise<RiskLayerResult> {
  const { lat, lng, source: locSource } = await resolveCoordsForOsmProxy(features);

  const waterFeatures = await fetchCustomOverpassFeatures({
    lat,
    lng,
    radiusM: 1000,
    cacheCategory: "risk-flood-water",
    limit: 40,
    filters: [
      'node["natural"="water"]',
      'way["natural"="water"]',
      'relation["natural"="water"]',
      'node["waterway"="river"]',
      'way["waterway"="river"]',
      'node["waterway"="canal"]',
      'way["waterway"="canal"]',
      'node["waterway"="stream"]',
      'way["waterway"="stream"]',
      'way["landuse"="basin"]',
      'way["landuse"="reservoir"]',
    ],
  }).catch(() => []);

  const nearestWater = waterFeatures[0]?.distanceM ?? null;
  const countWithin500 = waterFeatures.filter((feature) => feature.distanceM <= 500).length;
  const waterDensity = waterFeatures.length;

  let score = 5;
  if (nearestWater != null) {
    if (nearestWater <= 120) score += 55;
    else if (nearestWater <= 250) score += 38;
    else if (nearestWater <= 500) score += 22;
    else score += 8;
  } else {
    score += 10;
  }
  score += Math.min(countWithin500 * 8, 20);
  score += Math.min(waterDensity * 2, 12);
  const finalScore = clampScore(score);
  const level = riskLevelFromScore(finalScore);
  const confidence = proxyConfidenceFromLocationSource(locSource, waterFeatures.length);

  let summary = nearestWater != null
    ? `Proxy hidrologic OSM: apa curgatoare / lacuri cartate; cel mai apropiat reper la ~${nearestWater} m.`
    : `Proxy hidrologic OSM: fara corp de apa cartat in 1 km (nu exclude riscul real — harta poate fi incompleta).`;

  if (locSource === "bucharest_center") {
    summary +=
      " Locatie necunoscuta — ancora centru Bucuresti; foloseste doar pentru screening relativ intre anunturi.";
  } else if (locSource !== "coordinates") {
    summary += " Coordonate estimate din text/adresa.";
  }

  const bullet1 =
    nearestWater != null
      ? `Cel mai apropiat reper hidrografic cartat: ${nearestWater} m.`
      : `Niciun reper natural=water / waterway in raza de 1 km (conform OSM).`;

  const bullet2 = `${countWithin500} repere in 500 m, ${waterDensity} in 1 km — folosite ca densitate de context.`;

  const bullet3 =
    "Nu reprezinta hazard oficial la inundatii; doar proximitate fata de elemente de apa din harta voluntara.";

  return {
    key: "flood",
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
