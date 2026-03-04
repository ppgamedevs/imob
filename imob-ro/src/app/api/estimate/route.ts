import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import {
  BUCHAREST_FALLBACK_EUR_M2,
  computeAdjustments,
  computeConfidence,
  computeConfidenceWhy,
  computeEurM2Stats,
  computeLiquidity,
  computeRecommendations,
  computeRisks,
  computeSpreadRanges,
  computeTightenTips,
  EstimateInputSchema,
  type EstimateOutput,
  fetchCompsFromListings,
  inputCompleteness,
  RELAXED_RADIUS_M,
  scoreAndClassify,
  TIGHT_RADIUS_M,
  totalAdjustmentPct,
} from "@/lib/estimate";
import { flags } from "@/lib/feature-flags";

const QUERY_TIMEOUT_MS = 8_000;

export async function POST(req: Request) {
  if (!flags.estimateEnabled) {
    return NextResponse.json(
      { error: "Estimarile sunt temporar dezactivate. Revino in curand." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = EstimateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // ----- Fetch & score comps -----
  let rawComps: Awaited<ReturnType<typeof fetchCompsFromListings>> = [];
  const hasGeo = input.lat != null && input.lng != null;

  if (hasGeo) {
    try {
      rawComps = await Promise.race([
        fetchCompsFromListings({
          lat: input.lat!,
          lng: input.lng!,
          areaM2: input.usableAreaM2,
          rooms: input.rooms,
          yearBuilt: input.yearBuilt,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), QUERY_TIMEOUT_MS),
        ),
      ]);
    } catch {
      rawComps = [];
    }
  }

  const scored = scoreAndClassify(rawComps, {
    lat: input.lat,
    lng: input.lng,
    areaM2: input.usableAreaM2,
    rooms: input.rooms,
    yearBuilt: input.yearBuilt,
  });

  // ----- Adjustments -----
  const adjustments = computeAdjustments(input);
  const adjTotal = totalAdjustmentPct(adjustments);

  // ----- EUR/m² stats -----
  const stats = computeEurM2Stats(scored.map((c) => c.eurM2));
  const medianEurM2 = stats.medianEurM2 || BUCHAREST_FALLBACK_EUR_M2;

  const tightCount = scored.filter((c) => c.matchType === "tight").length;
  const tightRatio = scored.length > 0 ? tightCount / scored.length : 0;
  const completeness = inputCompleteness(input);

  // ----- Confidence & ranges -----
  const confidence = computeConfidence(
    stats.valuesUsed,
    stats.dispersion,
    tightRatio,
    completeness,
  );
  const confidenceWhy = computeConfidenceWhy(
    stats.valuesUsed,
    stats.dispersion,
    tightRatio,
    completeness,
  );

  const { fairLikely, range80, range95 } = computeSpreadRanges(
    medianEurM2,
    input.usableAreaM2,
    stats.dispersion,
    confidence,
    adjTotal,
  );

  // ----- Determine used radius -----
  const maxDist = scored.length > 0 ? Math.max(...scored.map((c) => c.distanceM)) : 0;
  const usedRadiusMeters =
    scored.length === 0 ? 0 : maxDist <= TIGHT_RADIUS_M ? TIGHT_RADIUS_M : RELAXED_RADIUS_M;

  // ----- Paywall limits -----
  const FREE_COMPS = 6;
  const PRO_COMPS = 20;
  const paywallActive = flags.estimatePaywall;
  const maxComps = paywallActive ? FREE_COMPS : PRO_COMPS;
  const totalCompsAvailable = Math.min(scored.length, PRO_COMPS);

  // ----- Build response -----
  const compsOut = scored.slice(0, maxComps).map((c) => ({
    id: c.id,
    url: c.sourceUrl ?? undefined,
    priceEur: c.priceEur,
    pricePerSqm: c.eurM2,
    distanceMeters: c.distanceM,
    similarityScore: c.similarityScore,
    source: c.source ?? undefined,
  }));

  const profile = { ...input, rooms: input.rooms, usableAreaM2: input.usableAreaM2 };

  const responseBody: EstimateOutput = {
    fairLikely,
    range80,
    range95,
    confidence,
    confidenceWhy,
    comps: compsOut,
    adjustments,
    liquidity: computeLiquidity(input.rooms, input.usableAreaM2),
    recommendations: computeRecommendations(profile),
    risks: computeRisks(profile),
    tightenTips: computeTightenTips(profile, stats.valuesUsed),
    meta: {
      compsCount: stats.valuesUsed,
      dispersion: stats.dispersion,
      usedRadiusMeters,
      limits: {
        freeCompsReturned: FREE_COMPS,
        proCompsReturned: PRO_COMPS,
        totalCompsAvailable,
        paywallActive,
      },
    },
  };

  // Fire-and-forget persist (gated by flag)
  if (flags.estimatePersist) {
    prisma.userEstimate
      .create({
        data: {
          inputs: input as Record<string, unknown>,
          result: responseBody as unknown as Record<string, unknown>,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          confidence,
          fairMin: range80.min,
          fairMax: range80.max,
          fairLikely,
          compsCount: stats.valuesUsed,
          dispersion: stats.dispersion,
        },
      })
      .catch(() => {
        /* non-fatal — analytics only */
      });
  }

  return NextResponse.json(responseBody);
}
