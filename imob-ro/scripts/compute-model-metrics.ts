#!/usr/bin/env ts-node
/*
  scripts/compute-model-metrics.ts

  Computes MdAPE and PI-coverage for AVM model predictions.

  Approach:
  - For analyses that have:
    - scoreSnapshot (with avmLow, avmHigh)
    - a ttsLabel that is not censored (i.e., we observed delist/sold)
    - price history entries for the sourceUrl
  - For each such analysis:
    - Determine the "last price before delist" by taking the latest PriceHistory.ts that is <= ttsLabel.createdAt (or <= now if missing)
    - Compute absolute percentage error: abs(avmMid - truePrice) / truePrice
    - Determine whether truePrice is inside [avmLow, avmHigh]
  - Compute MdAPE = median of absolute percentage errors (as fraction, e.g., 0.12)
  - Compute PI-coverage = fraction of cases where truePrice in [avmLow, avmHigh]
  - Save a ModelMetrics row with stats and optional details

  Run with:
    pnpm exec ts-node ./scripts/compute-model-metrics.ts
*/

import "dotenv/config";
import { prisma } from "../src/lib/db";
import { randomUUID } from "crypto";

function median(nums: number[]) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

async function run() {
  console.log("Computing model metrics...");

  // Gather analyses which have a scoreSnapshot and a sourceUrl. We'll load related records by analysisId directly.
  // Use raw SQL to select analysis ids which have non-null score_snapshot and a non-censored tts_label
  const candidates: Array<{ id: string; sourceUrl: string }> = await prisma.$queryRaw`
    SELECT a.id, a."sourceUrl" FROM "Analysis" a
    JOIN "ScoreSnapshot" s ON s."analysisId" = a.id
    JOIN "TtsLabel" t ON t."analysisId" = a.id
    WHERE t.censored = false AND a."sourceUrl" IS NOT NULL
    ORDER BY a."createdAt" DESC
    LIMIT 2000
  `;

  console.log(`Found ${candidates.length} candidate analyses`);

  const errors: number[] = [];
  let covered = 0;
  const details: Array<{
    analysisId: string;
    price: number;
    avmLow: number;
    avmHigh: number;
    ape: number;
    covered: boolean;
  }> = [];

  for (const c of candidates) {
    try {
      const src = c.sourceUrl;
      if (!src) continue;

      // load score_snapshot and tts_label and the last priceHistory before tts.createdAt using raw sql
      const ssRows = (await prisma.$queryRaw`
        SELECT "avmLow" as avm_low, "avmHigh" as avm_high FROM "ScoreSnapshot" WHERE "analysisId" = ${c.id} LIMIT 1
      `) as any[];
      const ssRow = ssRows[0];
      const ttsRows = (await prisma.$queryRaw`
        SELECT "createdAt" FROM "TtsLabel" WHERE "analysisId" = ${c.id} LIMIT 1
      `) as any[];
      const ttsRow = ttsRows[0];

      const cutoff = new Date(ttsRow["createdAt"]);
      const phRows = (await prisma.$queryRaw`
        SELECT price, ts FROM "PriceHistory" WHERE "sourceUrl" = ${src} AND ts <= ${cutoff} ORDER BY ts DESC LIMIT 1
      `) as any[];
      const phRow = phRows[0];
      if (!phRow || !phRow.price || phRow.price <= 0) continue;

      const truePrice = Number(phRow.price);
      const avmLow = Number(ssRow.avm_low);
      const avmHigh = Number(ssRow.avm_high);
      const avmMid = (avmLow + avmHigh) / 2;

      const ape = Math.abs(avmMid - truePrice) / truePrice;
      errors.push(ape);
      const inInterval = truePrice >= avmLow && truePrice <= avmHigh;
      if (inInterval) covered += 1;
      details.push({
        analysisId: c.id,
        price: truePrice,
        avmLow,
        avmHigh,
        ape,
        covered: inInterval,
      });
    } catch (err) {
      console.warn("skipping candidate", c.id, err);
    }
  }

  const mdape = median(errors);
  const piCoverage = errors.length ? covered / errors.length : 0;

  // Save ModelMetrics via raw SQL to avoid Prisma client typing incompatibilities in scripts
  const mid = randomUUID();
  const detailsJson = JSON.stringify({ sampleCount: errors.length });
  await prisma.$executeRaw`
    INSERT INTO "ModelMetrics" ("id", "ts", "modelName", "mdape", "piCoverage", "sampleCount", "details", "createdAt")
    VALUES (${mid}, ${new Date()}, ${"avm_v1"}, ${mdape}, ${piCoverage}, ${errors.length}, ${detailsJson}::jsonb, ${new Date()})
  `;

  console.log(`MdAPE=${mdape} PI-coverage=${piCoverage} samples=${errors.length}`);

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
