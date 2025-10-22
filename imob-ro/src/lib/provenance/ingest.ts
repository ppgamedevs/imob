import { prisma } from "@/lib/db";
import { phashHex } from "@/lib/media/phash";

/**
 * Logs a Sight record for provenance tracking.
 * Captures when/where the listing was seen.
 *
 * @param analysisId - Analysis ID
 * @param sourceUrl - Original listing URL
 */
export async function logSight(analysisId: string, sourceUrl: string): Promise<void> {
  try {
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      include: { extractedListing: true },
    });

    if (!analysis) return;

    const extracted = analysis.extractedListing;
    const domain = new URL(sourceUrl).hostname.replace(/^www\./, "");

    // Extract contact from sourceMeta if available
    let contact: string | null = null;
    if (extracted?.sourceMeta && typeof extracted.sourceMeta === "object") {
      const meta = extracted.sourceMeta as Record<string, unknown>;
      if (meta.contact && typeof meta.contact === "string") {
        contact = meta.contact;
      }
    }

    await prisma.sight.create({
      data: {
        analysisId,
        groupId: analysis.groupId ?? undefined,
        sourceUrl,
        domain,
        title: extracted?.title ?? undefined,
        priceEur: extracted?.price ?? undefined,
        areaM2: extracted?.areaM2 ?? undefined,
        rooms: extracted?.rooms ?? undefined,
        contact: contact ?? undefined,
      },
    });
  } catch (err) {
    console.warn("logSight failed:", err);
  }
}

/**
 * Computes pHash for listing photos and stores as PhotoAssets.
 * Processes up to 6 photos.
 *
 * @param analysisId - Analysis ID
 */
export async function logPhotoAssets(analysisId: string): Promise<void> {
  try {
    const extracted = await prisma.extractedListing.findUnique({
      where: { analysisId },
      select: { photos: true },
    });

    if (!extracted?.photos) return;

    // Parse photos JSON
    let photos: string[] = [];
    if (Array.isArray(extracted.photos)) {
      photos = extracted.photos.map((p: unknown) => {
        if (typeof p === "string") return p;
        if (p && typeof p === "object" && "url" in p) {
          return (p as { url: string }).url;
        }
        return "";
      });
    }

    // Process first 6 photos
    const photoUrls = photos.filter(Boolean).slice(0, 6);

    for (const src of photoUrls) {
      const hash = await phashHex(src);

      await prisma.photoAsset.create({
        data: {
          analysisId,
          src,
          phash: hash ?? undefined,
        },
      });
    }
  } catch (err) {
    console.warn("logPhotoAssets failed:", err);
  }
}
