// Simple seismic risk estimator
// Based on location and construction year

export interface SeismicInput {
  lat: number;
  lng: number;
  yearBuilt?: number;
}

/**
 * Estimate seismic risk score (0-1, lower is better)
 * Bucuresti zones: center/old buildings = higher risk
 */
export async function estimateSeismic(input: SeismicInput): Promise<number> {
  const { lat, lng, yearBuilt } = input;

  // Base risk from location (București center vs periphery)
  // București center roughly: lat 44.43-44.44, lng 26.08-26.11
  const isCentral =
    lat >= 44.42 &&
    lat <= 44.45 &&
    lng >= 26.08 &&
    lng <= 26.12;

  let baseRisk = isCentral ? 0.5 : 0.3;

  // Adjust for construction year
  if (yearBuilt) {
    if (yearBuilt < 1940) {
      baseRisk += 0.3; // Very old, likely no seismic design
    } else if (yearBuilt < 1977) {
      baseRisk += 0.25; // Pre-1977 earthquake, weak codes
    } else if (yearBuilt < 2000) {
      baseRisk += 0.1; // Post-1977 codes, but older
    } else if (yearBuilt < 2010) {
      baseRisk += 0.05; // Modern codes
    } else {
      baseRisk += 0.0; // Recent construction, best codes
    }
  } else {
    // Unknown year, assume moderate risk
    baseRisk += 0.15;
  }

  // Clamp to 0-1
  return Math.max(0, Math.min(1, baseRisk));
}
