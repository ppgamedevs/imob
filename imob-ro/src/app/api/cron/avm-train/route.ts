/**
 * Day 33: AVM Training Cron Endpoint
 * Trains ridge regression model nightly on 90-day historical data
 * GET /api/cron/avm-train
 */

import { NextResponse } from "next/server";

import { buildFeatureVector } from "@/lib/avm/features";
import { evaluateModel, trainRidge } from "@/lib/avm/model";
import { getLatestModel, saveModel } from "@/lib/avm/store";
import { prisma } from "@/lib/db";

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Load zone data for a given area slug
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

export async function GET() {
  try {
    const startTime = Date.now();

    // 1. Pull last 90 days of completed analyses with features
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const analyses = await prisma.analysis.findMany({
      where: {
        status: "done",
        createdAt: { gte: cutoffDate },
        featureSnapshot: { isNot: null },
      },
      include: {
        featureSnapshot: true,
        group: {
          include: {
            analyses: {
              where: { status: "done" },
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { scoreSnapshot: true },
            },
          },
        },
      },
      take: 10000, // Limit to avoid overwhelming query
    });

    console.log(`[AVM-Train] Found ${analyses.length} analyses in last 90 days`);

    // 2. Build training pairs (features, target)
    const pairs: Array<{ x: number[]; y: number }> = [];

    for (const analysis of analyses) {
      const features = analysis.featureSnapshot?.features as any;
      if (!features) continue;

      // Target: actual priceEur (asking price)
      // Fallback: group median estimate × area (if no price available)
      let target = features.priceEur || features.price_eur;

      if (!target || target <= 0) {
        // Try to use group's existing AVM estimate as proxy
        const groupAnalysis = analysis.group?.analyses?.[0];
        const avmMid = groupAnalysis?.scoreSnapshot?.avmMid;
        const areaM2 = features.areaM2 || features.area_m2;

        if (avmMid && areaM2 && areaM2 > 0) {
          target = avmMid;
        } else {
          continue; // Skip if no valid target
        }
      }

      // Build feature vector
      const areaSlug = features.areaSlug || features.area_slug;
      const zoneData = await loadZoneData(areaSlug);
      const featureVector = buildFeatureVector(features, zoneData);

      // Validate feature vector
      if (featureVector.length !== 108) {
        console.warn(`[AVM-Train] Invalid feature vector length: ${featureVector.length}`);
        continue;
      }

      // Validate target (remove extreme outliers)
      if (target < 10000 || target > 1000000) {
        continue; // Unrealistic prices for Bucharest
      }

      pairs.push({ x: featureVector, y: target });
    }

    console.log(`[AVM-Train] Built ${pairs.length} valid training pairs`);

    // 3. Check minimum data requirement
    if (pairs.length < 1000) {
      return NextResponse.json({
        error: "Insufficient training data",
        samples: pairs.length,
        required: 1000,
      });
    }

    // 4. Split 80/20 train/test
    const shuffled = shuffle(pairs);
    const splitIndex = Math.floor(shuffled.length * 0.8);
    const trainPairs = shuffled.slice(0, splitIndex);
    const testPairs = shuffled.slice(splitIndex);

    const X_train = trainPairs.map((p) => p.x);
    const y_train = trainPairs.map((p) => p.y);
    const X_test = testPairs.map((p) => p.x);
    const y_test = testPairs.map((p) => p.y);

    console.log(`[AVM-Train] Train: ${X_train.length}, Test: ${X_test.length}`);

    // 5. Train ridge regression
    const lambda = 1.0; // Regularization strength
    const { model, metrics: trainMetrics } = trainRidge(X_train, y_train, lambda);

    console.log(
      `[AVM-Train] Training complete - MAE: ${trainMetrics.mae.toFixed(0)}, MAPE: ${trainMetrics.mape.toFixed(2)}%`,
    );

    // 6. Evaluate on test set
    const testMetrics = evaluateModel(model, X_test, y_test);

    console.log(
      `[AVM-Train] Test metrics - MAE: ${testMetrics.mae.toFixed(0)}, MAPE: ${testMetrics.mape.toFixed(2)}%, Coverage: ${(testMetrics.coverage80 * 100).toFixed(1)}%`,
    );

    // 7. Check if better than previous model
    const prevModel = await getLatestModel("avm");
    const prevTestMae = prevModel?.metrics?.testMae ?? Infinity;

    let saved = false;
    let version = prevModel?.version ?? 0;

    if (testMetrics.mae < prevTestMae || !prevModel) {
      // Save new model
      const stored = await saveModel("avm", model, {
        ...trainMetrics,
        testMae: testMetrics.mae,
        testMape: testMetrics.mape,
        testRmse: testMetrics.rmse,
        coverage80: testMetrics.coverage80,
        trainSamples: X_train.length,
        testSamples: X_test.length,
        lambda,
      });

      saved = true;
      version = stored.version;

      console.log(
        `[AVM-Train] Model v${version} saved (MAE improved: ${prevTestMae.toFixed(0)} → ${testMetrics.mae.toFixed(0)})`,
      );
    } else {
      console.log(
        `[AVM-Train] Model not saved (MAE did not improve: ${testMetrics.mae.toFixed(0)} >= ${prevTestMae.toFixed(0)})`,
      );
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      trained: true,
      saved,
      version,
      duration: `${(duration / 1000).toFixed(1)}s`,
      data: {
        samples: pairs.length,
        trainSamples: X_train.length,
        testSamples: X_test.length,
      },
      train: {
        mae: Math.round(trainMetrics.mae),
        mape: parseFloat(trainMetrics.mape.toFixed(2)),
        rmse: Math.round(trainMetrics.rmse),
      },
      test: {
        mae: Math.round(testMetrics.mae),
        mape: parseFloat(testMetrics.mape.toFixed(2)),
        rmse: Math.round(testMetrics.rmse),
        coverage80: parseFloat((testMetrics.coverage80 * 100).toFixed(1)),
      },
      previous: prevModel
        ? {
            version: prevModel.version,
            testMae: Math.round(prevModel.metrics.testMae ?? 0),
          }
        : null,
    });
  } catch (error: any) {
    console.error("[AVM-Train] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Training failed",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
