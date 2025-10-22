import { prisma } from "@/lib/db";
import { hammingHex } from "@/lib/media/phash";

/**
 * Finds photos reused across different analyses.
 * Compares pHash of current analysis photos against other analyses.
 *
 * @param analysisId - Analysis ID to check
 * @param maxDist - Maximum Hamming distance (default: 6 bits = ~90% similar)
 * @returns Array of matches with other analysis IDs
 */
export async function findReusedPhotos(
  analysisId: string,
  maxDist = 6,
): Promise<Array<{ otherAnalysisId: string; src: string; dist: number }>> {
  // Get current analysis photos with hashes
  const mine = await prisma.photoAsset.findMany({
    where: {
      analysisId,
      phash: { not: null },
    },
  });

  if (!mine.length) return [];

  // Get candidate photos from other analyses
  const candidates = await prisma.photoAsset.findMany({
    where: {
      phash: { not: null },
      analysisId: { not: analysisId },
    },
    take: 2000, // v1: reasonable limit
    orderBy: { createdAt: "desc" },
  });

  const hits: Array<{ otherAnalysisId: string; src: string; dist: number }> = [];

  // Compare hashes
  for (const m of mine) {
    if (!m.phash) continue;

    for (const c of candidates) {
      if (!c.phash) continue;

      const dist = hammingHex(m.phash, c.phash);
      if (dist <= maxDist) {
        hits.push({
          otherAnalysisId: c.analysisId,
          src: c.src,
          dist,
        });
      }
    }
  }

  return hits;
}
