import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

import { evalFlood } from "./layers/flood";
import { evalPollution } from "./layers/pollution";
import { evalTraffic } from "./layers/traffic";
import { applySeismicToAnalysis } from "./apply-seismic";
import { buildSeismicRiskLayerFromExplain } from "./seismic-layer";
import { computeOverall } from "./stack";
import type { RiskStackResult } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function applyRiskStackToAnalysis(
  analysisId: string,
  features: Record<string, unknown>,
): Promise<RiskStackResult> {
  await applySeismicToAnalysis(analysisId, features);

  const snapshot = await prisma.scoreSnapshot.findUnique({
    where: { analysisId },
    select: {
      explain: true,
      updatedAt: true,
    },
  });

  const existingExplain = isRecord(snapshot?.explain) ? snapshot.explain : {};
  const seismicExplain = isRecord(existingExplain.seismic) ? existingExplain.seismic : null;

  const [flood, pollution, traffic] = await Promise.all([
    evalFlood(features),
    evalPollution(features),
    evalTraffic(features),
  ]);

  const layers = {
    seismic: buildSeismicRiskLayerFromExplain(seismicExplain, snapshot?.updatedAt ?? null),
    flood,
    pollution,
    traffic,
  };
  const overall = computeOverall(layers);
  const riskStack: RiskStackResult = {
    ...overall,
    layers,
    notes: overall.notes,
  };

  await prisma.scoreSnapshot.upsert({
    where: { analysisId },
    update: {
      explain: { ...existingExplain, riskStack } as unknown as Prisma.JsonObject,
    } as unknown as Prisma.ScoreSnapshotUpdateInput,
    create: {
      analysisId,
      explain: { riskStack } as unknown as Prisma.JsonObject,
    } as unknown as Prisma.ScoreSnapshotCreateInput,
  });

  return riskStack;
}
