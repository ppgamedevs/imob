import { prisma } from "@/lib/db";
import type { NormalizedFeatures } from "@/types/analysis";

import { estimateTTS } from "./tts";

type ScoreLike = { avmMid?: number | null } | null;

export async function applyTtsToAnalysis(analysisId: string, features: NormalizedFeatures) {
  const scores = (await prisma.scoreSnapshot.findUnique({ where: { analysisId } })) as ScoreLike;

  const res = await estimateTTS({
    // scores shape may lack avmMid; read defensively
    avmMid: (scores as ScoreLike)?.avmMid ?? undefined,
    asking: features.priceEur ?? undefined,
    areaSlug: features.areaSlug ?? undefined,
    month: new Date().getMonth() + 1,
    areaM2: features.areaM2 ?? undefined,
    conditionScore: features.conditionScore ?? undefined,
  });

  try {
    // prefer update when a ScoreSnapshot exists
    await prisma.scoreSnapshot.update({ where: { analysisId }, data: { ttsBucket: res.bucket } });
  } catch {
    // it's okay if the snapshot doesn't exist yet; AVM step should create it in normal flow
  }

  return res;
}
