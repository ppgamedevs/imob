/* eslint-disable @typescript-eslint/no-require-imports */
import * as fs from "fs";
import * as path from "path";

type ModelArtifact = { model: any | null; keys: string[]; createdAt: string; samples: number };

export async function tryTrainGBM(X: number[][], y: number[], opts?: any): Promise<any | null> {
  try {
    const xgb = require("xgboost-wasm");
    if (!xgb) return null;
    if (typeof xgb.train === "function") {
      const params = opts?.params ?? { max_depth: 4, eta: 0.3, objective: "reg:squarederror" };
      const dtrain = new xgb.DMatrix(X, y);
      const booster = xgb.train(params, dtrain, opts?.rounds ?? 50);
      if (booster && typeof booster.getDump === "function")
        return { booster, dump: booster.getDump() };
      return booster;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveArtifact(dir: string, name: string, artifact: ModelArtifact) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(artifact, null, 2));
  return file;
}

export async function uploadToS3IfConfigured(filePath: string, key: string) {
  try {
    if (
      !process.env.AWS_ACCESS_KEY_ID ||
      !process.env.AWS_SECRET_ACCESS_KEY ||
      !process.env.S3_BUCKET
    )
      return null;

    const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
    const client = new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });
    const body = fs.readFileSync(filePath);
    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: "application/json",
    });
    await client.send(cmd);
    return `s3://${process.env.S3_BUCKET}/${key}`;
  } catch {
    return null;
  }
}

export async function updateCacheIfConfigured(payload: unknown) {
  try {
    if (!process.env.REDIS_URL) return null;
    const IORedis = require("ioredis");
    const redis = new IORedis(process.env.REDIS_URL);
    const key = process.env.MODEL_CACHE_KEY ?? "models:latest";
    await redis.set(key, JSON.stringify(payload));
    await redis.quit();
    return key;
  } catch {
    return null;
  }
}

export function artifactName(prefix: string) {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  const tag = `${d.getFullYear()}-${String(week).padStart(2, "0")}`;
  return `${prefix}@${tag}.json`;
}
