/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/db";
import { computePriceBadge } from "@/lib/price-badge";

import { estimateAvm } from "./avm";

export async function applyAvmToAnalysis(analysisId: string, features: any) {
  const res = await estimateAvm(features);
  const asking = features?.priceEur ?? null;
  const priceBadge = computePriceBadge(asking, res.low as any, res.mid as any, res.high as any);

  await prisma.scoreSnapshot.upsert({
    where: { analysisId },
    update: {
      avmLow: res.low,
      avmHigh: res.high,
      avmMid: res.mid,
      avmConf: res.conf,
      priceBadge,
      explain: { avm: res.explain },
    },
    create: {
      analysisId,
      avmLow: res.low,
      avmHigh: res.high,
      avmMid: res.mid,
      avmConf: res.conf,
      priceBadge,
      explain: { avm: res.explain },
    },
  });

  return res;
}
