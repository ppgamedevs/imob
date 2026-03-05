/**
 * Daily signals aggregator.
 *
 * Queries internal data (Analysis, UserEstimate, ExtractedListing)
 * and aggregates demand/supply metrics per geo cell per day.
 *
 * Designed to be called by /api/cron/geo-signals daily.
 */
import { prisma } from "@/lib/db";
import { roundCoord } from "@/lib/geo/cache";

const GRID_PRECISION = 2; // ~1.1km cells for aggregation
const DEFAULT_RADIUS_M = 1000;
const DEG_BUFFER = DEFAULT_RADIUS_M / 111_000 + 0.005;

function roundGrid(val: number): number {
  return parseFloat(val.toFixed(GRID_PRECISION));
}

export interface AggregationResult {
  cellsProcessed: number;
  signalsWritten: number;
  errors: string[];
}

/**
 * Aggregate signals for a specific day.
 * If day is not provided, defaults to yesterday.
 */
export async function aggregateDailySignals(
  targetDay?: Date,
): Promise<AggregationResult> {
  const day = targetDay ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
  day.setUTCHours(0, 0, 0, 0);

  const dayStart = new Date(day);
  const dayEnd = new Date(day.getTime() + 24 * 60 * 60 * 1000);

  const errors: string[] = [];
  let signalsWritten = 0;

  // 1. Find all geo cells that had activity on this day
  const activeCells = new Map<string, { lat: number; lng: number }>();

  // From analyses (reports generated)
  try {
    const analyses = await prisma.extractedListing.findMany({
      where: {
        createdAt: { gte: dayStart, lt: dayEnd },
        lat: { not: null },
        lng: { not: null },
      },
      select: { lat: true, lng: true },
    });

    for (const a of analyses) {
      if (a.lat == null || a.lng == null) continue;
      const rLat = roundGrid(a.lat);
      const rLng = roundGrid(a.lng);
      const key = `${rLat}:${rLng}`;
      if (!activeCells.has(key)) activeCells.set(key, { lat: rLat, lng: rLng });
    }
  } catch (e) {
    errors.push(`analyses query: ${e instanceof Error ? e.message : "unknown"}`);
  }

  // From user estimates
  try {
    const estimates = await prisma.userEstimate.findMany({
      where: {
        createdAt: { gte: dayStart, lt: dayEnd },
        lat: { not: null },
        lng: { not: null },
      },
      select: { lat: true, lng: true },
    });

    for (const e of estimates) {
      if (e.lat == null || e.lng == null) continue;
      const rLat = roundGrid(e.lat);
      const rLng = roundGrid(e.lng);
      const key = `${rLat}:${rLng}`;
      if (!activeCells.has(key)) activeCells.set(key, { lat: rLat, lng: rLng });
    }
  } catch (e) {
    errors.push(`estimates query: ${e instanceof Error ? e.message : "unknown"}`);
  }

  // Also process known Bucharest cells even without activity (for supply)
  // We check cells that have had any listing data
  try {
    const listingCells = await prisma.extractedListing.groupBy({
      by: ["lat", "lng"],
      where: {
        lat: { not: null, gte: 44.3, lte: 44.6 },
        lng: { not: null, gte: 25.9, lte: 26.3 },
      },
      _count: true,
      orderBy: { _count: { lat: "desc" } },
      take: 200,
    });

    for (const cell of listingCells) {
      if (cell.lat == null || cell.lng == null) continue;
      const rLat = roundGrid(cell.lat);
      const rLng = roundGrid(cell.lng);
      const key = `${rLat}:${rLng}`;
      if (!activeCells.has(key)) activeCells.set(key, { lat: rLat, lng: rLng });
    }
  } catch (e) {
    errors.push(`listing cells query: ${e instanceof Error ? e.message : "unknown"}`);
  }

  // 2. For each cell, compute signals
  for (const [, cell] of activeCells) {
    try {
      const { lat, lng } = cell;

      // Report count: analyses created in this cell on this day
      const reportCount = await prisma.extractedListing.count({
        where: {
          createdAt: { gte: dayStart, lt: dayEnd },
          lat: { gte: lat - DEG_BUFFER, lte: lat + DEG_BUFFER },
          lng: { gte: lng - DEG_BUFFER, lte: lng + DEG_BUFFER },
        },
      });

      // Estimate count
      const estimateCount = await prisma.userEstimate.count({
        where: {
          createdAt: { gte: dayStart, lt: dayEnd },
          lat: { gte: lat - DEG_BUFFER, lte: lat + DEG_BUFFER },
          lng: { gte: lng - DEG_BUFFER, lte: lng + DEG_BUFFER },
        },
      });

      // Search count: all analyses initiated in this cell on this day
      const searchCount = await prisma.analysis.count({
        where: {
          createdAt: { gte: dayStart, lt: dayEnd },
          extractedListing: {
            lat: { gte: lat - DEG_BUFFER, lte: lat + DEG_BUFFER },
            lng: { gte: lng - DEG_BUFFER, lte: lng + DEG_BUFFER },
          },
        },
      });

      // Saved count: analyses in this cell that were saved on this day
      const cellListingIds = await prisma.extractedListing.findMany({
        where: {
          lat: { gte: lat - DEG_BUFFER, lte: lat + DEG_BUFFER },
          lng: { gte: lng - DEG_BUFFER, lte: lng + DEG_BUFFER },
        },
        select: { analysisId: true },
        take: 500,
      });
      const cellAnalysisIds = cellListingIds.map((l) => l.analysisId);
      const savedCount = cellAnalysisIds.length > 0
        ? await prisma.savedAnalysis.count({
            where: {
              createdAt: { gte: dayStart, lt: dayEnd },
              analysisId: { in: cellAnalysisIds },
            },
          })
        : 0;

      // Active listings (all time, in this cell, status=done)
      const activeListings = await prisma.extractedListing.count({
        where: {
          lat: { gte: lat - DEG_BUFFER, lte: lat + DEG_BUFFER },
          lng: { gte: lng - DEG_BUFFER, lte: lng + DEG_BUFFER },
          analysis: { status: "done" },
        },
      });

      // Median price per m2 (from recent listings in cell)
      const priceData = await prisma.extractedListing.findMany({
        where: {
          lat: { gte: lat - DEG_BUFFER, lte: lat + DEG_BUFFER },
          lng: { gte: lng - DEG_BUFFER, lte: lng + DEG_BUFFER },
          price: { not: null, gt: 0 },
          areaM2: { not: null, gt: 0 },
          createdAt: { gte: new Date(day.getTime() - 90 * 24 * 60 * 60 * 1000) },
        },
        select: { price: true, areaM2: true, currency: true },
        take: 100,
      });

      let medianPriceM2: number | null = null;
      if (priceData.length >= 3) {
        const eurM2Values = priceData
          .filter((p) => p.price != null && p.areaM2 != null && p.areaM2 > 0)
          .map((p) => {
            const price = p.price!;
            const area = p.areaM2!;
            const eurPrice = p.currency === "RON" ? price / 5 : price;
            return eurPrice / area;
          })
          .sort((a, b) => a - b);

        if (eurM2Values.length >= 3) {
          const mid = Math.floor(eurM2Values.length / 2);
          medianPriceM2 = eurM2Values.length % 2 === 0
            ? (eurM2Values[mid - 1] + eurM2Values[mid]) / 2
            : eurM2Values[mid];
          medianPriceM2 = Math.round(medianPriceM2);
        }
      }

      await prisma.geoDemandSignal.upsert({
        where: {
          day_latRounded_lngRounded_radiusM: {
            day: dayStart,
            latRounded: lat,
            lngRounded: lng,
            radiusM: DEFAULT_RADIUS_M,
          },
        },
        update: {
          reportCount,
          searchCount,
          estimateCount,
          savedCount,
          activeListings,
          medianPriceM2,
          computedAt: new Date(),
        },
        create: {
          day: dayStart,
          latRounded: lat,
          lngRounded: lng,
          radiusM: DEFAULT_RADIUS_M,
          reportCount,
          searchCount,
          estimateCount,
          savedCount,
          activeListings,
          medianPriceM2,
        },
      });

      signalsWritten++;
    } catch (e) {
      errors.push(`cell ${cell.lat},${cell.lng}: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  return {
    cellsProcessed: activeCells.size,
    signalsWritten,
    errors,
  };
}
