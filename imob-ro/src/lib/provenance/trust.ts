import { prisma } from "@/lib/db";

/**
 * Computes TrustScore based on provenance heuristics.
 * Base score: 100. Apply positive/negative adjustments.
 *
 * Scoring logic:
 * + Completeness (all fields present): +5
 * + AVM confidence >= 0.6: +3
 * + Observable history (2+ sights): +2
 * - Multiple price drops: -5
 * - Photo reuse detected: -20
 * - Contact changed: -10
 * - Missing coordinates: -10
 * - Uncertain year built: -3
 *
 * @param analysisId - Analysis ID to score
 * @returns Trust snapshot object (score, badge, reasons)
 */
export async function computeTrustScore(analysisId: string): Promise<{
  score: number;
  badge: string;
  reasons: { plus: string[]; minus: string[] };
}> {
  const [events, sights, analysis] = await Promise.all([
    prisma.provenanceEvent.findMany({ where: { analysisId } }),
    prisma.sight.findMany({ where: { analysisId } }),
    prisma.analysis.findUnique({
      where: { id: analysisId },
      include: {
        featureSnapshot: true,
        scoreSnapshot: true,
      },
    }),
  ]);

  // Extract features
  const features: Record<string, unknown> =
    (analysis?.featureSnapshot?.features as Record<string, unknown>) ?? {};
  const scores: Record<string, unknown> =
    (analysis?.scoreSnapshot as unknown as Record<string, unknown>) ?? {};

  let score = 100;
  const reasons: { plus: string[]; minus: string[] } = { plus: [], minus: [] };

  // Positive signals
  if (features.priceEur && features.areaM2 && features.rooms && features.distMetroM != null) {
    score += 5;
    reasons.plus.push("completitudine bună");
  }

  if (scores.avmConf && (scores.avmConf as number) >= 0.6) {
    score += 3;
    reasons.plus.push("AVM confidence ok");
  }

  if (sights.length >= 2) {
    score += 2;
    reasons.plus.push("istoric observabil");
  }

  // Negative signals
  const priceDrops = events.filter((e) => e.kind === "PRICE_DROP");
  if (priceDrops.length >= 2) {
    score -= 5;
    reasons.minus.push("multe modificări de preț");
  }

  const reused = events.find((e) => e.kind === "PHOTO_REUSED");
  if (reused) {
    score -= 20;
    reasons.minus.push("poze recirculate pe alte anunțuri");
  }

  const contactChanged = events.filter((e) => e.kind === "CONTACT_CHANGED");
  if (contactChanged.length >= 1) {
    score -= 10;
    reasons.minus.push("contact schimbat");
  }

  if (!features.lat || !features.lng) {
    score -= 10;
    reasons.minus.push("lipsă coordonate");
  }

  if (
    !features.yearBuilt ||
    (typeof features.yearBuilt === "number" && features.yearBuilt < 1900)
  ) {
    score -= 3;
    reasons.minus.push("an construcție incert");
  }

  // Clamp score [0, 100]
  score = Math.max(0, Math.min(100, score));

  // Badge assignment
  const badge = score >= 80 ? "High" : score >= 60 ? "Medium" : "Low";

  // Upsert snapshot
  await prisma.trustSnapshot.upsert({
    where: { analysisId },
    update: {
      score,
      badge,
      reasons: reasons as never,
    },
    create: {
      analysisId,
      score,
      badge,
      reasons: reasons as never,
    },
  });

  return { score, badge, reasons };
}
