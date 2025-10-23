/**
 * AVM v2 Model Persistence
 * Stores and retrieves trained ML models from database.
 */

import { prisma } from "@/lib/db";
import type { RidgeModel } from "./model";

export type ModelMetrics = {
  mae: number;
  mape: number;
  rmse?: number;
  testMae?: number;
  testMape?: number;
  coverage80?: number;
  samples: number;
  trainSamples?: number;
  testSamples?: number;
};

export type StoredModel = {
  id: string;
  kind: string;
  version: number;
  weights: RidgeModel;
  metrics: ModelMetrics;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Save a new model version to database
 * Auto-increments version number
 */
export async function saveModel(
  kind: string,
  model: RidgeModel,
  metrics: ModelMetrics,
): Promise<StoredModel> {
  // Get latest version
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
      },
      metrics: {
        mae: metrics.mae,
        mape: metrics.mape,
        rmse: metrics.rmse,
        testMae: metrics.testMae,
        testMape: metrics.testMape,
        coverage80: metrics.coverage80,
        samples: metrics.samples,
        trainSamples: metrics.trainSamples,
        testSamples: metrics.testSamples,
      },
    },
  });

  return {
    id: created.id,
    kind: created.kind,
    version: created.version,
    weights: created.weights as RidgeModel,
    metrics: created.metrics as ModelMetrics,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

/**
 * Get the latest model for a given kind
 */
export async function getLatestModel(kind: string): Promise<StoredModel | null> {
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
    metrics: model.metrics as ModelMetrics,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

/**
 * Get a specific model version
 */
export async function getModelByVersion(
  kind: string,
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
    metrics: model.metrics as ModelMetrics,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

/**
 * List model history (recent versions)
 */
export async function listModelHistory(kind: string, limit = 10): Promise<StoredModel[]> {
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
    metrics: m.metrics as ModelMetrics,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }));
}

/**
 * Delete old model versions, keeping only the last N
 */
export async function cleanupOldModels(kind: string, keepLast = 30): Promise<number> {
  const models = await prisma.modelSnapshot.findMany({
    where: { kind },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (models.length <= keepLast) {
    return 0; // Nothing to delete
  }

  const toDelete = models.slice(keepLast).map((m) => m.id);

  const result = await prisma.modelSnapshot.deleteMany({
    where: {
      id: { in: toDelete },
    },
  });

  return result.count;
}
