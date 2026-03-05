/**
 * Query aggregated demand/supply signals for a location.
 *
 * Returns computed metrics with confidence levels and trends.
 */
import { prisma } from "@/lib/db";

const GRID_PRECISION = 2;

function roundGrid(val: number): number {
  return parseFloat(val.toFixed(GRID_PRECISION));
}

export type Confidence = "scazuta" | "medie" | "ridicata";
export type TrendDirection = "up" | "down" | "flat";

export interface DemandSignals {
  /** Weighted demand index 0-100 */
  demandIndex: number;
  /** Demand trend vs previous period */
  demandTrend: TrendDirection;
  demandTrendPct: number;
  /** Supply index 0-100 */
  supplyIndex: number;
  supplyTrend: TrendDirection;
  supplyTrendPct: number;
  /** Price data */
  medianPriceM2_30d: number | null;
  medianPriceM2_90d: number | null;
  priceTrend: TrendDirection | null;
  priceTrendPct: number | null;
  /** Sample sizes */
  nListings: number;
  nEvents30d: number;
  nEvents90d: number;
  /** Confidence based on data volume */
  confidence: Confidence;
  /** Human-readable disclaimers */
  disclaimers: string[];
}

const EMPTY_SIGNALS: DemandSignals = {
  demandIndex: 0,
  demandTrend: "flat",
  demandTrendPct: 0,
  supplyIndex: 0,
  supplyTrend: "flat",
  supplyTrendPct: 0,
  medianPriceM2_30d: null,
  medianPriceM2_90d: null,
  priceTrend: null,
  priceTrendPct: null,
  nListings: 0,
  nEvents30d: 0,
  nEvents90d: 0,
  confidence: "scazuta",
  disclaimers: ["Date insuficiente pentru aceasta zona. Semnalele vor deveni mai precise pe masura ce adunam mai multe date."],
};

export async function querySignals(
  lat: number,
  lng: number,
  radiusM = 1000,
): Promise<DemandSignals> {
  const rLat = roundGrid(lat);
  const rLng = roundGrid(lng);
  const degBuffer = 0.01 + 0.005; // cover neighboring cells too

  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  try {
    const signals = await prisma.geoDemandSignal.findMany({
      where: {
        latRounded: { gte: rLat - degBuffer, lte: rLat + degBuffer },
        lngRounded: { gte: rLng - degBuffer, lte: rLng + degBuffer },
        day: { gte: d90 },
      },
      orderBy: { day: "desc" },
    });

    if (signals.length === 0) return EMPTY_SIGNALS;

    // Split into time windows
    const last7 = signals.filter((s) => s.day >= d7);
    const prev7 = signals.filter((s) => s.day >= d14 && s.day < d7);
    const last30 = signals.filter((s) => s.day >= d30);
    const prev30 = signals.filter((s) => s.day >= d60 && s.day < d30);
    const last90 = signals;

    // Weighted demand (report=3, estimate=2, saved=2, search=1)
    const weightedDemand = (rows: typeof signals) =>
      rows.reduce(
        (sum, r) =>
          sum + r.reportCount * 3 + r.estimateCount * 2 + r.savedCount * 2 + r.searchCount,
        0,
      );

    const demand30 = weightedDemand(last30);
    const demandPrev30 = weightedDemand(prev30);
    const demand7 = weightedDemand(last7);
    const demandPrev7 = weightedDemand(prev7);
    const demand90 = weightedDemand(last90);

    // Normalize demand to 0-100 (based on Bucharest average ~15 events/cell/30d)
    const demandIndex = Math.min(100, Math.round((demand30 / 45) * 100));

    // Demand trend (last 7 vs prev 7)
    const demandTrendPct =
      demandPrev7 > 0
        ? Math.round(((demand7 - demandPrev7) / demandPrev7) * 100)
        : demand7 > 0
          ? 100
          : 0;
    const demandTrend: TrendDirection =
      demandTrendPct > 10 ? "up" : demandTrendPct < -10 ? "down" : "flat";

    // Supply
    const latestSupply = last7.length > 0 ? last7[0].activeListings : last30.length > 0 ? last30[0].activeListings : 0;
    const prevSupply = prev7.length > 0 ? prev7[0].activeListings : prev30.length > 0 ? prev30[0].activeListings : 0;

    // Normalize supply to 0-100 (based on ~20 listings/cell being "normal")
    const supplyIndex = Math.min(100, Math.round((latestSupply / 20) * 100));

    const supplyTrendPct =
      prevSupply > 0
        ? Math.round(((latestSupply - prevSupply) / prevSupply) * 100)
        : latestSupply > 0
          ? 100
          : 0;
    const supplyTrend: TrendDirection =
      supplyTrendPct > 10 ? "up" : supplyTrendPct < -10 ? "down" : "flat";

    // Price trends
    const prices30 = last30
      .filter((s) => s.medianPriceM2 != null)
      .map((s) => s.medianPriceM2!);
    const prices90 = last90
      .filter((s) => s.medianPriceM2 != null)
      .map((s) => s.medianPriceM2!);

    const medianPriceM2_30d =
      prices30.length >= 3 ? Math.round(median(prices30)) : null;
    const medianPriceM2_90d =
      prices90.length >= 3 ? Math.round(median(prices90)) : null;

    let priceTrend: TrendDirection | null = null;
    let priceTrendPct: number | null = null;
    if (medianPriceM2_30d != null && medianPriceM2_90d != null && medianPriceM2_90d > 0) {
      priceTrendPct = Math.round(
        ((medianPriceM2_30d - medianPriceM2_90d) / medianPriceM2_90d) * 100,
      );
      priceTrend = priceTrendPct > 3 ? "up" : priceTrendPct < -3 ? "down" : "flat";
    }

    // Sample sizes
    const nEvents30d = last30.reduce(
      (s, r) => s + r.reportCount + r.estimateCount + r.savedCount + r.searchCount,
      0,
    );
    const nEvents90d = last90.reduce(
      (s, r) => s + r.reportCount + r.estimateCount + r.savedCount + r.searchCount,
      0,
    );

    // Confidence
    let confidence: Confidence = "scazuta";
    if (nEvents90d >= 50 && latestSupply >= 10) confidence = "ridicata";
    else if (nEvents90d >= 15 && latestSupply >= 5) confidence = "medie";

    // Disclaimers
    const disclaimers: string[] = [];
    if (confidence === "scazuta")
      disclaimers.push("Date limitate in aceasta zona. Semnalele pot fi imprecise.");
    if (latestSupply < 5)
      disclaimers.push(`Bazat pe doar ${latestSupply} anunturi active in zona.`);
    if (nEvents30d < 5)
      disclaimers.push(`Doar ${nEvents30d} evenimente in ultimele 30 de zile.`);
    if (medianPriceM2_30d == null)
      disclaimers.push("Insuficiente date de pret pentru trend.");

    return {
      demandIndex,
      demandTrend,
      demandTrendPct,
      supplyIndex,
      supplyTrend,
      supplyTrendPct,
      medianPriceM2_30d,
      medianPriceM2_90d,
      priceTrend,
      priceTrendPct,
      nListings: latestSupply,
      nEvents30d,
      nEvents90d,
      confidence,
      disclaimers,
    };
  } catch {
    return EMPTY_SIGNALS;
  }
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
