/**
 * Shared geo utilities - single source of truth for haversine, slugify, metro.
 */

import { EARTH_RADIUS_M } from "@/lib/constants";
import { METRO_STATIONS } from "@/lib/data/metro";

/** Haversine distance in meters between two lat/lng points. */
export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** Find nearest metro station from our static dataset. */
export function nearestStationM(lat: number, lng: number): { name: string; distM: number } | null {
  if (lat == null || lng == null) return null;
  let best: { name: string; distM: number } | null = null;
  for (const s of METRO_STATIONS) {
    const d = haversineM(lat, lng, s.lat, s.lng);
    if (!best || d < best.distM) best = { name: s.name, distM: d };
  }
  return best;
}

/**
 * Slugify a Romanian string: remove diacritics, lowercase, replace non-alnum with hyphens.
 * Returns undefined if input is empty/null.
 */
export function slugifyRo(s?: string | null): string | undefined {
  if (!s) return undefined;
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/** Geohash-style grid slug for lat/lng. */
export function gridSlug(lat?: number | null, lng?: number | null, p = 2): string | undefined {
  if (lat == null || lng == null) return undefined;
  return `g-${lat.toFixed(p)}-${lng.toFixed(p)}`;
}
