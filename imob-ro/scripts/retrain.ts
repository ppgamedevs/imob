#!/usr/bin/env ts-node
/*
  scripts/retrain.ts

  Lightweight weekly retraining script (cheap):
  - Collect features from FeatureSnapshot (normalized features) and corresponding labels:
    - AVM label: the "last price before delist" (uses TtsLabel non-censored + PriceHistory)
    - TTS label: days from TtsLabel (only non-censored? we can use censored as upper bound but here take non-censored)
  - Train simple linear regression models (closed form via normal equations) on numeric features.
  - Save JSON artifacts to models/avm@YYYY-WW.json and models/tts@YYYY-WW.json
  - Update a models/latest.json cache and write an invalidate marker file models/INVALIDATE
*/

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "../src/lib/db";
import * as ml from "../src/lib/ml/retrain";

function nowWeek() {
  const d = new Date();
  // ISO week YYYY-WW
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-${String(week).padStart(2, "0")}`;
}

function numericFromFeatures(features: any, keys: string[]) {
  return keys.map((k) => {
    const v = features?.[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = parseFloat(v.replace(/[^0-9.-]/g, ""));
      if (!Number.isNaN(n)) return n;
    }
    return 0;
  });
}

function transpose(a: number[][]) {
  return a[0].map((_, i) => a.map((r) => r[i]));
}

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, p = A[0].length, n = B[0].length;
  const C: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
  for (let i = 0; i < m; i++) for (let k = 0; k < p; k++) for (let j = 0; j < n; j++) C[i][j] += A[i][k] * B[k][j];
  return C;
}

function pseudoInverseSolve(X: number[][], y: number[]) {
  // Solve using normal equations with simple regularization: (X^T X + lambda I)^{-1} X^T y
  const lambda = 1e-3;
  const Xt = transpose(X);
  const XtX = matMul(Xt, X); // p x p
  const p = XtX.length;
  for (let i = 0; i < p; i++) XtX[i][i] += lambda;
  // naive inverse using Gauss-Jordan (p small)
  const inv = invertMatrix(XtX);
  if (!inv) return null;
  const Xty = matMul(Xt, y.map((v) => [v])); // p x 1
  const wmat = matMul(inv, Xty); // p x 1
  return wmat.map((r) => r[0]);
}

function invertMatrix(A: number[][]): number[][] | null {
  const n = A.length;
  const M = A.map((r) => r.slice());
  const I = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let i = 0; i < n; i++) {
    // pivot
    let piv = i;
    for (let r = i; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
    if (Math.abs(M[piv][i]) < 1e-12) return null;
    [M[i], M[piv]] = [M[piv], M[i]];
    [I[i], I[piv]] = [I[piv], I[i]];
    const div = M[i][i];
    for (let j = 0; j < n; j++) { M[i][j] /= div; I[i][j] /= div; }
    for (let r = 0; r < n; r++) if (r !== i) {
      const factor = M[r][i];
      for (let c = 0; c < n; c++) { M[r][c] -= factor * M[i][c]; I[r][c] -= factor * I[i][c]; }
    }
  }
  return I;
}

async function run() {
  console.log("Starting retrain...");
  const week = nowWeek();
  const modelDir = path.join(process.cwd(), "models");
  if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir, { recursive: true });

  // Feature keys heuristic: pick numeric keys from some common fields
  // We'll inspect the first 200 feature snapshots to collect keys
  const snaps = await prisma.featureSnapshot.findMany({ take: 500 });
  const sampleFeatures = snaps.map((s) => (s.features as any) ?? {});
  const numericKeys = new Set<string>();
  for (const f of sampleFeatures) {
    for (const k of Object.keys(f)) {
      const v = f[k];
      if (typeof v === "number" || typeof v === "string") numericKeys.add(k);
    }
  }
  const keys = Array.from(numericKeys).slice(0, 30); // limit to 30 features
  console.log("Feature keys:", keys.slice(0, 10));

  // Build dataset for AVM: require scoreSnapshot and non-censored ttsLabel and a priceHistory row before tts
  const candidates: any[] = await prisma.$queryRaw`
    SELECT a.id, a."sourceUrl" FROM "Analysis" a
    JOIN "ScoreSnapshot" s ON s."analysisId" = a.id
    JOIN "TtsLabel" t ON t."analysisId" = a.id
    WHERE t.censored = false AND a."sourceUrl" IS NOT NULL
    ORDER BY a."createdAt" DESC
    LIMIT 2000
  ` as any[];

  const X_avm: number[][] = [];
  const y_avm: number[] = [];
  const X_tts: number[][] = [];
  const y_tts: number[] = [];

  for (const c of candidates) {
    try {
      const fsnapRows = (await prisma.$queryRaw`
        SELECT features FROM "FeatureSnapshot" WHERE "analysisId" = ${c.id} LIMIT 1
      `) as any[];
      const fsnap = fsnapRows[0]?.features ?? {};
      const ttsRows = (await prisma.$queryRaw`
        SELECT "createdAt", censored FROM "TtsLabel" WHERE "analysisId" = ${c.id} LIMIT 1
      `) as any[];
      const tts = ttsRows[0];
      const cutoff = new Date(tts["createdAt"]);
      const phRows = (await prisma.$queryRaw`
        SELECT price, ts FROM "PriceHistory" WHERE "sourceUrl" = ${c.sourceUrl} AND ts <= ${cutoff} ORDER BY ts DESC LIMIT 1
      `) as any[];
      const ph = phRows[0];
      if (!ph || !ph.price) continue;
      const truePrice = Number(ph.price);

      const featuresVec = numericFromFeatures(fsnap, keys);
      // AVM: include intercept
      X_avm.push([1, ...featuresVec]);
      y_avm.push(truePrice);
      // TTS label: use ttsLabel.days when present (choice: only observed non-censored)
      if (typeof tts["createdAt"] !== "undefined") {
        const ttsRow = (await prisma.$queryRaw`
          SELECT days FROM "TtsLabel" WHERE "analysisId" = ${c.id} LIMIT 1
        `) as any[];
        const days = ttsRow[0]?.days;
        if (typeof days === "number") {
          X_tts.push([1, ...featuresVec]);
          y_tts.push(days);
        }
      }
    } catch (err) {
      // skip
    }
  }

  console.log(`AVM samples=${y_avm.length} TTS samples=${y_tts.length}`);

  // Attempt GBM training first
  let avmModel: any = null;
  let ttsModel: any = null;
  if (X_avm.length) avmModel = (await ml.tryTrainGBM(X_avm, y_avm)) ?? (X_avm.length && X_avm[0] ? pseudoInverseSolve(X_avm, y_avm) : null);
  if (X_tts.length) ttsModel = (await ml.tryTrainGBM(X_tts, y_tts)) ?? (X_tts.length && X_tts[0] ? pseudoInverseSolve(X_tts, y_tts) : null);
  // handle empty model results
  const avmModelSafe = avmModel ?? null;
  const ttsModelSafe = ttsModel ?? null;

  const weekTag = week;
  const avmPath = path.join(modelDir, `avm@${weekTag}.json`);
  const ttsPath = path.join(modelDir, `tts@${weekTag}.json`);

  const avmArtifact = { model: avmModelSafe, keys, createdAt: new Date().toISOString(), samples: y_avm.length };
  const ttsArtifact = { model: ttsModelSafe, keys, createdAt: new Date().toISOString(), samples: y_tts.length };
  fs.writeFileSync(avmPath, JSON.stringify(avmArtifact, null, 2));
  fs.writeFileSync(ttsPath, JSON.stringify(ttsArtifact, null, 2));

  // update latest cache
  const latestPath = path.join(modelDir, `latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify({ avm: path.basename(avmPath), tts: path.basename(ttsPath), ts: new Date().toISOString() }, null, 2));
  // try upload to S3 if configured
  try {
    const avmKey = `models/${path.basename(avmPath)}`;
    const ttsKey = `models/${path.basename(ttsPath)}`;
    const avmUrl = await ml.uploadToS3IfConfigured(avmPath, avmKey);
    const ttsUrl = await ml.uploadToS3IfConfigured(ttsPath, ttsKey);
    const cachePayload = { avm: avmUrl ?? path.basename(avmPath), tts: ttsUrl ?? path.basename(ttsPath), ts: new Date().toISOString() };
    await ml.updateCacheIfConfigured(cachePayload);
    fs.writeFileSync(path.join(modelDir, `INVALIDATE`), new Date().toISOString());
  } catch (err) {
    // ignore upload/cache errors
  }

  console.log("Saved models:", avmPath, ttsPath);
  await prisma.$disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
