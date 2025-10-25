/**
 * Day 33: Feature extraction for ML-based AVM
 * Builds numeric feature vector from FeatureSnapshot for ridge regression
 */

const AREA_HASH_BUCKETS = 100;

/**
 * Simple string hash function for one-hot encoding areas
 */
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Normalize value to [0, 1] range given typical min/max
 */
function normalize(value: number | null | undefined, min: number, max: number): number {
  if (value == null || isNaN(value)) return 0.5; // Default middle value
  const clamped = Math.max(min, Math.min(max, value));
  if (max === min) return 0.5;
  return (clamped - min) / (max - min);
}

/**
 * Safe number conversion
 */
function toNumber(val: any, defaultVal = 0): number {
  if (val == null) return defaultVal;
  const n = Number(val);
  return isNaN(n) ? defaultVal : n;
}

/**
 * Zone data structure (from loadZone or AreaDaily)
 */
export type ZoneData = {
  medianEurM2?: number | null;
  supply?: number | null;
  demandScore?: number | null;
};

/**
 * Build feature vector for ML model
 * Returns array of ~110 features:
 * - 100 one-hot encoded area buckets
 * - 5 normalized property features
 * - 3 zone market context features
 */
export function buildFeatureVector(features: any, zoneData: ZoneData = {}): number[] {
  const vector: number[] = [];

  // 1. One-hot encoding for area (100 buckets)
  const areaSlug = features?.areaSlug || features?.area_slug || "";
  const areaHash = areaSlug ? hashString(areaSlug) % AREA_HASH_BUCKETS : 0;

  for (let i = 0; i < AREA_HASH_BUCKETS; i++) {
    vector.push(i === areaHash ? 1 : 0);
  }

  // 2. Normalized property features
  const areaM2 = toNumber(features?.areaM2 || features?.area_m2);
  const rooms = toNumber(features?.rooms || features?.room_count);
  const yearBuilt = toNumber(features?.yearBuilt || features?.year_built);
  const distMetroM = toNumber(features?.distMetroM || features?.dist_metro_m);
  const conditionScore = toNumber(features?.conditionScore || features?.condition_score, 0.5);

  vector.push(
    normalize(areaM2, 20, 200), // Typical range: 20-200 m²
    normalize(rooms, 1, 5), // 1-5 rooms
    normalize(yearBuilt, 1950, 2024), // Built between 1950-2024
    normalize(distMetroM, 0, 2000), // 0-2000m from metro
    normalize(conditionScore, 0, 1), // Already 0-1 but ensure it
  );

  // 3. Zone market context features
  const medianEurM2 = toNumber(zoneData.medianEurM2);
  const supply = toNumber(zoneData.supply);
  const demandScore = toNumber(zoneData.demandScore, 0.5);

  vector.push(
    normalize(medianEurM2, 1000, 3000), // Typical Bucharest range: 1000-3000 €/m²
    normalize(supply, 0, 500), // Supply count 0-500
    normalize(demandScore, 0, 1), // Demand score 0-1
  );

  return vector;
}

/**
 * Get expected feature vector length (for validation)
 */
export function getFeatureVectorLength(): number {
  return AREA_HASH_BUCKETS + 5 + 3; // 108 total features
}

/**
 * Feature names for debugging/interpretation
 */
export function getFeatureNames(): string[] {
  const names: string[] = [];

  // Area buckets
  for (let i = 0; i < AREA_HASH_BUCKETS; i++) {
    names.push(`area_hash_${i}`);
  }

  // Property features
  names.push(
    "area_m2_norm",
    "rooms_norm",
    "year_built_norm",
    "dist_metro_m_norm",
    "condition_score_norm",
  );

  // Zone features
  names.push("zone_median_eur_m2_norm", "zone_supply_norm", "zone_demand_score_norm");

  return names;
}
