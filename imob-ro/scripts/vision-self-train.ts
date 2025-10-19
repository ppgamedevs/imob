#!/usr/bin/env ts-node
/*
  scripts/vision-self-train.ts

  - Find analyses with photos
  - Run server-side image inference (reuse logic similar to /api/vision/infer) to get condition score per analysis
  - Keep only high-confidence predictions (score > 0.9 or < 0.1 as strong negative)
  - Use those as pseudo-labels and combine with any existing labeled Condition (scoreSnapshot.conditionScore)
  - Train a simple linear regressor on numeric features from FeatureSnapshot
  - Save artifact models/vision-condition@YYYY-WW.json and update models/latest.json
  - Optionally upload to S3 if AWS env configured via uploadToS3IfConfigured
*/

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "../src/lib/db";
import { uploadToS3IfConfigured, artifactName } from "../src/lib/ml/retrain";

// Simple CLI parsing
const argv = process.argv.slice(2);
const args: Record<string, string | boolean> = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
}

const THRESH = parseFloat((args.threshold as string) ?? "0.9");
const TAKE = parseInt((args.take as string) ?? "2000", 10);
const SAMPLE_LIMIT = parseInt((args.sampleLimit as string) ?? "3", 10);
const UPLOAD = !!args.upload;

function nowWeek() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-${String(week).padStart(2, "0")}`;
}

function numericFromFeatures(features: any, keys: string[]) {
  return keys.map((k) => {
    const v = features?.[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
      if (!Number.isNaN(n)) return n;
    }
    return 0;
  });
}

function transpose(a: number[][]) {
  return a[0].map((_, i) => a.map((r) => r[i]));
}

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length,
    p = A[0].length,
    n = B[0].length;
  const C: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let k = 0; k < p; k++) for (let j = 0; j < n; j++) C[i][j] += A[i][k] * B[k][j];
  return C;
}

function invertMatrix(A: number[][]): number[][] | null {
  const n = A.length;
  const M = A.map((r) => r.slice());
  const I = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
    if (Math.abs(M[piv][i]) < 1e-12) return null;
    [M[i], M[piv]] = [M[piv], M[i]];
    [I[i], I[piv]] = [I[piv], I[i]];
    const div = M[i][i];
    for (let j = 0; j < n; j++) {
      M[i][j] /= div;
      I[i][j] /= div;
    }
    for (let r = 0; r < n; r++)
      if (r !== i) {
        const factor = M[r][i];
        for (let c = 0; c < n; c++) {
          M[r][c] -= factor * M[i][c];
          I[r][c] -= factor * I[i][c];
        }
      }
  }
  return I;
}

function pseudoInverseSolve(X: number[][], y: number[]) {
  const lambda = 1e-3;
  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  const p = XtX.length;
  for (let i = 0; i < p; i++) XtX[i][i] += lambda;
  const inv = invertMatrix(XtX);
  if (!inv) return null;
  const Xty = matMul(
    Xt,
    y.map((v) => [v]),
  );
  const wmat = matMul(inv, Xty);
  return wmat.map((r) => r[0]);
}

async function classifyPhotosServerSide(urls: string[], limit = 3) {
  // Call the local inference route to reuse server-side classification logic
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/vision/infer`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: urls.slice(0, limit) }),
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.score ?? null;
  } catch (err) {
    return null;
  }
}

async function run() {
  console.log("Starting vision self-train...");
  const modelDir = path.join(process.cwd(), "models");
  if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir, { recursive: true });
  // pick recent analyses with photos
  const analyses = await prisma.analysis.findMany({
    where: { extractedListing: { isNot: null } },
    include: { extractedListing: true, featureSnapshot: true },
    orderBy: { createdAt: "desc" },
    take: TAKE,
  });

  // sample feature keys
  const sampleFeatures = (analyses as any[]).map((a) => (a.featureSnapshot?.features as any) ?? {});
  const numericKeys = new Set<string>();
  for (const f of sampleFeatures)
    for (const k of Object.keys(f)) {
      const v = f[k];
      if (typeof v === "number" || typeof v === "string") numericKeys.add(k);
    }
  const keys = Array.from(numericKeys).slice(0, 30);
  console.log("feature keys:", keys.slice(0, 10));

  const X: number[][] = [];
  const y: number[] = [];

  for (const a of analyses) {
    const photos = ((a as any).extractedListing?.photos as any) ?? [];
    if (!Array.isArray(photos) || !photos.length) continue;
    const score = await classifyPhotosServerSide(photos, SAMPLE_LIMIT);
    if (score == null) continue;
    // keep only high confidence (pseudo-labels)
    const lowerBound = 1 - THRESH;
    if (score >= THRESH || score <= lowerBound) {
      const features = ((a as any).featureSnapshot?.features as any) ?? {};
      const vec = numericFromFeatures(features, keys);
      X.push([1, ...vec]);
      y.push(score);
    }
  }

  console.log("pseudo-label samples:", y.length);

  // fallback: include some true labeled examples from ScoreSnapshot
  const labeled = await prisma.scoreSnapshot.findMany({
    where: { conditionScore: { not: null } },
    take: Math.min(TAKE, 500),
  });
  for (const s of labeled) {
    const a = await prisma.analysis.findUnique({
      where: { id: s.analysisId },
      include: { featureSnapshot: true },
    });
    if (!a) continue;
    const features = (a.featureSnapshot?.features as any) ?? {};
    const vec = numericFromFeatures(features, keys);
    X.push([1, ...vec]);
    y.push(s.conditionScore ?? 0.5);
  }

  console.log("total training samples:", y.length);
  if (!X.length) {
    console.log("no samples to train on; exiting");
    return;
  }

  const weights = pseudoInverseSolve(X, y) ?? null;
  const week = nowWeek();
  const name = `vision-condition@${week}.json`;
  const out = path.join(modelDir, name);
  const artifact = {
    model: { weights, keys },
    createdAt: new Date().toISOString(),
    samples: y.length,
  };
  fs.writeFileSync(out, JSON.stringify(artifact, null, 2));

  // update latest
  const latestPath = path.join(modelDir, "latest.json");
  let latest: any = { ts: new Date().toISOString(), vision: name };
  try {
    latest = JSON.parse(fs.readFileSync(latestPath, "utf8"));
    latest.vision = name;
    latest.ts = new Date().toISOString();
  } catch {
    /* ignore */
  }
  fs.writeFileSync(latestPath, JSON.stringify(latest, null, 2));

  // optionally upload
  if (UPLOAD) {
    try {
      const key = `models/${name}`;
      const url = await uploadToS3IfConfigured(out, key);
      if (url) console.log("uploaded artifact to", url);
    } catch (err) {
      console.warn("upload failed", err);
    }
  } else {
    console.log("upload skipped (use --upload to enable)");
  }

  console.log("done, saved", out);
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
