import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { NormalizedFeatures } from "@/types/analysis";

import { estimateSeismic } from "./seismic";

export async function applySeismicToAnalysis(analysisId: string, features: NormalizedFeatures) {
  const res = await estimateSeismic(features as unknown);

  const explain: Prisma.JsonObject = {
    seismic: {
      riskClass: res.riskClass,
      confidence: res.confidence,
      method: res.method,
      note: res.note ?? null,
    },
  } as Prisma.JsonObject;

  await prisma.scoreSnapshot.upsert({
    where: { analysisId },
    update: {
      riskClass: String(res.riskClass),
      riskSource: res.source ?? null,
      explain: explain,
    } as unknown as Prisma.ScoreSnapshotUpdateInput,
    create: {
      analysisId,
      riskClass: String(res.riskClass),
      riskSource: res.source ?? null,
      explain: explain,
    } as unknown as Prisma.ScoreSnapshotCreateInput,
  });

  return res;
}
