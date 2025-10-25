/**
 * Day 33: Model persistence for ML-based AVM
 * Stores and retrieves trained models from ModelSnapshot table
 */

import { prisma } from "@/lib/db";

import type { RidgeModel, TrainingMetrics } from "./model";

export type ModelKind = "avm" | "tts" | "rent";

export type StoredModel = {
  id: string;
  kind: string;
  version: number;
  weights: RidgeModel;
  metrics: TrainingMetrics & { testMae?: number; testMape?: number; coverage80?: number };
  createdAt: Date;
};

/**
 * Save a trained model to the database
 * Automatically increments version number
 */
export async function saveModel(
  kind: ModelKind,
  model: RidgeModel,
  metrics: any,
): Promise<StoredModel> {
  // Get latest version for this model kind
  const latest = await getLatestModel(kind);
  const version = (latest?.version ?? 0) + 1;

  const created = await prisma.modelSnapshot.create({
    data: {
      kind,
      version,
      weights: {
        weights: model.weights,
        intercept: model.intercept,
        residualStd: model.residualStd,
        featureMeans: model.featureMeans,
      },
      metrics: {
        ...metrics,
      },
    },
  });

  return {
    id: created.id,
    kind: created.kind,
    version: created.version,
    weights: created.weights as RidgeModel,
    metrics: created.metrics as any,
    createdAt: created.createdAt,
  };
}

/**
 * Get the latest model for a given kind
 */
export async function getLatestModel(kind: ModelKind): Promise<StoredModel | null> {
  const model = await prisma.modelSnapshot.findFirst({
    where: { kind },
    orderBy: { createdAt: "desc" },
  });

  if (!model) return null;

  return {
    id: model.id,
    kind: model.kind,
    version: model.version,
    weights: model.weights as RidgeModel,
    metrics: model.metrics as any,
    createdAt: model.createdAt,
  };
}

/**
 * Get a specific model by version
 */
export async function getModelByVersion(
  kind: ModelKind,
  version: number,
): Promise<StoredModel | null> {
  const model = await prisma.modelSnapshot.findFirst({
    where: { kind, version },
  });

  if (!model) return null;

  return {
    id: model.id,
    kind: model.kind,
    version: model.version,
    weights: model.weights as RidgeModel,
    metrics: model.metrics as any,
    createdAt: model.createdAt,
  };
}

/**
 * List model history for a given kind
 */
export async function listModelHistory(kind: ModelKind, limit = 10): Promise<StoredModel[]> {
  const models = await prisma.modelSnapshot.findMany({
    where: { kind },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return models.map((m) => ({
    id: m.id,
    kind: m.kind,
    version: m.version,
    weights: m.weights as RidgeModel,
    metrics: m.metrics as any,
    createdAt: m.createdAt,
  }));
}

/**
 * Delete old model versions, keeping only the most recent N
 */
export async function cleanupOldModels(kind: ModelKind, keepCount = 30): Promise<number> {
  const models = await prisma.modelSnapshot.findMany({
    where: { kind },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (models.length <= keepCount) return 0;

  const toDelete = models.slice(keepCount).map((m) => m.id);

  const result = await prisma.modelSnapshot.deleteMany({
    where: {
      id: { in: toDelete },
    },
  });

  return result.count;
}
