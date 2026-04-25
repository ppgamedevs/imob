import { prisma } from "@/lib/db";
import {
  isBucharestIlfovFromFeatures,
  notarialQaFlagsFromExplain,
} from "@/lib/notarial/notarial-validate";
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
  notarialSuppressed: boolean;
  notarialImplausible: boolean;
  notarialMatchLowConfidence: boolean;
  /** From `explain.notarial.matchMethod` */
  notarialMatchMethod: string | null;
  /** `explain.notarial.canShow` */
  notarialShown: boolean;
  notarialSuppressReason: string | null;
  /** Display total when `canShow` (same as public report). */
  notarialTotalEur: number | null;
  /** Display €/m² when `canShow`. */
  notarialEurM2: number | null;
  notarialGridYear: number | null;
  /** Highlight row for QA (sector_avg, plausibility, old year, etc.). */
  notarialRowSuspicious: boolean;
  /** Comma-separated tags when suspicious. */
  notarialSuspicionTags: string;
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

const NOTARIAL_CALENDAR_YEAR = new Date().getFullYear();

function notarialRecordFromExplain(explain: unknown): Record<string, unknown> | null {
  const n = (explain as Record<string, unknown> | null)?.notarial;
  if (!n || typeof n !== "object" || n === null) return null;
  return n as Record<string, unknown>;
}

/**
 * Admin-only: derive notarial display columns and “suspicious” highlights from
 * `ScoreSnapshot.explain.notarial` (no public exposure).
 */
function buildNotarialAdminInspect(opts: {
  explain: unknown;
  features: NormalizedFeatures | null;
  addressRaw: string | null;
  priceEur: number | null;
  notarialColTotal: number | null;
  notarialColEurM2: number | null;
}): {
  notarialMatchMethod: string | null;
  notarialShown: boolean;
  notarialSuppressReason: string | null;
  notarialTotalEur: number | null;
  notarialEurM2: number | null;
  notarialGridYear: number | null;
  notarialRowSuspicious: boolean;
  notarialSuspicionTags: string;
} {
  const n = notarialRecordFromExplain(opts.explain);
  if (!n) {
    return {
      notarialMatchMethod: null,
      notarialShown: false,
      notarialSuppressReason: null,
      notarialTotalEur: null,
      notarialEurM2: null,
      notarialGridYear: null,
      notarialRowSuspicious: false,
      notarialSuspicionTags: "",
    };
  }

  const method = typeof n.matchMethod === "string" ? n.matchMethod : null;
  const shown = n.canShow === true;
  const suppressReason =
    !shown && typeof n.suppressReason === "string" && n.suppressReason.length > 0
      ? n.suppressReason
      : null;
  let totalEur: number | null = shown
    ? typeof n.displayTotalEur === "number"
      ? (n.displayTotalEur as number)
      : null
    : null;
  let eurM2: number | null = shown
    ? typeof n.displayEurM2 === "number"
      ? (n.displayEurM2 as number)
      : null
    : null;
  if (shown) {
    if (totalEur == null && opts.notarialColTotal != null) totalEur = opts.notarialColTotal;
    if (eurM2 == null && opts.notarialColEurM2 != null) eurM2 = opts.notarialColEurM2;
  }
  const gridYear = typeof n.gridYear === "number" ? n.gridYear : null;

  const featureRec: Record<string, unknown> = {
    ...((opts.features ?? {}) as Record<string, unknown>),
    addressRaw: opts.addressRaw ?? (opts.features as { addressRaw?: string } | null)?.addressRaw,
  };
  const isBuchIlfov = isBucharestIlfovFromFeatures(featureRec);
  const pt = n.propertyType as string | undefined;
  const isApartment = pt == null || pt === "apartment";

  const interpretedEurM2 =
    typeof n.interpretedEurM2 === "number"
      ? (n.interpretedEurM2 as number)
      : typeof n.eurPerM2 === "number"
        ? (n.eurPerM2 as number)
        : null;
  const computedTotalEur =
    typeof n.computedTotalEur === "number"
      ? (n.computedTotalEur as number)
      : typeof n.totalValue === "number"
        ? (n.totalValue as number)
        : null;

  const rawCurrency = n.rawCurrency;
  const rawUnit = n.rawUnit;
  const currencyUnitSuspicious =
    n.matched === true && (rawCurrency === "unknown" || rawUnit === "unknown");

  const tagSet = new Set<string>();
  if (method === "sector_avg") tagSet.add("sector_avg");
  if (
    opts.priceEur != null &&
    opts.priceEur > 0 &&
    computedTotalEur != null &&
    computedTotalEur < opts.priceEur * 0.45
  ) {
    tagSet.add("sub_45pct_preț");
  }
  if (isBuchIlfov && isApartment && interpretedEurM2 != null && interpretedEurM2 < 400) {
    tagSet.add("eur_m2_sub_400");
  }
  if (gridYear != null && (gridYear < NOTARIAL_CALENDAR_YEAR - 1 || gridYear > NOTARIAL_CALENDAR_YEAR)) {
    tagSet.add("an_grilă");
  }
  if (currencyUnitSuspicious) {
    tagSet.add("valută_or_unitate");
  }

  const notarialRowSuspicious = tagSet.size > 0;
  return {
    notarialMatchMethod: method,
    notarialShown: shown,
    notarialSuppressReason: suppressReason,
    notarialTotalEur: totalEur,
    notarialEurM2: eurM2,
    notarialGridYear: gridYear,
    notarialRowSuspicious,
    notarialSuspicionTags: [...tagSet].join(", "),
  };
}

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

    const nFlags = notarialQaFlagsFromExplain(bundle.scoreSnapshot?.explain);
    const addressRaw =
      (ex as { addressRaw?: string | null } | null)?.addressRaw ??
      (f as { addressRaw?: string | null } | null)?.addressRaw ??
      null;
    const notarialInspect = buildNotarialAdminInspect({
      explain: bundle.scoreSnapshot?.explain,
      features: f,
      addressRaw,
      priceEur: actualPrice,
      notarialColTotal: bundle.scoreSnapshot?.notarialTotal ?? null,
      notarialColEurM2: bundle.scoreSnapshot?.notarialEurM2 ?? null,
    });
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
      notarialSuppressed: nFlags.notarialSuppressed,
      notarialImplausible: nFlags.notarialImplausible,
      notarialMatchLowConfidence: nFlags.notarialMatchLowConfidence,
      notarialMatchMethod: notarialInspect.notarialMatchMethod,
      notarialShown: notarialInspect.notarialShown,
      notarialSuppressReason: notarialInspect.notarialSuppressReason,
      notarialTotalEur: notarialInspect.notarialTotalEur,
      notarialEurM2: notarialInspect.notarialEurM2,
      notarialGridYear: notarialInspect.notarialGridYear,
      notarialRowSuspicious: notarialInspect.notarialRowSuspicious,
      notarialSuspicionTags: notarialInspect.notarialSuspicionTags,
    };
    if (options.sellability !== "all" && row.sellability !== options.sellability) continue;
    if (!matchConfidence(row, options.confidence)) continue;
    if (!matchHost(row, options.sourceHost)) continue;
    rows.push(row);
  }

  return rows.slice(0, 100);
}
