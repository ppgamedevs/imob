import type { Prisma } from "@prisma/client";

import { buildFeatureVector } from "@/lib/avm/features";
import { predictRidge } from "@/lib/avm/model";
import { getLatestModel } from "@/lib/avm/store";
import { prisma } from "@/lib/db";
import { computePriceBadge } from "@/lib/price-badge";

import { estimateAvm } from "./avm";

/**
 * Load zone data for feature extraction
 */
async function loadZoneData(areaSlug: string | null | undefined) {
  if (!areaSlug) {
    return { medianEurM2: null, supply: null, demandScore: null };
  }

  const latest = await prisma.areaDaily.findFirst({
    where: { areaSlug },
    orderBy: { date: "desc" },
    select: { medianEurM2: true, supply: true, demandScore: true },
  });

  return {
    medianEurM2: latest?.medianEurM2 ?? null,
    supply: latest?.supply ?? null,
    demandScore: latest?.demandScore ?? null,
  };
}

export async function applyAvmToAnalysis(analysisId: string, features: any) {
  let res;

  // Day 33: Feature flag to switch between ML and heuristic AVM
  const useML = process.env.AVM_MODEL === "ml";

  if (useML) {
    // Try to use ML model
    const model = await getLatestModel("avm");

    if (model) {
      try {
        // Build feature vector
        const areaSlug = features?.areaSlug || features?.area_slug;
        const zoneData = await loadZoneData(areaSlug);
        const featureVector = buildFeatureVector(features, zoneData);

        // Predict with ML model
        const pred = predictRidge(model.weights, featureVector);

        res = {
          low: Math.round(pred.lower80),
          mid: Math.round(pred.prediction),
          high: Math.round(pred.upper80),
          conf: pred.conf,
          explain: {
            model: "ridge-v2",
            version: model.version,
            testMae: model.metrics.testMae,
            testMape: model.metrics.testMape,
          },
        };
      } catch (error: any) {
        console.error("[AVM] ML prediction failed, falling back to heuristic:", error.message);
        // Fallback to heuristic if ML fails
        res = await estimateAvm(features);
        res.explain = { ...res.explain, fallback: "ml-error", error: error.message };
      }
    } else {
      // No ML model available, fallback to heuristic
      res = await estimateAvm(features);
      res.explain = { ...res.explain, fallback: "no-ml-model" };
    }
  } else {
    // Use heuristic model (default)
    res = await estimateAvm(features);
  }

  const asking = features?.priceEur ?? null;
  const priceBadge = computePriceBadge(asking, res.low as any, res.mid as any, res.high as any);

  await prisma.scoreSnapshot.upsert({
    where: { analysisId },
    update: {
      avmLow: res.low ?? undefined,
      avmHigh: res.high ?? undefined,
      avmMid: res.mid ?? undefined,
      avmConf: res.conf ?? undefined,
      priceBadge,
      explain: { avm: res.explain } as Prisma.JsonObject,
    } as unknown as Prisma.ScoreSnapshotUpdateInput,
    create: {
      analysisId,
      avmLow: res.low ?? undefined,
      avmHigh: res.high ?? undefined,
      avmMid: res.mid ?? undefined,
      avmConf: res.conf ?? undefined,
      priceBadge,
      explain: { avm: res.explain } as Prisma.JsonObject,
    } as unknown as Prisma.ScoreSnapshotCreateInput,
  });

  return res;
}
