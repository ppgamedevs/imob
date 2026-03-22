import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

import { evalPollution } from "./layers/pollution";
import { evalTraffic } from "./layers/traffic";
import { applySeismicToAnalysis } from "./apply-seismic";
import { buildSeismicRiskLayerFromExplain } from "./seismic-layer";
import { RISK_LAYERS_HIDDEN_IN_REPORT } from "./report-risk-visibility";
import { computeOverall } from "./stack";
import type { RiskLayerResult, RiskStackResult } from "./types";

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

  const [pollution, traffic] = await Promise.all([evalPollution(features), evalTraffic(features)]);

  /** Flood layer kept for schema compatibility; not shown in report / PDF (product decision). */
  const flood: RiskLayerResult = {
    key: "flood",
    level: "unknown",
    score: null,
    confidence: null,
    summary: "Strat inundații dezactivat în raport.",
    details: [],
    sourceName: null,
    sourceUrl: null,
    updatedAt: null,
  };

  const layers = {
    seismic: buildSeismicRiskLayerFromExplain(seismicExplain, snapshot?.updatedAt ?? null),
    flood,
    pollution,
    traffic,
  };
  const overall = computeOverall(layers, { excludeKeys: RISK_LAYERS_HIDDEN_IN_REPORT });
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
