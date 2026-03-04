import { prisma } from "@/lib/db";
import { logger } from "@/lib/obs/logger";

import { computeImagesHash, computeTextHash } from "./hashes";

/**
 * Create a snapshot for a listing after crawl/extraction.
 * This tracks price history and content changes over time.
 */
export async function createListingSnapshot(params: {
  analysisId: string;
  title?: string | null;
  description?: string | null;
  priceEur?: number | null;
  photos?: string[] | null;
  source?: string | null;
  url?: string | null;
  status?: "ACTIVE" | "REMOVED" | "UNKNOWN";
}): Promise<void> {
  if (process.env.INTEGRITY_ENABLED !== "true") return;

  try {
    const textHash = computeTextHash(params.title, params.description);
    const imagesHash = params.photos?.length
      ? computeImagesHash(params.photos)
      : null;

    await prisma.listingSnapshot.create({
      data: {
        listingId: params.analysisId,
        priceEur: params.priceEur ?? null,
        status: params.status ?? "ACTIVE",
        textHash,
        imagesHash,
        source: params.source ?? null,
        url: params.url ?? null,
      },
    });
  } catch (err) {
    logger.warn({ err, analysisId: params.analysisId }, "Failed to create listing snapshot");
  }
}

/**
 * Mark a listing as REMOVED when its URL returns 404 or listing not found.
 */
export async function markListingRemoved(analysisId: string): Promise<void> {
  if (process.env.INTEGRITY_ENABLED !== "true") return;

  try {
    const lastSnapshot = await prisma.listingSnapshot.findFirst({
      where: { listingId: analysisId },
      orderBy: { capturedAt: "desc" },
    });

    if (lastSnapshot && lastSnapshot.status === "REMOVED") return;

    await prisma.listingSnapshot.create({
      data: {
        listingId: analysisId,
        priceEur: lastSnapshot?.priceEur ?? null,
        status: "REMOVED",
        textHash: lastSnapshot?.textHash ?? "removed",
        imagesHash: lastSnapshot?.imagesHash ?? null,
        source: lastSnapshot?.source ?? null,
        url: lastSnapshot?.url ?? null,
      },
    });
  } catch (err) {
    logger.warn({ err, analysisId }, "Failed to mark listing as removed");
  }
}

/**
 * Get price history for a listing from snapshots.
 */
export async function getPriceHistory(analysisId: string) {
  return prisma.listingSnapshot.findMany({
    where: { listingId: analysisId },
    orderBy: { capturedAt: "asc" },
    select: {
      capturedAt: true,
      priceEur: true,
      status: true,
    },
  });
}
