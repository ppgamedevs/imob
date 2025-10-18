import { prisma } from "./db";
import { Extracted, maybeFetchServer } from "./extractors";

/**
 * Placeholder startAnalysis worker.
 * In production this would enqueue a job or trigger the analyzer.
 */
export async function startAnalysis(analysisId: string, url: string) {
  // minimal placeholder: mark as started then completed after a short delay
  try {
    await prisma.analysis.update({ where: { id: analysisId }, data: { status: "running" } });
    console.log(`startAnalysis: ${analysisId} -> ${url}`);

    // Wait up to 5s for a client-pushed ExtractedListing
    const deadline = Date.now() + 5000;
  let extracted: Extracted | null = null;
    while (Date.now() < deadline) {
      extracted = await prisma.extractedListing.findUnique({ where: { analysisId } });
      if (extracted) break;
      // sleep 500ms
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!extracted) {
      // try server-side fetch/extract if the domain is whitelisted
  const serverData = (await maybeFetchServer(url)) as Extracted | null;
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

        // Immediately normalize and persist FeatureSnapshot.features
        try {
          const { default: normalizeExtracted } = await import("./normalize");
          const normalized = await normalizeExtracted(serverData as unknown);
          await prisma.featureSnapshot.upsert({
            where: { analysisId },
            create: { analysisId, features: normalized },
            update: { features: normalized },
          });
        } catch (err) {
          // swallow normalization errors to avoid blocking analysis flow
          // eslint-disable-next-line no-console
          const e = err as Error | undefined;
          console.warn("normalize or upsert feature snapshot failed", e?.message ?? e);
        }
      }
    } else {
      // If a client provided extracted listing exists, normalize it too
      try {
        const { default: normalizeExtracted } = await import("./normalize");
        const normalized = await normalizeExtracted(extracted as unknown);
        await prisma.featureSnapshot.upsert({
          where: { analysisId },
          create: { analysisId, features: normalized },
          update: { features: normalized },
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        const e = err as Error | undefined;
        console.warn("normalize or upsert feature snapshot failed", e?.message ?? e);
      }
    }

    // Simulate finishing work
    setTimeout(async () => {
      try {
        await prisma.analysis.update({ where: { id: analysisId }, data: { status: "completed" } });
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
