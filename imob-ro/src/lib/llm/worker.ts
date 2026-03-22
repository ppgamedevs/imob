import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/obs/logger";

import { extractTextWithLlm } from "./extract-text";
import { extractVisionWithLlm, hashImageUrls } from "./extract-vision";
import { validateTextExtraction, validateVisionExtraction } from "./validate";

const LLM_ENABLED = () => process.env.LLM_EXTRACT_ENABLED !== "false";
const RATE_LIMIT_HOUR = () => parseInt(process.env.LLM_RATE_LIMIT_HOUR ?? "100", 10);

const recentCalls: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  const oneHourAgo = now - 3600_000;
  while (recentCalls.length > 0 && recentCalls[0] < oneHourAgo) recentCalls.shift();
  return recentCalls.length >= RATE_LIMIT_HOUR();
}

function recordCall(): void {
  recentCalls.push(Date.now());
}

// In-memory locks prevent concurrent enrichment for the same listing
// within the same Node.js process (covers both background job + API route).
const inFlightText = new Set<string>();
const inFlightVision = new Set<string>();

async function markEnrichAttempted(
  analysisId: string,
  field: "llmEnrichedAt" | "llmVisionAt",
): Promise<void> {
  await prisma.extractedListing
    .update({ where: { analysisId }, data: { [field]: new Date() } })
    .catch(() => {});
}

export async function enrichTextForAnalysis(analysisId: string): Promise<boolean> {
  if (!LLM_ENABLED()) {
    await markEnrichAttempted(analysisId, "llmEnrichedAt");
    return false;
  }

  if (inFlightText.has(analysisId)) {
    logger.debug({ analysisId }, "Text enrichment already in flight, skipping");
    return false;
  }

  if (isRateLimited()) {
    logger.warn({ analysisId }, "LLM rate limit reached, skipping text enrichment");
    await markEnrichAttempted(analysisId, "llmEnrichedAt");
    return false;
  }

  const log = logger.child({ analysisId, step: "llm-text" });

  inFlightText.add(analysisId);
  try {
    const el = await prisma.extractedListing.findUnique({
      where: { analysisId },
    });
    if (!el) {
      log.warn("No extracted listing found");
      await markEnrichAttempted(analysisId, "llmEnrichedAt");
      return false;
    }

    if (el.llmEnrichedAt) {
      log.debug("Already enriched, skipping");
      return true;
    }

    // Check cache: find another listing with same contentHash
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      select: { contentHash: true },
    });
    if (analysis?.contentHash) {
      const cached = await prisma.extractedListing.findFirst({
        where: {
          llmEnrichedAt: { not: null },
          llmTextExtract: { not: Prisma.AnyNull },
          analysis: { contentHash: analysis.contentHash },
        },
        select: { llmTextExtract: true },
      });
      if (cached?.llmTextExtract) {
        log.info("Reusing cached LLM text extraction from matching contentHash");
        await prisma.extractedListing.update({
          where: { analysisId },
          data: {
            llmTextExtract: cached.llmTextExtract,
            llmEnrichedAt: new Date(),
          },
        });
        return true;
      }
    }

    const title = el.title ?? "";
    const meta = el.sourceMeta as Record<string, unknown> | null;
    let description = (meta?.description as string) ?? "";

    // Fallback: synthesize context from structured fields when no description
    if (!description && title) {
      const parts: string[] = [];
      if (el.price) parts.push(`Pret: ${el.price} ${(el as any).currency ?? "EUR"}`);
      if (el.areaM2) parts.push(`Suprafata: ${el.areaM2} mp`);
      if (el.rooms) parts.push(`Camere: ${el.rooms}`);
      if ((el as any).floorRaw) parts.push(`Etaj: ${(el as any).floorRaw}`);
      if (el.yearBuilt) parts.push(`An constructie: ${el.yearBuilt}`);
      if ((el as any).addressRaw) parts.push(`Adresa: ${(el as any).addressRaw}`);
      if (parts.length > 0) description = parts.join(". ");
    }

    recordCall();
    const raw = await extractTextWithLlm(title, description);
    if (!raw) {
      log.warn("LLM text extraction returned null");
      await markEnrichAttempted(analysisId, "llmEnrichedAt");
      return false;
    }

    const validated = validateTextExtraction(raw, {
      totalAreaM2: el.areaM2,
      rooms: el.rooms,
      listingType: el.title,
    });

    await prisma.extractedListing.update({
      where: { analysisId },
      data: {
        llmTextExtract: validated as unknown as Prisma.InputJsonValue,
        llmEnrichedAt: new Date(),
      },
    });

    log.info("LLM text enrichment completed");
    return true;
  } catch (err) {
    log.error({ err }, "LLM text enrichment failed");
    await markEnrichAttempted(analysisId, "llmEnrichedAt");
    return false;
  } finally {
    inFlightText.delete(analysisId);
  }
}

