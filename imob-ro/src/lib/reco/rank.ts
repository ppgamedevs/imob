/**
 * rank.ts
 * Personalized recommendation ranking engine
 * 
 * Scoring factors (weighted):
 * - areaMatch (3.0): Property in user's preferred areas
 * - priceInBand (2.0): Property within user's price band
 * - underpriced (2.5): Property has underpriced badge
 * - fastTTS (1.5): Property has fast time-to-sell
 * - highYield (1.0): Property has net yield >= 6%
 * - metroProximity (0.5): Property close to metro
 * - roomMatch (1.5): Property matches user's room preferences
 * 
 * Candidates: Last 7 days DedupGroups with valid analysis
 */

import { prisma } from "@/lib/db";

// Scoring weights
const WEIGHTS = {
  areaMatch: 3.0,
  priceInBand: 2.0,
  underpriced: 2.5,
  fastTTS: 1.5,
  highYield: 1.0,
  metroProximity: 0.5,
  roomMatch: 1.5,
};

// Top N areas to consider for matching
const TOP_AREAS_TO_MATCH = 5;

interface AreaEntry {
  slug: string;
  score: number;
  ts: string;
}

interface ScoredCandidate {
  groupId: string;
  analysisId: string;
  score: number;
  breakdown: {
    areaMatch: number;
    priceInBand: number;
    underpriced: number;
    fastTTS: number;
    highYield: number;
    metroProximity: number;
    roomMatch: number;
  };
}

/**
 * Get candidate analyses from last 7 days with scores
 */
