import { haversineM } from "@/lib/geo";

export function distScoreMeters(m?: number | null, cap = 1500) {
  if (m == null) return 0.0;
  const x = Math.min(m, cap) / cap;
  return 1 - x; // 1 at 0m → 0 at cap
}

export function relDiffScore(a?: number | null, b?: number | null, tol = 0.18) {
  if (!a || !b) return 0;
  const rel = Math.abs(a - b) / Math.max(a, b);
  if (rel >= tol) return 0;
  return 1 - rel / tol; // 1 if equal → 0 at tolerance limit
}

export function roomsScore(a?: number | null, b?: number | null) {
  if (!a || !b) return 0;
  const diff = Math.abs(a - b);
  if (diff === 0) return 1;
  if (diff <= 0.5) return 0.8;
  if (diff <= 1) return 0.5;
  return 0;
}

export function yearScore(a?: number | null, b?: number | null) {
  if (!a || !b) return 0.5;
  const diff = Math.abs(a - b);
  if (diff <= 5) return 1;
  if (diff <= 10) return 0.7;
  if (diff <= 20) return 0.4;
  return 0.2;
}

export function overallScore(params: {
  meters?: number | null;
  areaRef?: number | null;
  area?: number | null;
  roomsRef?: number | null;
  rooms?: number | null;
  yearRef?: number | null;
  year?: number | null;
}) {
  const sDist = distScoreMeters(params.meters ?? null);
  const sArea = relDiffScore(params.areaRef, params.area, 0.18);
  const sRooms = roomsScore(params.roomsRef, params.rooms);
  const sYear = yearScore(params.yearRef, params.year);
  // weights: dist .35, area .35, rooms .2, year .1
  return 0.35 * sDist + 0.35 * sArea + 0.2 * sRooms + 0.1 * sYear;
}

export function eurM2(priceEur?: number | null, areaM2?: number | null) {
  if (!priceEur || !areaM2 || areaM2 <= 0) return null;
  return priceEur / areaM2;
}

export function metersBetween(
  a?: { lat?: number | null; lng?: number | null },
  b?: { lat?: number | null; lng?: number | null },
) {
  if (!a?.lat || !a?.lng || !b?.lat || !b?.lng) return null;
  return haversineM(a.lat, a.lng, b.lat, b.lng);
}
