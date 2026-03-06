import { fetchCustomOverpassFeatures } from "@/lib/geo/overpass";

import type { RiskLayerResult } from "../types";
import { clampScore, resolveLocation, riskLevelFromScore, unknownRiskLayer } from "./shared";

export async function evalFlood(
  features: Record<string, unknown>,
): Promise<RiskLayerResult> {
  const { lat, lng, addressRaw, areaSlug } = resolveLocation(features);

  if (lat == null || lng == null) {
    return unknownRiskLayer(
      "flood",
      "Date indisponibile momentan pentru stratul de inundatii. Fara coordonate precise nu putem calcula proxy-ul OSM.",
      [
        addressRaw || areaSlug
          ? `Adresa disponibila pentru completare ulterioara: ${addressRaw ?? areaSlug}.`
          : "Adauga o locatie mai precisa pentru a activa evaluarea.",
        "Cand exista coordonate, evaluarea foloseste proximitatea fata de ape, canale si bazine din OpenStreetMap.",
      ],
    );
  }

  const waterFeatures = await fetchCustomOverpassFeatures({
    lat,
    lng,
    radiusM: 1000,
    cacheCategory: "risk-flood-water",
    limit: 30,
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
  }
  score += Math.min(countWithin500 * 8, 20);
  score += Math.min(waterDensity * 2, 12);
  const finalScore = clampScore(score);
  const level = riskLevelFromScore(finalScore);

  return {
    key: "flood",
    level,
    score: finalScore,
    confidence: nearestWater != null ? 0.48 : 0.34,
    summary:
      nearestWater != null
        ? `Expunere hidrologica estimata din proximitatea fata de apa: cel mai apropiat reper este la aproximativ ${nearestWater} m.`
        : "Expunerea hidrologica estimata este redusa in jurul proprietatii, pe baza reperelor OSM disponibile.",
    details: [
      nearestWater != null
        ? `Cel mai apropiat corp de apa sau canal cartat este la ${nearestWater} m.`
        : "Nu a fost identificat niciun corp de apa cartat in raza relevanta de 1 km.",
      `${countWithin500} repere hidrografice in 500 m si ${waterDensity} in 1 km.`,
      "Acesta este un indicator orientativ de context local, util pentru screening rapid, nu o harta oficiala de hazard la inundatii.",
    ],
    sourceName: "OpenStreetMap (proxy)",
    sourceUrl: "https://www.openstreetmap.org",
    updatedAt: new Date().toISOString(),
  };
}
