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

const KNOWN_NEIGHBORHOODS: { name: string; lat: number; lng: number }[] = [
  { name: "Militari", lat: 44.4344, lng: 25.9955 },
  { name: "Drumul Taberei", lat: 44.4196, lng: 26.0314 },
  { name: "Rahova", lat: 44.4089, lng: 26.0728 },
  { name: "Berceni", lat: 44.3825, lng: 26.1251 },
  { name: "Colentina", lat: 44.4669, lng: 26.1305 },
  { name: "Pantelimon", lat: 44.4313, lng: 26.2009 },
  { name: "Floreasca", lat: 44.462, lng: 26.1012 },
  { name: "Dorobanti", lat: 44.4531, lng: 26.0919 },
  { name: "Tineretului", lat: 44.4137, lng: 26.1056 },
  { name: "Cotroceni", lat: 44.4348, lng: 26.0655 },
  { name: "Giulesti", lat: 44.459, lng: 26.0402 },
  { name: "Baneasa", lat: 44.4938, lng: 26.0764 },
  { name: "Herastrau", lat: 44.4753, lng: 26.0801 },
  { name: "Primaverii", lat: 44.4639, lng: 26.0811 },
  { name: "Domenii", lat: 44.4632, lng: 26.0611 },
  { name: "13 Septembrie", lat: 44.4258, lng: 26.076 },
  { name: "Sebastian", lat: 44.4178, lng: 26.0651 },
  { name: "Ferentari", lat: 44.4074, lng: 26.0679 },
  { name: "Giurgiului", lat: 44.3953, lng: 26.0943 },
  { name: "Vitan", lat: 44.4173, lng: 26.1254 },
  { name: "Decebal", lat: 44.4283, lng: 26.1187 },
  { name: "Alba Iulia", lat: 44.4271, lng: 26.1198 },
  { name: "Popesti Leordeni", lat: 44.3775, lng: 26.1629 },
  { name: "Voluntari", lat: 44.4908, lng: 26.1507 },
  { name: "Chiajna", lat: 44.4431, lng: 25.9797 },
  { name: "Bragadiru", lat: 44.3736, lng: 26.0349 },
  { name: "Titan", lat: 44.4218, lng: 26.1706 },
  { name: "Dristor", lat: 44.4202, lng: 26.1405 },
  { name: "Obor", lat: 44.4507, lng: 26.1304 },
  { name: "Greenfield", lat: 44.3775, lng: 26.1629 },
  { name: "Pallady", lat: 44.4104, lng: 26.2283 },
  { name: "Metalurgiei", lat: 44.3746, lng: 26.1322 },
  { name: "Mihai Bravu", lat: 44.4254, lng: 26.1402 },
  { name: "Iancului", lat: 44.437, lng: 26.1401 },
];

/**
 * Try to infer approximate lat/lng from text (title, description) by matching
 * known metro station names or neighborhood patterns. Returns coords if found.
 * Prioritizes metro matches (more precise) over neighborhood matches.
 */
export function inferLocationFromText(
  ...texts: (string | null | undefined)[]
): { lat: number; lng: number; hint: string } | null {
  const combined = texts
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (!combined) return null;

  // Priority 1: metro station match (most precise)
  // Sort by name length desc to match longer names first (e.g. "Piata Unirii" before "Unirii")
  const sorted = [...METRO_STATIONS].sort(
    (a, b) => b.name.length - a.name.length,
  );
  for (const s of sorted) {
    const norm = s.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (combined.includes(norm)) {
      return { lat: s.lat, lng: s.lng, hint: `aproape de metrou ${s.name}` };
    }
  }

  // Priority 2: neighborhood match (approximate center of area)
  const nbSorted = [...KNOWN_NEIGHBORHOODS].sort(
    (a, b) => b.name.length - a.name.length,
  );
  for (const n of nbSorted) {
    const norm = n.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (combined.includes(norm)) {
      return { lat: n.lat, lng: n.lng, hint: `zona ${n.name}` };
    }
  }

  return null;
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
