"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tryTrainGBM = tryTrainGBM;
exports.saveArtifact = saveArtifact;
exports.uploadToS3IfConfigured = uploadToS3IfConfigured;
exports.updateCacheIfConfigured = updateCacheIfConfigured;
exports.artifactName = artifactName;
const fs = require("fs");
const path = require("path");
async function tryTrainGBM(X, y, opts) {
  // Try to dynamically import xgboost-wasm or similar. If not available, return null.
  try {
    // dynamic require to avoid hard dependency at install time
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const xgb = require("xgboost-wasm");
    if (!xgb) return null;
    // This block is illustrative — xgboost-wasm APIs differ; implement a best-effort wrapper
    if (typeof xgb.train === "function") {
      const params = opts?.params ?? { max_depth: 4, eta: 0.3, objective: "reg:squarederror" };
      const dtrain = new xgb.DMatrix(X, y);
      const booster = xgb.train(params, dtrain, opts?.rounds ?? 50);
      // attempt to dump to JSON-like object
      if (booster && typeof booster.getDump === "function")
        return { booster, dump: booster.getDump() };
      return booster;
    }
    return null;
  } catch (err) {
    // not available or failed
    return null;
  }
}
function saveArtifact(dir, name, artifact) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(artifact, null, 2));
  return file;
}
async function uploadToS3IfConfigured(filePath, key) {
  // Upload artifact to S3 if AWS env vars are present and aws sdk is installed
  try {
    if (
      !process.env.AWS_ACCESS_KEY_ID ||
      !process.env.AWS_SECRET_ACCESS_KEY ||
      !process.env.S3_BUCKET
    )
      return null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
    // return S3 object path
    return `s3://${process.env.S3_BUCKET}/${key}`;
  } catch (err) {
    return null;
  }
}
async function updateCacheIfConfigured(payload) {
  // Update Redis if REDIS_URL provided
  try {
    if (!process.env.REDIS_URL) return null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IORedis = require("ioredis");
    const redis = new IORedis(process.env.REDIS_URL);
    const key = process.env.MODEL_CACHE_KEY ?? "models:latest";
    await redis.set(key, JSON.stringify(payload));
    await redis.quit();
    return key;
  } catch (err) {
    return null;
  }
}
function artifactName(prefix) {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  const tag = `${d.getFullYear()}-${String(week).padStart(2, "0")}`;
  return `${prefix}@${tag}.json`;
}
exports.default = {
  tryTrainGBM,
  saveArtifact,
  uploadToS3IfConfigured,
  updateCacheIfConfigured,
  artifactName,
};
