import { ANALYSIS_DEDUP_WINDOW_MS, ANALYSIS_POLL_INTERVAL_MS, ANALYSIS_POLL_TIMEOUT_MS } from "./constants";
import { prisma } from "./db";
import type { Extracted } from "./extractors";
import type { AnalyzeFailureReason } from "./analyze/analyze-failure-reasons";
import { tryServerScrapeForAnalysis } from "./extractors";
import { logger } from "./obs/logger";
import { detectPropertyType, isNonResidential } from "./property-type";
import { trackFunnelEvent } from "./tracking/funnel";

type ContentRejection = "rental" | "olx_non_realestate" | "non_residential";

/**
 * Post-extraction check: rentals, OLX wrong category, non-residential, etc. Null = OK.
 */
function checkExtractedContentType(
  title: string | null | undefined,
  description: string | null | undefined,
  url: string,
): ContentRejection | null {
  const text = `${title ?? ""} ${description ?? ""}`.toLowerCase();
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const path = (() => { try { return new URL(url).pathname.toLowerCase(); } catch { return ""; } })();

  if (/\bregim\s+hotelier\b/.test(text)) return "rental";
  if (/\bde\s+inchiriat\b/.test(text) && !/\bde\s+vanzare\b/.test(text)) return "rental";
  if (/\binchiriez\b/.test(text) && !/\bvand\b/.test(text)) return "rental";
  if (/\/inchirieri?\b/.test(path) || /\/de-inchiriat\b/.test(path)) return "rental";

  if (host === "olx.ro") {
    const REALESTATE_SIGNALS = [
      /\b(?:apartament|garsonier|camera|camere|casa|vila|teren|imobil|etaj|bloc|mansarda|penthouse|duplex|spatiu\s+comercial)\b/,
      /\b(?:mp|m2|m²|suprafata|suprafață)\b/,
      /\b(?:vanzare|vand|vânzare|vînd)\b/,
      /\b(?:decomandat|semidecomandat|circular|open.?space)\b/,
      /\b(?:sector\s*\d|bucuresti|cluj|iasi|timisoara|brasov|constanta)\b/,
    ];
    const hasRealEstateSignal = REALESTATE_SIGNALS.some((p) => p.test(text));
    if (!hasRealEstateSignal) return "olx_non_realestate";
  }

  const NON_RESIDENTIAL_RE =
    /\b(afacere|business|spatiu\s+comercial|magazin|hala|depozit|birou|office|teren|lot\s+de\s+casa|spatiu\s+industrial|pensiune|hotel|restaurant|bar|pub|fast\s*food|cafenea|ferma|livada|padure)\b/i;
  if (NON_RESIDENTIAL_RE.test(text)) {
    const propType = detectPropertyType(title, null);
    if (isNonResidential(propType) || propType === "unknown") {
      return "non_residential";
    }
  }

  return null;
}

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

async function stepRiskStack(analysisId: string, features: Record<string, unknown>): Promise<void> {
  const { applyRiskStackToAnalysis } = await import("./risk/apply-risk-stack");
  await applyRiskStackToAnalysis(analysisId, features);
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
  { name: "risk-stack", run: stepRiskStack },
  { name: "notarial", run: stepNotarial },
  { name: "comps", run: (id) => stepComps(id) },
  { name: "quality", run: (id) => stepQuality(id) },
  { name: "dedup", run: (id) => stepDedup(id) },
];

async function mergeFeaturesFromExtracted(
  analysisId: string,
  features: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const ex = await prisma.extractedListing.findUnique({
    where: { analysisId },
    select: { lat: true, lng: true, addressRaw: true, areaM2: true },
  });
  if (!ex) return features;
  const m = { ...features };
  if (typeof m.lat !== "number" && ex.lat != null) m.lat = ex.lat;
  if (typeof m.lng !== "number" && ex.lng != null) m.lng = ex.lng;
  if (m.addressRaw == null && m.address_raw == null && ex.addressRaw) {
    m.addressRaw = ex.addressRaw;
  }
  if (m.area_m2 == null && m.areaM2 == null && ex.areaM2 != null) {
    m.area_m2 = ex.areaM2;
    m.areaM2 = ex.areaM2;
  }
  return m;
}

