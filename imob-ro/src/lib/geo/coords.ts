/** Rough bounding box for Romania (WGS84). */
export const ROMANIA_BOUNDS = {
  minLat: 43.6,
  maxLat: 48.3,
  minLng: 20.2,
  maxLng: 30.0,
} as const;

export function validateLatLng(lat: number, lng: number): { ok: true } | { ok: false; reason: string } {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, reason: "non_finite" };
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { ok: false, reason: "out_of_range" };
  }
  return { ok: true };
}

export function isLikelyRomania(lat: number, lng: number): boolean {
  return (
    lat >= ROMANIA_BOUNDS.minLat &&
    lat <= ROMANIA_BOUNDS.maxLat &&
    lng >= ROMANIA_BOUNDS.minLng &&
    lng <= ROMANIA_BOUNDS.maxLng
  );
}
