import { fetchCustomOverpassFeatures } from "@/lib/geo/overpass";

import type { RiskLayerResult } from "../types";
import { clampScore, resolveLocation, riskLevelFromScore, unknownRiskLayer } from "./shared";

export async function evalPollution(
  features: Record<string, unknown>,
): Promise<RiskLayerResult> {
  const { lat, lng, addressRaw, areaSlug } = resolveLocation(features);

  if (lat == null || lng == null) {
    return unknownRiskLayer(
      "pollution",
      "Date indisponibile momentan pentru poluarea aerului. Fara coordonate nu putem calcula proxy-ul OSM.",
      [
        addressRaw || areaSlug
          ? `Locatia disponibila pentru completare ulterioara: ${addressRaw ?? areaSlug}.`
          : "Adauga coordonate precise pentru a activa estimarea.",
        "Cand exista coordonate, stratul foloseste artere principale, zone industriale si benzinarii ca proxy de expunere.",
      ],
    );
  }

  const [roadSources, industrialSources, fuelSources] = await Promise.all([
    fetchCustomOverpassFeatures({
      lat,
      lng,
      radiusM: 800,
      cacheCategory: "risk-pollution-roads",
      limit: 40,
      filters: [
        'way["highway"="trunk"]',
        'way["highway"="primary"]',
        'way["highway"="secondary"]',
      ],
    }).catch(() => []),
    fetchCustomOverpassFeatures({
      lat,
      lng,
      radiusM: 1000,
      cacheCategory: "risk-pollution-industrial",
      limit: 20,
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
      filters: [
        'node["amenity"="fuel"]',
        'way["amenity"="fuel"]',
      ],
    }).catch(() => []),
  ]);

  const nearestRoad = roadSources[0]?.distanceM ?? null;
  const nearestIndustrial = industrialSources[0]?.distanceM ?? null;
  const nearestFuel = fuelSources[0]?.distanceM ?? null;

  let score = 8;
  if (nearestRoad != null) {
    if (nearestRoad <= 35) score += 42;
    else if (nearestRoad <= 75) score += 30;
    else if (nearestRoad <= 150) score += 18;
    else score += 8;
  }
  if (nearestIndustrial != null) {
    if (nearestIndustrial <= 250) score += 28;
    else if (nearestIndustrial <= 500) score += 18;
    else score += 8;
  }
  if (nearestFuel != null) {
    if (nearestFuel <= 120) score += 12;
    else if (nearestFuel <= 250) score += 6;
  }
  score += Math.min(roadSources.length * 3, 16);
  const finalScore = clampScore(score);
  const level = riskLevelFromScore(finalScore);

  return {
    key: "pollution",
    level,
    score: finalScore,
    confidence: 0.44,
    summary:
      nearestRoad != null
        ? `Expunerea estimata la surse urbane de poluare este influentata de o artera majora aflata la aproximativ ${nearestRoad} m.`
        : "Expunerea estimata la surse urbane de poluare pare moderata sau redusa in raza evaluata.",
    details: [
      nearestIndustrial != null
        ? `Cea mai apropiata zona industriala sau platforma de lucrari este la ${nearestIndustrial} m.`
        : "Nu a fost identificata o zona industriala apropiata in raza de 1 km.",
      nearestFuel != null
        ? `Cea mai apropiata benzinarie: ${nearestFuel} m.`
        : "Nu a fost identificata o benzinarie apropiata in raza de 500 m.",
      `${roadSources.length} segmente de drum major in 800 m.`,
      "Scorul este un proxy de expunere urbana si ajuta la compararea rapida a locatiilor; nu inlocuieste masuratori AQI, PM2.5 sau PM10 oficiale.",
    ],
    sourceName: "OpenStreetMap (proxy)",
    sourceUrl: "https://www.openstreetmap.org",
    updatedAt: new Date().toISOString(),
  };
}
