/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Prisma } from "@prisma/client";

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
