/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "./db";
import { Extracted, maybeFetchServer } from "./extractors";
import { updateFeatureSnapshot } from "./normalize-pipeline";

// Helper: load analysis including snapshots for SSR
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

// Helper: reuse analysis for same URL in last 7 days, otherwise create queued
export async function upsertAnalysisByUrl(sourceUrl: string, userId?: string | null) {
  const recent = await prisma.analysis.findFirst({
    where: { sourceUrl },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < 7 * 24 * 3600 * 1000) {
    return recent;
  }
  return prisma.analysis.create({ data: { userId: userId ?? null, sourceUrl, status: "queued" } });
}

/**
 * Placeholder startAnalysis worker.
 * In production this would enqueue a job or trigger the analyzer.
 */
export async function startAnalysis(analysisId: string, url: string) {
  // minimal placeholder: mark as started then completed after a short delay
  try {
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { status: "running" },
    });
    console.log(`startAnalysis: ${analysisId} -> ${url}`);

    // Wait up to 5s for a client-pushed ExtractedListing
    const deadline = Date.now() + 5000;
    let extracted: Extracted | null = null;
    while (Date.now() < deadline) {
      // Prisma returns any-typed records; cast to Extracted-like shape when present

      extracted = (await prisma.extractedListing.findUnique({ where: { analysisId } })) as any;
      if (extracted) break;
      // sleep 500ms
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!extracted) {
      // try server-side fetch/extract if the domain is whitelisted
      const serverData: Extracted | null = await maybeFetchServer(url);
      if (serverData) {
        // upsert ExtractedListing
        await prisma.extractedListing.upsert({
          where: { analysisId },
          create: {
            analysisId,
            title: serverData.title || undefined,
            price: serverData.price || undefined,
            currency: serverData.currency || undefined,
            areaM2: serverData.areaM2 || undefined,
            rooms: serverData.rooms || undefined,
            addressRaw: serverData.addressRaw || undefined,
          },
          update: {
            title: serverData.title || undefined,
            price: serverData.price || undefined,
            currency: serverData.currency || undefined,
            areaM2: serverData.areaM2 || undefined,
            rooms: serverData.rooms || undefined,
            addressRaw: serverData.addressRaw || undefined,
          },
        });

        // Run the normalization pipeline and persist the snapshot
        try {
          await prisma.analysis.update({
            where: { id: analysisId },
            data: { status: "normalizing" },
          });
          await updateFeatureSnapshot(analysisId);
          await prisma.analysis.update({ where: { id: analysisId }, data: { status: "scoring" } });
        } catch (err) {
          console.warn("updateFeatureSnapshot failed", err);
        }
      }
    } else {
      // If a client provided extracted listing exists, run the normalization pipeline
      try {
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { status: "normalizing" },
        });
        await updateFeatureSnapshot(analysisId);
        await prisma.analysis.update({ where: { id: analysisId }, data: { status: "scoring" } });
      } catch (e) {
        console.warn("updateFeatureSnapshot failed", e);
      }
    }

    // Simulate finishing work: mark as done after short delay
    setTimeout(async () => {
      try {
        await prisma.analysis.update({ where: { id: analysisId }, data: { status: "done" } });
      } catch (e) {
        console.error("Error finishing analysis", analysisId, e);
        await prisma.analysis.update({ where: { id: analysisId }, data: { status: "failed" } });
      }
    }, 2000);
  } catch (e) {
    console.error("startAnalysis error", e);
    await prisma.analysis.update({ where: { id: analysisId }, data: { status: "failed" } });
  }
}
