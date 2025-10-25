/**
 * Compare Listings Data Loader
 *
 * Loads normalized data for side-by-side listing comparison.
 * Supports Analysis IDs with ExtractedListing and ScoreSnapshot.
 */

import { prisma } from "@/lib/db";

export type CompareListing = {
  id: string;
  href: string;
  title: string;
  areaName: string;
  mediaUrl?: string;
  sourceHost?: string;
  faviconUrl?: string;
  priceEur?: number;
  eurM2?: number;
  areaM2?: number;
  rooms?: number;
  floor?: string;
  yearBuilt?: number;
  distMetroM?: number;
  avm: {
    low?: number;
    mid?: number;
    high?: number;
    badge?: "under" | "fair" | "over";
    conf?: number;
  };
  tts?: {
    bucket?: string;
    days?: number;
  };
  yield?: {
    net?: number;
    gross?: number;
    rentEur?: number;
  };
  seismic?: {
    class?: string;
    conf?: number;
  };
  quality?: {
    score?: number;
    label?: string;
  };
};

/**
 * Load listings for comparison by Analysis IDs
 */
export async function loadCompareListings(ids: string[]): Promise<CompareListing[]> {
  if (!ids.length || ids.length > 4) {
    return [];
  }

  try {
    const analyses = await prisma.analysis.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include: {
        extractedListing: true,
        scoreSnapshot: true,
      },
    });

    return analyses.map((analysis) => {
      const extracted = analysis.extractedListing;
      const score = analysis.scoreSnapshot;

      // Extract URL components
      const url = analysis.sourceUrl || "";
      let sourceHost = "";
      try {
        const urlObj = new URL(url);
        sourceHost = urlObj.hostname.replace("www.", "");
      } catch {
        // Invalid URL
      }

      // AVM calculation from ScoreSnapshot
      const avmMid = score?.avmMid ? Math.round(score.avmMid) : undefined;
      const avmLow = score?.avmLow ? Math.round(score.avmLow) : undefined;
      const avmHigh = score?.avmHigh ? Math.round(score.avmHigh) : undefined;
      const listPrice = extracted?.price || undefined;
      const avmBadge = score?.priceBadge as "under" | "fair" | "over" | undefined;

      // TTS from ScoreSnapshot
      const ttsBucket = score?.ttsBucket || "medium";
      let ttsDays = 60;
      if (ttsBucket === "fast") ttsDays = 30;
      else if (ttsBucket === "slow") ttsDays = 90;

      // Calculate €/m²
      const eurM2 =
        extracted?.price && extracted?.areaM2
          ? Math.round(extracted.price / extracted.areaM2)
          : undefined;
      const areaM2 = extracted?.areaM2 || undefined;

      // Yield from ScoreSnapshot or calculate
      const yieldNet = score?.yieldNet || undefined;
      const yieldGross = score?.yieldGross || undefined;
      let rentEur: number | undefined;
      if (yieldNet && listPrice) {
        const yearlyRent = (listPrice * yieldNet) / 100;
        rentEur = Math.round(yearlyRent / 12);
      }

      // Seismic risk from ScoreSnapshot
      const seismicClass = score?.riskClass || "C";
      const seismicConf = score?.riskSeismic || 0.7;

      // Quality score from ScoreSnapshot
      const qualityScore = score?.conditionScore ? score.conditionScore * 100 : 70;
      let qualityLabel = score?.condition || "Good";
      if (qualityScore > 80) qualityLabel = "Excellent";
      else if (qualityScore < 50) qualityLabel = "Limited";

      // Extract area name from addressRaw (simplified)
      const areaName = extracted?.addressRaw?.split(",")[0]?.trim() || "Necunoscut";

      return {
        id: analysis.id,
        href: `/report/${analysis.id}`,
        title: extracted?.title || `${extracted?.rooms || "?"} camere, ${areaName}`,
        areaName,
        mediaUrl: (extracted?.photos as string[] | undefined)?.[0] || "/placeholder-listing.jpg",
        sourceHost,
        faviconUrl: sourceHost
          ? `https://www.google.com/s2/favicons?domain=${sourceHost}&sz=32`
          : undefined,
        priceEur: listPrice,
        eurM2,
        areaM2,
        rooms: extracted?.rooms || undefined,
        floor: extracted?.floorRaw || undefined,
        yearBuilt: extracted?.yearBuilt || undefined,
        distMetroM: undefined, // Would need to calculate from lat/lng
        avm: {
          low: avmLow,
          mid: avmMid,
          high: avmHigh,
          badge: avmBadge,
          conf: score?.avmConf || 0.8,
        },
        tts: {
          bucket: ttsBucket,
          days: ttsDays,
        },
        yield: {
          net: yieldNet,
          gross: yieldGross,
          rentEur,
        },
        seismic: {
          class: seismicClass,
          conf: seismicConf,
        },
        quality: {
          score: qualityScore,
          label: qualityLabel,
        },
      };
    });
  } catch (error) {
    console.error("Error loading compare listings:", error);
    return [];
  }
}

/**
 * Rank seismic class for comparison (lower is better)
 */
export function rankSeismicClass(cls?: string): number {
  if (!cls) return 99;
  const map: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5 };
  return map[cls.toUpperCase()] || 3;
}
