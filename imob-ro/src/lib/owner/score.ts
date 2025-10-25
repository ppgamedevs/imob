/**
 * Pre-Market Score Calculator
 * 0-100 readiness score for fast sale
 */

import type { PreMarketScore } from "@/types/owner";

type ScoreInputs = {
  avmMid?: number;
  priceEur?: number;
  qualityScore?: number; // 0-1 from explain.quality
  photosCount?: number;
  textLength?: number;
  fixesSelected?: string[]; // ROI item IDs that are toggled
  distMetroM?: number;
  yearBuilt?: number;
  demand?: number; // area demand score 0-1
};

/**
 * Compute Pre-Market Score (0-100)
 * Target: ≥75 for fast sale
 *
 * Weighted components:
 * - Price alignment (35 pts): closer to AVM mid = better
 * - Quality (25 pts): photos + text completeness
 * - ROI fixes (20 pts): improvements applied
 * - Location signals (10 pts): metro proximity + building basics
 * - Demand context (5 pts): seasonality + area demand
 * - Base (5 pts): always given
 */
export function computePreMarketScore(inputs: ScoreInputs): PreMarketScore {
  const breakdown: Record<string, number> = {};
  let total = 0;

  // 1. Base score (everyone gets 5 pts)
  breakdown.base = 5;
  total += 5;

  // 2. Price alignment (max 35 pts)
  if (inputs.avmMid && inputs.priceEur) {
    const delta = Math.abs(inputs.priceEur - inputs.avmMid) / inputs.avmMid;
    let priceScore = 0;

    if (delta <= 0.05) {
      priceScore = 35; // within 5% of AVM → perfect
    } else if (delta <= 0.1) {
      priceScore = 30; // within 10% → great
    } else if (delta <= 0.15) {
      priceScore = 25; // within 15% → good
    } else if (delta <= 0.2) {
      priceScore = 20; // within 20% → fair
    } else if (delta <= 0.3) {
      priceScore = 10; // within 30% → poor
    } else {
      priceScore = 5; // >30% delta → very poor
    }

    breakdown.priceAlignment = priceScore;
    total += priceScore;
  } else {
    // No price or AVM → give partial credit
    breakdown.priceAlignment = 15;
    total += 15;
  }

  // 3. Quality score (max 25 pts)
  const photosCount = inputs.photosCount ?? 0;
  const textLength = inputs.textLength ?? 0;

  let photoPoints = 0;
  if (photosCount >= 10) photoPoints = 15;
  else if (photosCount >= 6) photoPoints = 12;
  else if (photosCount >= 3) photoPoints = 8;
  else if (photosCount >= 1) photoPoints = 4;

  let textPoints = 0;
  if (textLength >= 300) textPoints = 10;
  else if (textLength >= 220) textPoints = 8;
  else if (textLength >= 150) textPoints = 5;
  else if (textLength >= 50) textPoints = 3;

  const qualityTotal = Math.min(25, photoPoints + textPoints);
  breakdown.quality = qualityTotal;
  total += qualityTotal;

  // 4. ROI fixes applied (max 20 pts)
  const fixesSelected = inputs.fixesSelected ?? [];
  const fixPoints = Math.min(20, fixesSelected.length * 4);
  breakdown.roiFixes = fixPoints;
  total += fixPoints;

  // 5. Location signals (max 10 pts)
  let locationPoints = 0;

  if (inputs.distMetroM !== undefined) {
    if (inputs.distMetroM < 300) locationPoints += 5;
    else if (inputs.distMetroM < 600) locationPoints += 4;
    else if (inputs.distMetroM < 1000) locationPoints += 2;
  }

  if (inputs.yearBuilt !== undefined) {
    if (inputs.yearBuilt >= 2015) locationPoints += 5;
    else if (inputs.yearBuilt >= 2005) locationPoints += 3;
    else if (inputs.yearBuilt >= 1990) locationPoints += 2;
    else locationPoints += 1;
  }

  locationPoints = Math.min(10, locationPoints);
  breakdown.location = locationPoints;
  total += locationPoints;

  // 6. Demand context (max 5 pts)
  const demand = inputs.demand ?? 0.5;
  const demandPoints = Math.round(demand * 5);
  breakdown.demand = demandPoints;
  total += demandPoints;

  // Cap at 100
  const score = Math.min(100, total);

  return { score, breakdown };
}

/**
 * Get score tier and badge
 */
export function getScoreTier(score: number): {
  tier: "excellent" | "good" | "fair" | "needs-work";
  label: string;
  color: string;
} {
  if (score >= 85) {
    return { tier: "excellent", label: "Excelent", color: "text-success" };
  }
  if (score >= 75) {
    return { tier: "good", label: "Bun", color: "text-primary" };
  }
  if (score >= 60) {
    return { tier: "fair", label: "Acceptabil", color: "text-warning" };
  }
  return { tier: "needs-work", label: "Necesită îmbunătățiri", color: "text-danger" };
}
