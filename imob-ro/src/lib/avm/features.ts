/**
 * AVM v2 Feature Engineering
 * Builds numeric feature vectors from FeatureSnapshot for ML models.
 */

export type ZoneData = {
  medianEurM2: number;
  supply: number;
  demand: number;
};

/**
 * Simple string hash function for area encoding
 * Maps string to integer for one-hot bucketing
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Normalize numeric value to [0, 1] range
 * Handles null/undefined by returning defaultValue
 */
export function normalize(
  value: number | null | undefined,
  min: number,
  max: number,
  defaultValue = 0.5,
): number {
  if (value == null) return defaultValue;
  if (max === min) return defaultValue;
  const normalized = (value - min) / (max - min);
  return Math.max(0, Math.min(1, normalized)); // Clamp to [0, 1]
}

/**
 * Build feature vector from normalized features and zone data
 * Returns array of ~110 numeric values for ML model input
 *
 * Feature structure:
 * - [0-99]: One-hot encoded area (100 buckets)
 * - [100]: Normalized area (m²)
 * - [101]: Normalized rooms
 * - [102]: Normalized year built
 * - [103]: Normalized distance to metro
 * - [104]: Condition score (already 0-1)
 * - [105]: Normalized zone median €/m²
 * - [106]: Normalized zone supply
 * - [107]: Normalized zone demand
 * - [108]: Floor level (normalized)
 * - [109]: Has balcony (0/1)
 */
export function buildFeatureVector(
  features: {
    areaSlug?: string | null;
    areaM2?: number | null;
    rooms?: number | null;
    yearBuilt?: number | null;
    distMetroM?: number | null;
    conditionScore?: number | null;
    level?: number | null;
    hasBalcony?: boolean | null;
  },
  zoneData: ZoneData,
): number[] {
  const vector: number[] = [];

  // 1. One-hot encoding for area (100 buckets to reduce dimensionality)
  const areaHash = features.areaSlug ? hashString(features.areaSlug) % 100 : 0;
  for (let i = 0; i < 100; i++) {
    vector.push(i === areaHash ? 1 : 0);
  }

  // 2. Numeric features (normalized to [0, 1])
  vector.push(
    // Property characteristics
    normalize(features.areaM2, 20, 200, 0.4), // Typical range: 20-200 m²
    normalize(features.rooms, 1, 5, 0.5), // Typical: 1-5 rooms
    normalize(features.yearBuilt, 1950, 2024, 0.6), // Built after 1950
    normalize(features.distMetroM, 0, 2000, 0.5), // Within 2km
    features.conditionScore ?? 0.5, // Already 0-1

    // Zone market data
    normalize(zoneData.medianEurM2, 1000, 3000, 0.6), // Bucharest range
    normalize(zoneData.supply, 0, 500, 0.3), // Supply count
    normalize(zoneData.demand, 0, 1, 0.5), // Demand score

    // Additional features
    normalize(features.level, -1, 10, 0.4), // Floor: basement to 10th
    features.hasBalcony ? 1 : 0, // Binary feature
  );

  return vector; // Total: 110 features
}

/**
 * Get default zone data when real data unavailable
 */
export function getDefaultZoneData(): ZoneData {
  return {
    medianEurM2: 1800, // Bucharest average
    supply: 100,
    demand: 0.5,
  };
}
