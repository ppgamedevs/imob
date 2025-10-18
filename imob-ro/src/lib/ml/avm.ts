/**
 * AVM v1+ estimator with simple grid smoothing and volatility adjustments.
 * estimatePriceRange(features, areaStats|areaStats[]) -> { low, high, mid, conf }
 * areaStats can be a single object or an array (recent grid cells / timeseries).
 */

export type AreaStats = {
  medianEurPerM2: number;
  count: number;
  ts?: string | number | Date;
};

export function estimatePriceRange(
  features: Record<string, unknown> | null | undefined,
  areaStats: AreaStats | AreaStats[],
) {
  // Derive base €/m2 from either the single stats or a weighted average of recent stats
  let base = 1500;
  let totalCount = 1;
  if (Array.isArray(areaStats)) {
    // Weight recent entries slightly more: weight = 1/(index+1)
    const weights = areaStats.map((_, i) => 1 / (i + 1));
    const totalW = weights.reduce((a, b) => a + b, 0);
    const weighted = areaStats.reduce((acc, s, i) => acc + (s.medianEurPerM2 || 0) * weights[i], 0) / Math.max(1, totalW);
    base = weighted || base;
    totalCount = areaStats.reduce((a, s) => a + (s.count || 0), 0) || 1;
  } else if (areaStats && typeof areaStats === "object") {
    base = (areaStats as AreaStats).medianEurPerM2 ?? base;
    totalCount = (areaStats as AreaStats).count ?? 1;
  }

  const area = Number((features && (features.area_m2 ?? (features as any).areaM2) ? (features.area_m2 ?? (features as any).areaM2) : 50) as number);

  // Base mid price
  let midEur = base * area;

  // Adjust for floor: higher floor -> small premium, with diminishing returns
  const floor = Number(features?.floor ?? 0);
  if (floor > 0) midEur *= 1 + Math.min(0.02 * floor, 0.15);

  // Adjust for year built: newer -> premium, older -> discount
  const year = Number(features?.year_built ?? features?.yearBuilt ?? 0);
  if (year > 0) {
    const age = new Date().getFullYear() - year;
    if (age < 5) midEur *= 1.05;
    else if (age > 50) midEur *= 0.9;
  }

  // Photo condition adjustments
  const photoCondition = features?.photo_condition ?? "unknown";
  if (photoCondition === "poor") midEur *= 0.95;
  if (photoCondition === "excellent") midEur *= 1.05;

  // Distance to metro: simple linear penalty up to 20% at 2km
  const distMetro = Number(features?.dist_to_metro ?? features?.distMetrou ?? 0);
  if (distMetro > 0) midEur *= 1 - Math.min(distMetro / 2000, 0.2);

  // Confidence based on sample count: log scale with clamp
  const conf = Math.min(0.98, 0.2 + Math.log10(Math.max(1, totalCount)) * 0.18);

  // Volatility: depends on area and totalCount (less data -> larger spread)
  const baseVol = 0.08 + (area < 50 ? 0.05 : 0);
  const scarcityFactor = 1 + Math.max(0, 1 - Math.min(1, totalCount / 10));
  const volatility = baseVol * scarcityFactor;

  // Final interval
  const low = Math.round(midEur * (1 - volatility));
  const high = Math.round(midEur * (1 + volatility));

  return {
    low,
    high,
    mid: Math.round(midEur),
    conf,
  };
}

export default estimatePriceRange;

