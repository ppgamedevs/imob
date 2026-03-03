import { ANALYSIS_DEDUP_WINDOW_MS, ANALYSIS_POLL_INTERVAL_MS, ANALYSIS_POLL_TIMEOUT_MS } from "./constants";
import { prisma } from "./db";
import type { Extracted } from "./extractors";
import { maybeFetchServer } from "./extractors";
import { logger } from "./obs/logger";

export async function getAnalysis(id: string) {
  return prisma.analysis.findUnique({
    where: { id },
    include: {
      extractedListing: true,
      featureSnapshot: true,
      scoreSnapshot: true,
    },
  });
}

export async function upsertAnalysisByUrl(sourceUrl: string, userId?: string | null) {
  const recent = await prisma.analysis.findFirst({
    where: { sourceUrl },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < ANALYSIS_DEDUP_WINDOW_MS) {
    return recent;
  }
  return prisma.analysis.create({ data: { userId: userId ?? null, sourceUrl, status: "queued" } });
}

// --- Pipeline steps ---

type StepFn = (analysisId: string, features: Record<string, unknown>) => Promise<void>;

interface PipelineStep {
  name: string;
  run: StepFn;
  critical?: boolean; // if true, failure aborts pipeline
}

async function stepNormalize(analysisId: string): Promise<void> {
  const { updateFeatureSnapshot } = await import("./normalize-pipeline");
  await updateFeatureSnapshot(analysisId);
}

async function stepAvm(analysisId: string, features: Record<string, unknown>): Promise<void> {
  const { applyAvmToAnalysis } = await import("./ml/apply-avm");
  await applyAvmToAnalysis(analysisId, features);
}

async function stepTts(analysisId: string, features: Record<string, unknown>): Promise<void> {
  const { applyTtsToAnalysis } = await import("./ml/apply-tts");
  await applyTtsToAnalysis(analysisId, features);
}

async function stepYield(analysisId: string, features: Record<string, unknown>): Promise<void> {
  const { applyYieldToAnalysis } = await import("./ml/apply-yield");
  await applyYieldToAnalysis(analysisId, features);
}

async function stepSeismic(analysisId: string, features: Record<string, unknown>): Promise<void> {
  const { applySeismicToAnalysis } = await import("./risk/apply-seismic");
  await applySeismicToAnalysis(analysisId, features);
}

async function stepComps(analysisId: string): Promise<void> {
  const { applyCompsToAnalysis } = await import("./comps/apply-comps");
  await applyCompsToAnalysis(analysisId);
}

async function stepQuality(analysisId: string): Promise<void> {
  const { applyQualityToAnalysis } = await import("./quality/apply-quality");
  await applyQualityToAnalysis(analysisId);
}

async function stepDedup(analysisId: string): Promise<void> {
  const { attachToGroup } = await import("./dedup/group");
  await attachToGroup(analysisId);
}

async function stepProvenance(analysisId: string, url: string): Promise<void> {
  const { logSight, logPhotoAssets } = await import("./provenance/ingest");
  const { rebuildProvenance } = await import("./provenance/build-events");
  const { findReusedPhotos } = await import("./provenance/photo-reuse");
  const { computeTrustScore } = await import("./provenance/trust");

  await logSight(analysisId, url);
  await logPhotoAssets(analysisId);
  await rebuildProvenance(analysisId);

  const reused = await findReusedPhotos(analysisId);
  if (reused.length > 0) {
    await prisma.provenanceEvent.create({
      data: {
        analysisId,
        kind: "PHOTO_REUSED",
        payload: { matches: reused } as never,
      },
    });
  }

  await computeTrustScore(analysisId);
}

async function stepNotarial(analysisId: string, features: Record<string, unknown>): Promise<void> {
  const { applyNotarialToAnalysis } = await import("./notarial/apply-notarial");
  await applyNotarialToAnalysis(analysisId, features);
}

const SCORING_STEPS: PipelineStep[] = [
  { name: "avm", run: stepAvm, critical: true },
  { name: "tts", run: stepTts },
  { name: "yield", run: stepYield },
  { name: "seismic", run: stepSeismic },
  { name: "notarial", run: stepNotarial },
  { name: "comps", run: (id) => stepComps(id) },
  { name: "quality", run: (id) => stepQuality(id) },
  { name: "dedup", run: (id) => stepDedup(id) },
];

async function runScoringPipeline(analysisId: string): Promise<void> {
  const fsnap = await prisma.featureSnapshot.findUnique({
    where: { analysisId },
    select: { features: true },
  });

  if (!fsnap?.features) {
    logger.warn({ analysisId }, "No feature snapshot found, skipping scoring");
    return;
  }

  const features = fsnap.features as Record<string, unknown>;

  for (const step of SCORING_STEPS) {
    const start = Date.now();
    try {
      await step.run(analysisId, features);
      logger.debug({ analysisId, step: step.name, durationMs: Date.now() - start }, `Pipeline step ${step.name} completed`);
    } catch (err) {
      logger.warn({ analysisId, step: step.name, err, durationMs: Date.now() - start }, `Pipeline step ${step.name} failed`);
      if (step.critical) throw err;
    }
  }
}

async function waitForClientExtract(analysisId: string): Promise<Extracted | null> {
  const deadline = Date.now() + ANALYSIS_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const row = await prisma.extractedListing.findUnique({ where: { analysisId } });
    if (row) return row as unknown as Extracted;
    await new Promise((r) => setTimeout(r, ANALYSIS_POLL_INTERVAL_MS));
  }
  return null;
}

