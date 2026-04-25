import { prisma } from "@/lib/db";
import {
  computeReportDataQualityGateFromBundle,
  computeReportSellabilityFromBundle,
  resolveActualPriceEur,
  shouldLinkAdminDataQuality,
  type AnalysisCommercialBundle,
} from "@/lib/report/report-commercial-signals";
import { sanitizeRooms } from "@/lib/property-type";
import type { NormalizedFeatures } from "@/lib/types/pipeline";
import type { Prisma } from "@prisma/client";

export type ReportQualitySellabilityFilter = "all" | "strong" | "okay" | "weak" | "do_not_sell";
export type ReportQualityPaidFilter = "all" | "paid" | "unpaid";
export type ReportQualityConfidenceFilter = "all" | "high" | "medium" | "low";

export type ReportQualityRow = {
  analysisId: string;
  sourceHost: string;
  status: string;
  title: string | null;
  priceEur: number | null;
  areaM2: number | null;
  rooms: number | null;
  compCount: number;
  confidenceLevel: string | null;
  sellability: string;
  paywallShown: boolean;
  reportQuality: string;
  missingFields: string;
  createdAt: Date;
  updatedAt: Date;
  reportLink: string;
  dataQualityAdminLink: string | null;
  paid: boolean;
};

function hostFromSourceUrl(sourceUrl: string): string {
  try {
    return new URL(sourceUrl).hostname;
  } catch {
    return "(invalid-url)";
  }
}

function missingFieldsSummary(
  gate: ReturnType<typeof computeReportDataQualityGateFromBundle>,
  hasPrice: boolean,
  hasArea: boolean,
  hasRooms: boolean,
  compCount: number,
): string {
  const parts: string[] = [];
  if (!hasPrice) parts.push("preț");
  if (!hasArea) parts.push("suprafață");
  if (!hasRooms) parts.push("camere");
  if (compCount === 0) parts.push("0 comp");
  if (gate.geocodingQuality === "none") parts.push("GPS");
  if (gate.reportQuality === "insufficient") parts.push("calitate insuf.");
  return parts.length ? parts.join(", ") : "—";
}

function matchConfidence(
  row: ReportQualityRow,
  f: ReportQualityConfidenceFilter,
): boolean {
  if (f === "all") return true;
  return (row.confidenceLevel ?? "unknown") === f;
}

function matchHost(row: ReportQualityRow, hostSubstr: string | undefined): boolean {
  if (!hostSubstr || hostSubstr.trim() === "") return true;
  return row.sourceHost.toLowerCase().includes(hostSubstr.trim().toLowerCase());
}

export const REPORT_QUALITY_FETCH_WINDOW = 400;

/**
 * Last ~100 analyses after filters, using the same `buildReportSellability` and `buildReportDataQualityGate`
 * as the product (`report-commercial-signals` wraps both).
 */
export async function getReportQualityTable(
  options: {
    sellability: ReportQualitySellabilityFilter;
    sourceHost: string;
    status: string;
    confidence: ReportQualityConfidenceFilter;
    paid: ReportQualityPaidFilter;
  } = {
    sellability: "all",
    sourceHost: "",
    status: "all",
    confidence: "all",
    paid: "all",
  },
): Promise<ReportQualityRow[]> {
  const where: Prisma.AnalysisWhereInput = {};
  if (options.status && options.status !== "all") {
    where.status = options.status;
  }
  if (options.paid === "paid") {
    where.reportUnlocks = { some: { status: "paid" } };
  } else if (options.paid === "unpaid") {
    where.reportUnlocks = { none: { status: "paid" } };
  }

  const analyses = await prisma.analysis.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: REPORT_QUALITY_FETCH_WINDOW,
    include: {
      extractedListing: true,
      featureSnapshot: true,
      scoreSnapshot: true,
      reportUnlocks: { where: { status: "paid" }, take: 1, select: { id: true } },
    },
  });

  if (analyses.length === 0) return [];
  const ids = analyses.map((a) => a.id);
  const groups = await prisma.compMatch.groupBy({
    by: ["analysisId"],
    where: { analysisId: { in: ids } },
    _count: { _all: true },
  });
  const compMap = new Map(groups.map((g) => [g.analysisId, g._count._all]));

  const rows: ReportQualityRow[] = [];
  for (const a of analyses) {
    const bundle = a as AnalysisCommercialBundle;
    const compCount = compMap.get(a.id) ?? 0;
    const sell = computeReportSellabilityFromBundle(bundle, compCount);
    const gate = computeReportDataQualityGateFromBundle(bundle, compCount);
    const f = (bundle.featureSnapshot?.features ?? null) as NormalizedFeatures | null;
    const ex = bundle.extractedListing;
    const actualPrice = resolveActualPriceEur(ex, f);
    const hasArea = (ex?.areaM2 ?? f?.areaM2) != null && Number(ex?.areaM2 ?? f?.areaM2) > 0;
    const priceOk = actualPrice != null;
    const scoreExplain = bundle.scoreSnapshot?.explain as Record<string, unknown> | null;
    const conf = scoreExplain?.confidence as { level?: string } | undefined;
    const confidenceLevel = conf?.level ?? null;
    const hasRoomsForMissing =
      sanitizeRooms(
        (ex?.rooms ?? f?.rooms ?? null) as number | null,
        (ex?.title as string) ?? null,
      ) != null;

    const row: ReportQualityRow = {
      analysisId: a.id,
      sourceHost: hostFromSourceUrl(a.sourceUrl),
      status: a.status,
      title: ex?.title ?? null,
      priceEur: actualPrice,
      areaM2: (ex?.areaM2 ?? f?.areaM2) ?? null,
      rooms: (ex?.rooms ?? f?.rooms) ?? null,
      compCount,
      confidenceLevel,
      sellability: sell.sellability,
      paywallShown: sell.canShowPaywall,
      reportQuality: gate.reportQuality,
      missingFields: missingFieldsSummary(
        gate,
        priceOk,
        hasArea,
        hasRoomsForMissing,
        compCount,
      ),
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      reportLink: `/report/${a.id}`,
      dataQualityAdminLink: shouldLinkAdminDataQuality(sell, gate.reportQuality)
        ? "/admin/data-quality"
        : null,
      paid: a.reportUnlocks.length > 0,
    };
    if (options.sellability !== "all" && row.sellability !== options.sellability) continue;
    if (!matchConfidence(row, options.confidence)) continue;
    if (!matchHost(row, options.sourceHost)) continue;
    rows.push(row);
  }

  return rows.slice(0, 100);
}
