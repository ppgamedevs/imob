/**
 * Confidence scoring for analysis reports.
 * Determines how reliable the AVM estimate is based on data quality.
 */

import { CONFIDENCE_COMPS_LOW, CONFIDENCE_COMPS_MEDIUM, CONFIDENCE_MAX_AGE_DAYS } from "@/lib/constants";
import type { ConfidenceLevel, ConfidenceResult, NormalizedFeatures } from "@/lib/types/pipeline";

export function computeConfidence(
  features: NormalizedFeatures,
  compCount: number,
  oldestCompDays?: number,
): ConfidenceResult {
  let score = 0;

  // Sample size scoring (0-40 points)
  let samplePoints = 0;
  if (compCount >= 8) samplePoints = 40;
  else if (compCount >= CONFIDENCE_COMPS_MEDIUM) samplePoints = 25;
  else if (compCount >= CONFIDENCE_COMPS_LOW) samplePoints = 15;
  else samplePoints = compCount * 3;
  score += samplePoints;

  // Recency scoring (0-20 points)
  const isRecent = !oldestCompDays || oldestCompDays <= CONFIDENCE_MAX_AGE_DAYS;
  score += isRecent ? 20 : 5;

  // Geocoding quality (0-20 points)
  let geocodingQuality: "exact" | "area" | "none" = "none";
  if (features.lat != null && features.lng != null) {
    geocodingQuality = "exact";
    score += 20;
  } else if (features.areaSlug) {
    geocodingQuality = "area";
    score += 10;
  }

  // Feature completeness (0-20 points, 5 each)
  let completeness = 0;
  if (features.yearBuilt != null) completeness++;
  if (features.level != null) completeness++;
  if (features.areaM2 != null) completeness++;
  if (features.rooms != null) completeness++;
  score += completeness * 5;

  let level: ConfidenceLevel;
  if (score >= 70) level = "high";
  else if (score >= 40) level = "medium";
  else level = "low";

  return {
    level,
    score: Math.min(100, score),
    factors: {
      sampleSize: compCount,
      recency: isRecent,
      geocodingQuality,
      featureCompleteness: completeness,
    },
  };
}
