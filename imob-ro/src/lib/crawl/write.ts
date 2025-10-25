/**
 * Day 25 - Writer (Pipeline Integration)
 * Upserts Analysis + ExtractedListing + Sight from crawler data
 * Reuses existing pipeline (startAnalysis from Day 2)
 */

import { startAnalysis } from "@/lib/analysis";
import { prisma } from "@/lib/db";

/**
 * Upsert Analysis and extracted data from crawler
 * Integrates with existing Day 20 Provenance (Sight) tracking
 */
export async function upsertAnalysisFromExtract(
  originUrl: string,

  extracted: any,
) {
  const sourceUrl = originUrl.trim();

  // Find existing analysis or create new
  const existing = await prisma.analysis.findFirst({
    where: { sourceUrl },
    orderBy: { createdAt: "desc" },
  });

  const analysis =
    existing ??
    (await prisma.analysis.create({
      data: { sourceUrl, status: "queued" },
    }));

  // Upsert ExtractedListing with crawler data
  await prisma.extractedListing.upsert({
    where: { analysisId: analysis.id },
    update: {
      title: extracted.title ?? undefined,
      price: extracted.price ?? undefined,
      currency: extracted.currency ?? undefined,
      areaM2: extracted.areaM2 ?? undefined,
      rooms: extracted.rooms ?? undefined,
      floorRaw: extracted.floorRaw ?? undefined,
      yearBuilt: extracted.yearBuilt ?? undefined,
      addressRaw: extracted.addressRaw ?? undefined,
      lat: extracted.lat ?? undefined,
      lng: extracted.lng ?? undefined,
      photos: extracted.photos ?? undefined,
      sourceMeta: extracted.sourceMeta ?? undefined,
    },
    create: {
      analysisId: analysis.id,
      title: extracted.title ?? undefined,
      price: extracted.price ?? undefined,
      currency: extracted.currency ?? undefined,
      areaM2: extracted.areaM2 ?? undefined,
      rooms: extracted.rooms ?? undefined,
      floorRaw: extracted.floorRaw ?? undefined,
      yearBuilt: extracted.yearBuilt ?? undefined,
      addressRaw: extracted.addressRaw ?? undefined,
      lat: extracted.lat ?? undefined,
      lng: extracted.lng ?? undefined,
      photos: extracted.photos ?? undefined,
      sourceMeta: extracted.sourceMeta ?? undefined,
    },
  });

  // Log Sight (Day 20 Provenance tracking)
  try {
    const domain = new URL(sourceUrl).hostname.replace(/^www\./, "");
    await prisma.sight.create({
      data: {
        analysisId: analysis.id,
        groupId: analysis.groupId ?? undefined,
        sourceUrl,
        domain,
        title: extracted.title ?? undefined,
        priceEur: extracted.price ?? undefined,
        areaM2: extracted.areaM2 ?? undefined,
        rooms: extracted.rooms ?? undefined,
      },
    });
  } catch {
    // Sight creation is best-effort (may fail on duplicates)
  }

  // Start full pipeline if this is a new analysis
  if (!existing) {
    await startAnalysis(analysis.id, sourceUrl);
  }

  return analysis.id;
}