export async function enrichVisionForAnalysis(analysisId: string): Promise<boolean> {
  if (!LLM_ENABLED()) {
    await markEnrichAttempted(analysisId, "llmVisionAt");
    return false;
  }

  if (inFlightVision.has(analysisId)) {
    logger.debug({ analysisId }, "Vision enrichment already in flight, skipping");
    return false;
  }

  if (isRateLimited()) {
    logger.warn({ analysisId }, "LLM rate limit reached, skipping vision enrichment");
    await markEnrichAttempted(analysisId, "llmVisionAt");
    return false;
  }

  const log = logger.child({ analysisId, step: "llm-vision" });

  inFlightVision.add(analysisId);
  try {
    const el = await prisma.extractedListing.findUnique({
      where: { analysisId },
    });
    if (!el) {
      log.warn("No extracted listing found");
      await markEnrichAttempted(analysisId, "llmVisionAt");
      return false;
    }

    if (el.llmVisionAt) {
      log.debug("Already vision-enriched, skipping");
      return true;
    }

    const photos = Array.isArray(el.photos) ? el.photos as unknown[] : [];
    const photoUrls = photos
      .map((p: unknown) => (typeof p === "string" ? p : (p as Record<string, unknown>)?.url))
      .filter((u): u is string => typeof u === "string" && u.startsWith("http"))
      .slice(0, 3);

    if (!photoUrls.length) {
      log.debug("No photos available for vision analysis");
      await markEnrichAttempted(analysisId, "llmVisionAt");
      return false;
    }

    // Check cache by image hash
    const imgHash = hashImageUrls(photoUrls);
    const cached = await prisma.extractedListing.findFirst({
      where: {
        llmVisionAt: { not: null },
        llmVisionExtract: { not: Prisma.AnyNull },
      },
    });
    // Only reuse if we can verify same photo hash - check via stored data
    if (cached?.llmVisionExtract) {
      const cachedPhotos = Array.isArray(cached.photos) ? cached.photos as unknown[] : [];
      const cachedUrls = cachedPhotos
        .map((p: unknown) => (typeof p === "string" ? p : (p as Record<string, unknown>)?.url))
        .filter((u): u is string => typeof u === "string" && u.startsWith("http"))
        .slice(0, 3);
      if (cachedUrls.length > 0 && hashImageUrls(cachedUrls) === imgHash) {
        log.info("Reusing cached LLM vision extraction from matching image hash");
        await prisma.extractedListing.update({
          where: { analysisId },
          data: {
            llmVisionExtract: cached.llmVisionExtract,
            llmVisionAt: new Date(),
          },
        });
        return true;
      }
    }

    recordCall();
    const raw = await extractVisionWithLlm(photoUrls);
    if (!raw) {
      log.warn("LLM vision extraction returned null");
      await markEnrichAttempted(analysisId, "llmVisionAt");
      return false;
    }

    const validated = validateVisionExtraction(raw);

    await prisma.extractedListing.update({
      where: { analysisId },
      data: {
        llmVisionExtract: validated as unknown as Prisma.InputJsonValue,
        llmVisionAt: new Date(),
      },
    });

    log.info("LLM vision enrichment completed");
    return true;
  } catch (err) {
    log.error({ err }, "LLM vision enrichment failed");
    await markEnrichAttempted(analysisId, "llmVisionAt");
    return false;
  } finally {
    inFlightVision.delete(analysisId);
  }
}
