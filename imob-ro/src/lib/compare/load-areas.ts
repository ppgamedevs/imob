/**
 * Compare Areas Data Loader
 *
 * Loads normalized KPIs for area comparison using AreaDaily.
 */

import { prisma } from "@/lib/db";

export type AreaCompare = {
  slug: string;
  name: string;
  medianEurM2: number;
  rentEurM2?: number;
  yieldNet?: number;
  ttsMedianDays?: number;
  change30d?: number;
  change12m?: number;
  listingsCount?: number;
};

/**
 * Load areas for comparison by slugs
 */
export async function loadCompareAreas(slugs: string[]): Promise<AreaCompare[]> {
  if (!slugs.length || slugs.length > 4) {
    return [];
  }

  try {
    // First get areas
    const areas = await prisma.area.findMany({
      where: {
        slug: {
          in: slugs,
        },
      },
    });

    // Then get their daily stats
    const areaData = await Promise.all(
      areas.map(async (area) => {
        const daily = await prisma.areaDaily.findMany({
          where: { areaSlug: area.slug },
          orderBy: { date: "desc" },
          take: 365,
        });

        const latestDaily = daily[0];
        const daily30 = daily[29]; // 30 days ago
        const daily365 = daily[364]; // 1 year ago

        const medianEurM2 = latestDaily?.medianEurM2 || 0;
        const change30d = daily30?.medianEurM2
          ? ((medianEurM2 - daily30.medianEurM2) / daily30.medianEurM2) * 100
          : undefined;
        const change12m = daily365?.medianEurM2
          ? ((medianEurM2 - daily365.medianEurM2) / daily365.medianEurM2) * 100
          : undefined;

        // Rough rent estimation: 0.5% of median price per month per sqm
        const rentEurM2 = medianEurM2 ? medianEurM2 * 0.005 : undefined;
        const yieldNet = rentEurM2 ? ((rentEurM2 * 12 * 0.85) / medianEurM2) * 100 : undefined;

        // TTS estimation based on supply
        const listingsCount = latestDaily?.supply || 0;
        let ttsMedianDays = 60; // Default
        if (listingsCount > 100) ttsMedianDays = 45;
        else if (listingsCount < 20) ttsMedianDays = 90;

        return {
          slug: area.slug,
          name: area.name,
          medianEurM2: Math.round(medianEurM2),
          rentEurM2: rentEurM2 ? Math.round(rentEurM2) : undefined,
          yieldNet: yieldNet ? parseFloat(yieldNet.toFixed(2)) : undefined,
          ttsMedianDays,
          change30d: change30d ? parseFloat(change30d.toFixed(2)) : undefined,
          change12m: change12m ? parseFloat(change12m.toFixed(2)) : undefined,
          listingsCount,
        };
      }),
    );

    return areaData;
  } catch (error) {
    console.error("Error loading compare areas:", error);
    return [];
  }
}
