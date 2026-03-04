/**
 * Similarity scoring: weighted multi-dimensional comparison.
 * Pure function — no DB or side effects.
 *
 * Weight budget: distance(35) + rooms(20) + area(25) + yearBucket(10) + floor(10) = 100
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const W_DISTANCE = 35;
const W_ROOMS = 20;
const W_AREA = 25;
const W_YEAR = 10;
const W_FLOOR = 10;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SimilaritySubject {
  areaM2: number;
  rooms?: number | null;
  yearBuilt?: number | null;
  floor?: number | null;
}

export interface SimilarityCandidate {
  areaM2: number;
  rooms: number | null;
  yearBuilt: number | null;
  distanceM: number;
  floor?: number | null;
}

export function computeSimilarityScore(
  subject: SimilaritySubject,
  comp: SimilarityCandidate,
): number {
  let score = 0;

  // Distance component (0..35): closer is better
  if (comp.distanceM <= 100) score += W_DISTANCE;
  else if (comp.distanceM <= 300) score += W_DISTANCE * 0.85;
  else if (comp.distanceM <= 500) score += W_DISTANCE * 0.7;
  else if (comp.distanceM <= 800) score += W_DISTANCE * 0.5;
  else if (comp.distanceM <= 1200) score += W_DISTANCE * 0.25;
  else score += 0;

  // Rooms component (0..20): exact match best
  if (subject.rooms != null && comp.rooms != null) {
    const diff = Math.abs(subject.rooms - comp.rooms);
    if (diff === 0) score += W_ROOMS;
    else if (diff === 1) score += W_ROOMS * 0.5;
    else score += 0;
  } else {
    score += W_ROOMS * 0.4;
  }

  // Area component (0..25): percentage difference
  const areaPctDiff = Math.abs(comp.areaM2 - subject.areaM2) / subject.areaM2;
  if (areaPctDiff <= 0.05) score += W_AREA;
  else if (areaPctDiff <= 0.1) score += W_AREA * 0.8;
  else if (areaPctDiff <= 0.15) score += W_AREA * 0.6;
  else if (areaPctDiff <= 0.2) score += W_AREA * 0.35;
  else score += 0;

  // Year bucket component (0..10)
  if (subject.yearBuilt != null && comp.yearBuilt != null) {
    const yearDiff = Math.abs(subject.yearBuilt - comp.yearBuilt);
    if (yearDiff <= 5) score += W_YEAR;
    else if (yearDiff <= 10) score += W_YEAR * 0.7;
    else if (yearDiff <= 15) score += W_YEAR * 0.4;
    else score += 0;
  } else {
    score += W_YEAR * 0.3;
  }

  // Floor component (0..10)
  if (subject.floor != null && comp.floor != null) {
    const floorDiff = Math.abs(subject.floor - comp.floor);
    if (floorDiff === 0) score += W_FLOOR;
    else if (floorDiff <= 2) score += W_FLOOR * 0.6;
    else score += W_FLOOR * 0.2;
  } else {
    score += W_FLOOR * 0.3;
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}
