/**
 * AVM v2 Training Cron
 * Trains ridge regression model on last 90 days of analysis data
 * Schedule: Nightly at 2 AM UTC
 */

import { NextResponse } from "next/server";

import { buildFeatureVector, getDefaultZoneData } from "@/lib/avm/features";
import { evaluateRidge, trainRidge } from "@/lib/avm/model";
import { getLatestModel, saveModel } from "@/lib/avm/store";
import { prisma } from "@/lib/db";

type TrainingPair = {
  x: number[];
  y: number;
};

/**
 * Shuffle array in place (Fisher-Yates)
 */
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Load zone data for area
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

export async function GET() {
  try {
    // 1. Load training data (last 90 days)
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const analyses = await prisma.analysis.findMany({
      where: {
        status: "done",
        createdAt: { gte: cutoffDate },
      },
      include: {
        featureSnapshot: true,
        group: {
          include: {
            analyses: {
              where: { status: "done" },
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                scoreSnapshot: true,
              },
            },
          },
        },
      },
      take: 10000, // Limit to prevent memory issues
    });

    console.log(`[AVM Training] Loaded ${analyses.length} analyses from last 90 days`);

    // 2. Build feature matrix X and target vector y
    const pairs: TrainingPair[] = [];
    const skipped = { noFeatures: 0, noTarget: 0, invalidFeatures: 0 };

    for (const a of analyses) {
      if (!a.featureSnapshot) {
        skipped.noFeatures++;
        continue;
      }

      const features = a.featureSnapshot.features as {
        areaSlug?: string;
        areaM2?: number;
        rooms?: number;
        yearBuilt?: number;
        distMetroM?: number;
        conditionScore?: number;
        level?: number;
        hasBalcony?: boolean;
        priceEur?: number;
      };

      // Determine target: asking price OR group median proxy
      let target = features.priceEur;
      if (!target || target <= 0) {
        // Try group median proxy
        const groupAnalysis = a.group?.analyses?.[0];
        const groupAvmMid = groupAnalysis?.scoreSnapshot?.avmMid;
        if (groupAvmMid && features.areaM2) {
          target = groupAvmMid; // Use existing AVM estimate as proxy
        }
      }

      if (!target || target <= 0 || target > 10_000_000) {
        skipped.noTarget++;
        continue;
      }

      // Build feature vector
      try {
        const zoneData = await loadZoneData(features.areaSlug);
        const x = buildFeatureVector(features, zoneData);

        if (x.length !== 110) {
          skipped.invalidFeatures++;
          continue;
        }

        // Validate features are numeric
        if (x.some((val) => isNaN(val) || !isFinite(val))) {
          skipped.invalidFeatures++;
          continue;
        }

        pairs.push({ x, y: target });
      } catch {
        skipped.invalidFeatures++;
        continue;
      }
    }

    console.log(
      `[AVM Training] Built ${pairs.length} training pairs (skipped: ${JSON.stringify(skipped)})`,
    );

    // Check minimum samples
    if (pairs.length < 1000) {
      return NextResponse.json(
        {
          error: "Insufficient training data",
          samples: pairs.length,
          required: 1000,
          skipped,
        },
        { status: 400 },
      );
    }

    // 3. Split 80/20 train/test
    const shuffled = shuffle(pairs);
    const splitIdx = Math.floor(shuffled.length * 0.8);
    const trainPairs = shuffled.slice(0, splitIdx);
    const testPairs = shuffled.slice(splitIdx);

    const trainX = trainPairs.map((p) => p.x);
    const trainY = trainPairs.map((p) => p.y);
    const testX = testPairs.map((p) => p.x);
    const testY = testPairs.map((p) => p.y);

    console.log(`[AVM Training] Split: ${trainPairs.length} train, ${testPairs.length} test`);

    // 4. Train ridge regression
    const startTime = Date.now();
    const model = trainRidge(trainX, trainY, 1.0); // λ = 1.0
    const trainTime = Date.now() - startTime;

    console.log(
      `[AVM Training] Trained in ${trainTime}ms - Train MAE: ${model.mae.toFixed(0)}, MAPE: ${model.mape.toFixed(2)}%`,
    );

    // 5. Evaluate on test set
    const testMetrics = evaluateRidge(model, testX, testY);

    console.log(
      `[AVM Training] Test MAE: ${testMetrics.mae.toFixed(0)}, MAPE: ${testMetrics.mape.toFixed(2)}%, Coverage: ${(testMetrics.coverage80 * 100).toFixed(1)}%`,
    );

    // 6. Check if model is better than previous
    const prevModel = await getLatestModel("avm");
    const shouldSave =
      !prevModel || testMetrics.mae < ((prevModel.metrics.testMae as number) ?? Infinity);

    if (shouldSave) {
      const saved = await saveModel("avm", model, {
        mae: model.mae,
        mape: model.mape,
        rmse: model.rmse,
        testMae: testMetrics.mae,
        testMape: testMetrics.mape,
        coverage80: testMetrics.coverage80,
        samples: pairs.length,
        trainSamples: trainPairs.length,
        testSamples: testPairs.length,
      });

      console.log(`[AVM Training] Saved model version ${saved.version}`);

      return NextResponse.json({
        success: true,
        saved: true,
        version: saved.version,
        metrics: {
          trainMae: model.mae,
          trainMape: model.mape,
          testMae: testMetrics.mae,
          testMape: testMetrics.mape,
          coverage80: testMetrics.coverage80,
        },
        samples: {
          total: pairs.length,
          train: trainPairs.length,
          test: testPairs.length,
        },
        trainTime,
        improvement:
          prevModel && prevModel.metrics.testMae
            ? (
                (((prevModel.metrics.testMae as number) - testMetrics.mae) /
                  (prevModel.metrics.testMae as number)) *
                100
              ).toFixed(1) + "%"
            : "N/A",
      });
    } else {
      console.log(
        `[AVM Training] Model not saved - test MAE ${testMetrics.mae.toFixed(0)} >= previous ${prevModel?.metrics.testMae}`,
      );

      return NextResponse.json({
        success: true,
        saved: false,
        reason: "No improvement over previous model",
        metrics: {
          trainMae: model.mae,
          trainMape: model.mape,
          testMae: testMetrics.mae,
          testMape: testMetrics.mape,
          coverage80: testMetrics.coverage80,
        },
        previous: {
          version: prevModel?.version,
          testMae: prevModel?.metrics.testMae,
        },
        samples: {
          total: pairs.length,
          train: trainPairs.length,
          test: testPairs.length,
        },
        trainTime,
      });
    }
  } catch (error) {
    console.error("[AVM Training] Error:", error);
    return NextResponse.json(
      {
        error: "Training failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