async function getCandidates() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get completed analyses from last 7 days with scores
  const analyses = await prisma.analysis.findMany({
    where: {
      status: "done",
      createdAt: {
        gte: sevenDaysAgo,
      },
      groupId: {
        not: null,
      },
    },
    include: {
      extractedListing: true,
      scoreSnapshot: true,
      group: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Filter out analyses without score snapshot
  const candidates = analyses
    .filter((a) => a.scoreSnapshot !== null)
    .map((a) => ({
      groupId: a.groupId!,
      analysisId: a.id,
      analysis: a,
    }));

  return candidates;
}

/**
 * Score a single candidate based on user taste and property attributes
 */
function scoreCandidate(
  candidate: any,
  userTaste: {
    areas: AreaEntry[] | null;
    minPrice: number | null;
    maxPrice: number | null;
    rooms: Record<string, number> | null;
  }
): ScoredCandidate {
  const { groupId, analysisId, analysis } = candidate;
  const breakdown = {
    areaMatch: 0,
    priceInBand: 0,
    underpriced: 0,
    fastTTS: 0,
    highYield: 0,
    metroProximity: 0,
    roomMatch: 0,
  };

  const extracted = analysis.extractedListing;
  const score = analysis.scoreSnapshot;

  // 1. Area match (3.0)
  if (userTaste.areas && userTaste.areas.length > 0 && analysis.group) {
    const topAreas = userTaste.areas.slice(0, TOP_AREAS_TO_MATCH);
    const totalScore = topAreas.reduce((sum, a) => sum + a.score, 0);
    
    // Check if property's area matches any top area
    const propertyArea = analysis.group.areaSlug;
    if (propertyArea) {
      const matchedArea = topAreas.find((a) => a.slug === propertyArea);
      if (matchedArea) {
        // Normalize score to 0-1 range
        const normalizedScore = matchedArea.score / totalScore;
        breakdown.areaMatch = normalizedScore * WEIGHTS.areaMatch;
      }
    }
  }

  // 2. Price in band (2.0)
  const priceEur = extracted?.price;
  if (priceEur && userTaste.minPrice && userTaste.maxPrice) {
    const range = userTaste.maxPrice - userTaste.minPrice;
    if (range > 0) {
      if (priceEur >= userTaste.minPrice && priceEur <= userTaste.maxPrice) {
        // Property in band: full score
        breakdown.priceInBand = WEIGHTS.priceInBand;
      } else {
        // Property outside band: decay based on distance
        const distance = priceEur < userTaste.minPrice
          ? userTaste.minPrice - priceEur
          : priceEur - userTaste.maxPrice;
        const normalizedDistance = distance / range;
        const scoreVal = Math.max(0, 1 - normalizedDistance);
        breakdown.priceInBand = scoreVal * WEIGHTS.priceInBand;
      }
    }
  }

  // 3. Underpriced (2.5)
  const priceBadge = score?.priceBadge;
  if (priceBadge === "underpriced") {
    breakdown.underpriced = WEIGHTS.underpriced;
  }

  // 4. Fast TTS (1.5)
  const ttsBucket = score?.ttsBucket;
  if (ttsBucket === "fast") {
    breakdown.fastTTS = WEIGHTS.fastTTS;
  } else if (ttsBucket === "medium") {
    breakdown.fastTTS = WEIGHTS.fastTTS * 0.5;
  }

  // 5. High yield (1.0)
  const netYield = score?.yieldNet;
  if (netYield !== undefined && netYield !== null) {
    if (netYield >= 6.0) {
      breakdown.highYield = WEIGHTS.highYield;
    } else if (netYield >= 4.0) {
      breakdown.highYield = WEIGHTS.highYield * 0.5;
    }
  }

  // 6. Metro proximity (0.5)
  // For now, skip this as we don't have metro distance in schema
  // Could be added later from external data

  // 7. Room match (1.5)
  const rooms = extracted?.rooms;
  if (rooms !== undefined && rooms !== null && userTaste.rooms) {
    const roomKey = String(rooms);
    const roomScore = userTaste.rooms[roomKey];
    if (roomScore) {
      // Normalize room scores
      const totalRoomScore = Object.values(userTaste.rooms).reduce(
        (sum, s) => sum + s,
        0
      );
      const normalizedRoomScore = roomScore / totalRoomScore;
      breakdown.roomMatch = normalizedRoomScore * WEIGHTS.roomMatch;
    }
  }

  // Calculate total score
  const totalScore = Object.values(breakdown).reduce((sum, s) => sum + s, 0);

  return {
    groupId,
    analysisId,
    score: totalScore,
    breakdown,
  };
}

/**
 * Get personalized recommendations for a user
 * 
 * @param userId - User ID
 * @param limit - Number of recommendations to return (default: 10)
 * @returns Array of Analysis records with scores
 */
export async function getPersonalizedRecommendations(
  userId: string,
  limit: number = 10
) {
  // Get user taste
  const taste = await prisma.userTaste.findUnique({
    where: { userId },
  });

  // If no taste profile, fall back to generic recommendations
  if (!taste || !taste.areas) {
    return getGenericRecommendations(limit);
  }

  // Get candidates
  const candidates = await getCandidates();

  // Score candidates
  const scored = candidates.map((c) =>
    scoreCandidate(c, {
      areas: (taste.areas as AreaEntry[] | null) || null,
      minPrice: taste.minPrice,
      maxPrice: taste.maxPrice,
      rooms: (taste.rooms as Record<string, number> | null) || null,
    })
  );

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top N
  const topScored = scored.slice(0, limit);

  // Get full analysis records
  const analysisIds = topScored.map((s) => s.analysisId);
  const analyses = await prisma.analysis.findMany({
    where: {
      id: {
        in: analysisIds,
      },
    },
    include: {
      group: true,
      extractedListing: true,
      scoreSnapshot: true,
    },
  });

  // Sort analyses by score order
  const analysisMap = new Map(analyses.map((a) => [a.id, a]));
  const sorted = topScored
    .map((s) => analysisMap.get(s.analysisId))
    .filter((a) => a !== undefined);

  return sorted;
}

/**
 * Get generic recommendations (fallback for users without taste profile)
 * 
 * @param limit - Number of recommendations to return
 * @returns Array of Analysis records
 */
export async function getGenericRecommendations(limit: number = 10) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const analyses = await prisma.analysis.findMany({
    where: {
      status: "done",
      createdAt: {
        gte: sevenDaysAgo,
      },
      groupId: {
        not: null,
      },
    },
    include: {
      group: true,
      extractedListing: true,
      scoreSnapshot: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit * 3, // Get more to filter
  });

  // Filter for good deals
  const goodDeals = analyses.filter((a) => {
    const score = a.scoreSnapshot;
    if (!score) return false;
    
    const underpriced = score.priceBadge === "underpriced";
    const fastTTS = score.ttsBucket === "fast";
    return underpriced || fastTTS;
  });

  return goodDeals.slice(0, limit);
}
