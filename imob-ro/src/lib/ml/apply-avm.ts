/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Prisma } from "@prisma/client";

import { buildFeatureVector, getDefaultZoneData } from "@/lib/avm/features";
import { predictRidge } from "@/lib/avm/model";
import { getLatestModel } from "@/lib/avm/store";
import { prisma } from "@/lib/db";
import { computePriceBadge } from "@/lib/price-badge";

import { estimateAvm } from "./avm";

/**
 * Load zone data for ML model
 */
async function loadZoneData(areaSlug: string | null | undefined) {
  if (!areaSlug) return getDefaultZoneData();

  const latest = await prisma.areaDaily.findFirst({
    where: { areaSlug },
    orderBy: { date: "desc" },
    select: {
      medianEurM2: true,
      supply: true,
      demandScore: true,
    },
  });

  if (!latest) return getDefaultZoneData();

  return {
    medianEurM2: latest.medianEurM2 ?? 1800,
    supply: latest.supply ?? 100,
    demand: latest.demandScore ?? 0.5,
  };
}

export async function applyAvmToAnalysis(analysisId: string, features: any) {
  let res;
  const useML = process.env.AVM_MODEL === "ml";

  if (useML) {
    // Try to use ML model
    const model = await getLatestModel("avm");

    if (model) {
      try {
        // Build feature vector
        const zoneData = await loadZoneData(features.areaSlug);
        const x = buildFeatureVector(features, zoneData);

        // Predict with ML model
        const pred = predictRidge(model.weights, x);

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

        console.log(`[AVM] ML prediction for ${analysisId}: ${res.mid} [${res.low}, ${res.high}]`);
      } catch (error) {
        console.error(`[AVM] ML prediction failed for ${analysisId}:`, error);
        // Fallback to heuristic
        res = await estimateAvm(features);
        res.explain.fallback = "ml-error";
        res.explain.error = error instanceof Error ? error.message : String(error);
      }
    } else {
      // No model available, fallback to heuristic
      res = await estimateAvm(features);
      res.explain.fallback = "no-ml-model";
      console.warn(`[AVM] No ML model available for ${analysisId}, using heuristic`);
    }
  } else {
    // Use heuristic (default)
    res = await estimateAvm(features);
    res.explain.model = "heuristic-v1";
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