async function upsertExtractedListing(analysisId: string, data: Extracted): Promise<void> {
  const payload = {
    title: data.title || undefined,
    price: data.price || undefined,
    currency: data.currency || undefined,
    areaM2: data.areaM2 || undefined,
    titleAreaM2: data.titleAreaM2 || undefined,
    rooms: data.rooms || undefined,
    floor: data.floor ?? undefined,
    floorRaw: data.floorRaw || undefined,
    yearBuilt: data.yearBuilt || undefined,
    addressRaw: data.addressRaw || undefined,
    lat: data.lat ?? undefined,
    lng: data.lng ?? undefined,
    photos: Array.isArray(data.photos) && data.photos.length ? data.photos : undefined,
    sourceMeta: data.sourceMeta ?? undefined,
  };

  await prisma.extractedListing.upsert({
    where: { analysisId },
    create: { analysisId, ...payload } as any,
    update: payload as any,
  });
}

async function setStatus(analysisId: string, status: string): Promise<void> {
  await prisma.analysis.update({ where: { id: analysisId }, data: { status } });
}

export async function startAnalysis(analysisId: string, url: string) {
  const log = logger.child({ analysisId, url });

  try {
    await setStatus(analysisId, "running");
    log.info("Analysis started");

    // 1. Wait for client-pushed extract or try server-side fetch
    let extracted = await waitForClientExtract(analysisId);

    if (!extracted) {
      const serverData = await maybeFetchServer(url);
      if (!serverData) {
        log.warn("No data from client or server");
        await setStatus(analysisId, "error");
        await prisma.provenanceEvent.create({
          data: {
            analysisId,
            kind: "NO_DATA",
            happenedAt: new Date(),
            payload: { note: "No client extract and server scrape disabled or blocked" } as never,
          },
        }).catch((e) => log.warn({ err: e }, "Failed to log NO_DATA provenance event"));
        return;
      }
      await upsertExtractedListing(analysisId, serverData);
      extracted = serverData;
    }

    // 2. Provenance ingestion (non-critical)
    try {
      await stepProvenance(analysisId, url);
    } catch (err) {
      log.warn({ err }, "Provenance ingestion failed");
    }

    // 3. Normalize
    await setStatus(analysisId, "normalizing");
    await stepNormalize(analysisId);

    // 4. Scoring pipeline
    await setStatus(analysisId, "scoring");
    await runScoringPipeline(analysisId);

    // 5. Done
    await setStatus(analysisId, "done");
    log.info("Analysis completed");
  } catch (err) {
    log.error({ err }, "Analysis pipeline failed");
    await setStatus(analysisId, "failed").catch(() => {});
  }
}
