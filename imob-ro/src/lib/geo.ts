import { METRO_STATIONS } from "@/lib/data/metro";

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function nearestStationM(lat: number, lng: number) {
  if (lat == null || lng == null) return null;
  let best: { name: string; distM: number } | null = null;
  for (const s of METRO_STATIONS) {
    const d = haversineM(lat, lng, s.lat, s.lng);
    if (!best || d < best.distM) best = { name: s.name, distM: d };
  }
  return best;
}

export function slugifyRo(s?: string | null) {
  if (!s) return undefined;
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function gridSlug(lat?: number | null, lng?: number | null, p = 2) {
  if (lat == null || lng == null) return undefined;
  return `g-${lat.toFixed(p)}-${lng.toFixed(p)}`;
}
