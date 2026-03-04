import { prisma } from "@/lib/db";
import { logger } from "@/lib/obs/logger";

/**
 * Duplicate detection scan.
 * Finds candidate duplicates by:
 * 1. Same textHash across different analyses
 * 2. Same imagesHash across different analyses
 * 3. Nearby addresses with similar characteristics (lat/lng proximity + rooms + surface)
 */
export async function runDedupScan(options: {
  daysBack?: number;
  limit?: number;
} = {}): Promise<{ textMatches: number; imageMatches: number; addressMatches: number }> {
  if (process.env.INTEGRITY_ENABLED !== "true") {
    return { textMatches: 0, imageMatches: 0, addressMatches: 0 };
  }

  const daysBack = options.daysBack ?? 14;
  const limit = options.limit ?? 500;
  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  let textMatches = 0;
  let imageMatches = 0;
  let addressMatches = 0;

  // 1. Text hash duplicates
  try {
    const textDups = await prisma.$queryRaw<Array<{
      textHash: string;
      ids: string[];
    }>>`
      SELECT "textHash", array_agg(DISTINCT "listingId") as ids
      FROM "ListingSnapshot"
      WHERE "capturedAt" >= ${cutoff}
        AND "textHash" IS NOT NULL
      GROUP BY "textHash"
      HAVING count(DISTINCT "listingId") > 1
      LIMIT ${limit}
    `;

    for (const group of textDups) {
      const ids = group.ids;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const [a, b] = ids[i] < ids[j] ? [ids[i], ids[j]] : [ids[j], ids[i]];
          try {
            await prisma.listingDuplicate.upsert({
              where: { listingIdA_listingIdB: { listingIdA: a, listingIdB: b } },
              update: { confidence: 90 },
              create: { listingIdA: a, listingIdB: b, reason: "TEXT_HASH", confidence: 90 },
            });
            textMatches++;
          } catch {
            // unique constraint race condition
          }
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, "Text hash dedup scan failed");
  }

  // 2. Images hash duplicates
  try {
    const imgDups = await prisma.$queryRaw<Array<{
      imagesHash: string;
      ids: string[];
    }>>`
      SELECT "imagesHash", array_agg(DISTINCT "listingId") as ids
      FROM "ListingSnapshot"
      WHERE "capturedAt" >= ${cutoff}
        AND "imagesHash" IS NOT NULL
      GROUP BY "imagesHash"
      HAVING count(DISTINCT "listingId") > 1
      LIMIT ${limit}
    `;

    for (const group of imgDups) {
      const ids = group.ids;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const [a, b] = ids[i] < ids[j] ? [ids[i], ids[j]] : [ids[j], ids[i]];
          try {
            await prisma.listingDuplicate.upsert({
              where: { listingIdA_listingIdB: { listingIdA: a, listingIdB: b } },
              update: { confidence: 85 },
              create: { listingIdA: a, listingIdB: b, reason: "IMAGES_HASH", confidence: 85 },
            });
            imageMatches++;
          } catch {
            // unique constraint race condition
          }
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, "Images hash dedup scan failed");
  }

  // 3. Address proximity duplicates (within ~50m with similar rooms/surface)
  try {
    const recentAnalyses = await prisma.analysis.findMany({
      where: {
        createdAt: { gte: cutoff },
        extractedListing: {
          lat: { not: null },
          lng: { not: null },
        },
      },
      include: {
        extractedListing: {
          select: { lat: true, lng: true, rooms: true, areaM2: true },
        },
      },
      take: limit,
    });

    const withCoords = recentAnalyses.filter(
      (a) => a.extractedListing?.lat != null && a.extractedListing?.lng != null,
    );

    for (let i = 0; i < withCoords.length; i++) {
      for (let j = i + 1; j < withCoords.length; j++) {
        const ai = withCoords[i];
        const aj = withCoords[j];
        const exi = ai.extractedListing!;
        const exj = aj.extractedListing!;

        const dist = haversine(exi.lat!, exi.lng!, exj.lat!, exj.lng!);
        if (dist > 50) continue;

        const roomsMatch = exi.rooms != null && exj.rooms != null && exi.rooms === exj.rooms;
        const areaClose = exi.areaM2 != null && exj.areaM2 != null
          && Math.abs(exi.areaM2 - exj.areaM2) <= 5;

        if (!roomsMatch && !areaClose) continue;

        const [a, b] = ai.id < aj.id ? [ai.id, aj.id] : [aj.id, ai.id];
        try {
          await prisma.listingDuplicate.upsert({
            where: { listingIdA_listingIdB: { listingIdA: a, listingIdB: b } },
            update: { confidence: 60 },
            create: { listingIdA: a, listingIdB: b, reason: "ADDRESS_NEAR", confidence: 60 },
          });
          addressMatches++;
        } catch {
          // unique constraint race condition
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, "Address proximity dedup scan failed");
  }

  return { textMatches, imageMatches, addressMatches };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