async function runScoringPipeline(analysisId: string): Promise<void> {
  const fsnap = await prisma.featureSnapshot.findUnique({
    where: { analysisId },
    select: { features: true },
  });

  if (!fsnap?.features) {
    logger.warn({ analysisId }, "No feature snapshot found, skipping scoring");
    return;
  }

  let features = fsnap.features as Record<string, unknown>;
  features = await mergeFeaturesFromExtracted(analysisId, features);

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

async function patchStatus(analysisId: string, status: string): Promise<void> {
  await prisma.analysis.update({ where: { id: analysisId }, data: { status } });
}

async function failAnalysis(
  analysisId: string,
  status: "error" | "failed" | "rejected_rental" | "rejected_not_realestate",
  error: AnalyzeFailureReason,
): Promise<void> {
  await prisma.analysis.update({ where: { id: analysisId }, data: { status, error } });
}

export async function startAnalysis(analysisId: string, url: string) {
  const log = logger.child({ analysisId, url });
  const analysisRow = await prisma.analysis.findUnique({
    where: { id: analysisId },
    select: { userId: true },
  });

  try {
    await patchStatus(analysisId, "running");
    void trackFunnelEvent("analysis_started", {
      analysisId,
      userId: analysisRow?.userId ?? null,
      path: "/lib/analysis",
    });
    log.info("Analysis started");

    // 1. Wait for client-pushed extract or try server-side fetch
    let extracted = await waitForClientExtract(analysisId);

    if (!extracted) {
      const serverTry = await tryServerScrapeForAnalysis(url);
      if (!serverTry.ok) {
        const reason: AnalyzeFailureReason = serverTry.reason;
        log.warn({ reason }, "No data from client or server");
        await failAnalysis(analysisId, "error", reason);
        void trackFunnelEvent("analysis_failed", {
          analysisId,
          userId: analysisRow?.userId ?? null,
          path: "/lib/analysis",
          metadata: { reason },
        });
        await prisma.provenanceEvent.create({
          data: {
            analysisId,
            kind: "NO_DATA",
            happenedAt: new Date(),
            payload: { note: reason, source: "server_try" } as never,
          },
        }).catch((e) => log.warn({ err: e }, "Failed to log NO_DATA provenance event"));
        return;
      }
      await upsertExtractedListing(analysisId, serverTry.data);
      extracted = serverTry.data;
    }

    // 2. Post-extraction content check (rental, non-real-estate)
    const contentIssue = checkExtractedContentType(
      extracted.title,
      (extracted.sourceMeta as Record<string, unknown>)?.description as string | undefined,
      url,
    );
    if (contentIssue) {
      log.info({ contentIssue }, "Listing rejected after extraction");
      const failReason: AnalyzeFailureReason =
        contentIssue === "rental"
          ? "rental_not_sale"
          : contentIssue === "olx_non_realestate"
            ? "olx_non_realestate"
            : "non_residential";
      const st = contentIssue === "rental" ? "rejected_rental" : "rejected_not_realestate";
      await failAnalysis(analysisId, st, failReason);
      void trackFunnelEvent("analysis_failed", {
        analysisId,
        userId: analysisRow?.userId ?? null,
        path: "/lib/analysis",
        metadata: { reason: failReason },
      });
      return;
    }

    const priceOk = extracted.price != null && extracted.price > 0;
    const areaCandidate = extracted.areaM2 ?? extracted.titleAreaM2;
    const areaOk = areaCandidate != null && areaCandidate > 0;
    if (!priceOk) {
      await failAnalysis(analysisId, "failed", "missing_price");
      void trackFunnelEvent("analysis_failed", {
        analysisId,
        userId: analysisRow?.userId ?? null,
        path: "/lib/analysis",
        metadata: { reason: "missing_price" },
      });
      return;
    }
    if (!areaOk) {
      await failAnalysis(analysisId, "failed", "missing_area");
      void trackFunnelEvent("analysis_failed", {
        analysisId,
        userId: analysisRow?.userId ?? null,
        path: "/lib/analysis",
        metadata: { reason: "missing_area" },
      });
      return;
    }

    // 3. Provenance ingestion (non-critical)
    try {
      await stepProvenance(analysisId, url);
    } catch (err) {
      log.warn({ err }, "Provenance ingestion failed");
    }

    // 4. Normalize
    await patchStatus(analysisId, "normalizing");
    await stepNormalize(analysisId);

    // 5. Scoring pipeline
    await patchStatus(analysisId, "scoring");
    await runScoringPipeline(analysisId);

    // 6. Done
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { status: "done", error: null },
    });
    log.info("Analysis completed");

    // 7. Async LLM enrichment (non-blocking, runs after report is available)
    enqueueLlmEnrichment(analysisId).catch((e) =>
      log.warn({ err: e }, "LLM enrichment enqueue failed"),
    );
  } catch (err) {
    log.error({ err }, "Analysis pipeline failed");
    const message = err instanceof Error ? err.message : String(err);
    void trackFunnelEvent("analysis_failed", {
      analysisId,
      userId: analysisRow?.userId ?? null,
      path: "/lib/analysis",
      metadata: { reason: "pipeline_error", detail: message.slice(0, 200) },
    });
    await failAnalysis(analysisId, "failed", "pipeline_error").catch(() => {});
  }
}

/** Sets llmEnrichedAt so report UI stops waiting when LLM will never run. */
async function markLlmTextSkipped(analysisId: string): Promise<void> {
  await prisma.extractedListing
    .updateMany({
      where: { analysisId, llmEnrichedAt: null },
      data: { llmEnrichedAt: new Date() },
    })
    .catch(() => {});
}

async function enqueueLlmEnrichment(analysisId: string): Promise<void> {
  if (process.env.LLM_EXTRACT_ENABLED === "false") {
    await markLlmTextSkipped(analysisId);
    return;
  }
  if (!process.env.OPENAI_API_KEY?.trim()) {
    await markLlmTextSkipped(analysisId);
    return;
  }

  const { enrichTextForAnalysis } = await import("./llm/worker");

  // Fire and forget - text enrichment runs async
  enrichTextForAnalysis(analysisId).catch((err) =>
    logger.warn({ err, analysisId }, "Async LLM text enrichment failed"),
  );
}
