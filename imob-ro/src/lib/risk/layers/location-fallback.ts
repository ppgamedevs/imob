import { geocodeWithNominatim, inferLocationFromText } from "@/lib/geo";

import { resolveLocation } from "./shared";

/** Bucharest centroid — last-resort anchor for OSM proxy when nothing else matches. */
const BUCHAREST_CENTER = { lat: 44.4268, lng: 26.1025 };

export type ProxyLocationSource = "coordinates" | "text_hint" | "nominatim" | "bucharest_center";

export async function resolveCoordsForOsmProxy(
  features: Record<string, unknown>,
): Promise<{
  lat: number;
  lng: number;
  source: ProxyLocationSource;
  hint?: string;
}> {
  const { lat, lng, title, addressRaw, areaSlug } = resolveLocation(features);

  if (lat != null && lng != null) {
    return { lat, lng, source: "coordinates" };
  }

  const inferred = inferLocationFromText(title ?? undefined, addressRaw ?? undefined, areaSlug ?? undefined);
  if (inferred) {
    return {
      lat: inferred.lat,
      lng: inferred.lng,
      source: "text_hint",
      hint: inferred.hint,
    };
  }

  const queries: string[] = [];
  if (addressRaw && addressRaw.trim().length >= 5) {
    queries.push(`${addressRaw.trim()}, Bucuresti, Romania`);
  }
  if (areaSlug && areaSlug.trim().length >= 2) {
    queries.push(`${areaSlug.replace(/-/g, " ")}, Bucuresti, Romania`);
  }

  for (const q of queries) {
    const g = await geocodeWithNominatim(q).catch(() => null);
    if (g) {
      return { lat: g.lat, lng: g.lng, source: "nominatim", hint: g.display };
    }
  }

  return {
    lat: BUCHAREST_CENTER.lat,
    lng: BUCHAREST_CENTER.lng,
    source: "bucharest_center",
    hint: "Punct central Bucuresti (locatie necunoscuta — estimare foarte aproximativa).",
  };
}

export function proxyConfidenceFromLocationSource(
  source: ProxyLocationSource,
  osmHitCount: number,
): number {
  let base: number;
  switch (source) {
    case "coordinates":
      base = 0.58;
      break;
    case "text_hint":
      base = 0.48;
      break;
    case "nominatim":
      base = 0.42;
      break;
    default:
      base = 0.3;
  }
  // Richer OSM samples slightly increase confidence (cap)
  const bonus = osmHitCount >= 12 ? 0.08 : osmHitCount >= 5 ? 0.04 : 0;
  return Math.min(0.72, Math.round((base + bonus) * 100) / 100);
}
