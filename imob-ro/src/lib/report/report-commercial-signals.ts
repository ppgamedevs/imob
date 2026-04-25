import type { ExtractedListing, FeatureSnapshot, ScoreSnapshot } from "@prisma/client";

import { buildReportDataQualityGate, type ReportDataQuality } from "@/lib/report/data-quality-gate";
import { buildReportSellability, type ReportSellabilityResult } from "@/lib/report/report-sellability";
import { applyReportRiskVisibility, normalizeRiskStack } from "@/lib/risk/executive";
import { PUBLIC_SAMPLE_REPORT_ANALYSIS_ID } from "@/lib/report/sample-public-report";
import { sanitizeRooms } from "@/lib/property-type";
import type { NormalizedFeatures } from "@/lib/types/pipeline";

/** Analysis row shape used for sellability and data-quality gating (admin, SEO, sitemap). */
export type AnalysisCommercialBundle = {
  id: string;
  status: string;
  extractedListing: ExtractedListing | null;
  featureSnapshot: FeatureSnapshot | null;
  scoreSnapshot: ScoreSnapshot | null;
};

function hasAreaPriceBaselineFromSnapshot(
  scoreSnapshot: ScoreSnapshot | null,
  scoreExplain: Record<string, unknown> | null,
): boolean {
  const avm = scoreExplain?.avm as { mid?: number } | undefined;
  return (
    (scoreSnapshot?.avmMid != null && scoreSnapshot.avmMid > 0) ||
    (typeof avm?.mid === "number" && avm.mid > 0)
  );
}

/**
 * Resolves listing price in EUR, matching `/report/[id]` heuristics (pipe features → RON → raw).
 */
export function resolveActualPriceEur(
  extracted: ExtractedListing | null,
  f: NormalizedFeatures | null,
): number | null {
  const isRon = String(extracted?.currency ?? "").toUpperCase() === "RON";
  const ronToEurRate = Number(
    process.env.EURRON_RATE ?? process.env.EXCHANGE_RATE_EUR_TO_RON ?? 4.95,
  );
  const priceEurConverted =
    isRon && extracted?.price && Number.isFinite(extracted.price)
      ? Math.round((extracted.price as number) / ronToEurRate)
      : null;
  const asRecord = f as Record<string, unknown> | null;
  const v =
    f?.priceEur ??
    (asRecord?.price_eur as number | undefined) ??
    priceEurConverted ??
    (extracted?.price as number | undefined) ??
    null;
  return v != null && Number.isFinite(v) && v > 0 ? v : null;
}

export function computeReportSellabilityFromBundle(
  analysis: AnalysisCommercialBundle,
  compCount: number,
): ReportSellabilityResult {
  const extracted = analysis.extractedListing;
  const f = (analysis.featureSnapshot?.features ?? null) as NormalizedFeatures | null;
  const scoreExplain = analysis.scoreSnapshot?.explain as Record<string, unknown> | null;
  const confidenceData = scoreExplain?.confidence as { level: string; score: number } | undefined;
  const actualPrice = resolveActualPriceEur(extracted, f);
  const hasArea =
    (extracted?.areaM2 ?? f?.areaM2) != null && Number(extracted?.areaM2 ?? f?.areaM2) > 0;
  const hasBaseline = hasAreaPriceBaselineFromSnapshot(
    analysis.scoreSnapshot,
    scoreExplain,
  );
  return buildReportSellability({
    hasListingPrice: actualPrice != null,
    hasListingArea: hasArea,
    compCount,
    hasAreaPriceBaseline: hasBaseline,
    confidenceLevel: confidenceData?.level,
  });
}

/**
 * `buildReportDataQualityGate` for a stored analysis (same inputs as the live report where possible without recomputing comps).
 */
export function computeReportDataQualityGateFromBundle(
  analysis: AnalysisCommercialBundle,
  compCount: number,
) {
  const extracted = analysis.extractedListing;
  const f = ((analysis.featureSnapshot?.features ?? {}) as NormalizedFeatures) ?? ({} as NormalizedFeatures);
  const scoreExplain = analysis.scoreSnapshot?.explain as Record<string, unknown> | null;
  const oldestCompDays =
    typeof (scoreExplain?.comps as { oldestCompDays?: number } | undefined)?.oldestCompDays ===
    "number"
      ? (scoreExplain?.comps as { oldestCompDays: number }).oldestCompDays
      : null;
  const seismicExplain = scoreExplain?.seismic as Record<string, unknown> | undefined;
  const riskStackExplain = scoreExplain?.riskStack as Record<string, unknown> | undefined;
  const riskStack = applyReportRiskVisibility(
    normalizeRiskStack(riskStackExplain ?? null, seismicExplain ?? null),
  );
  const actualPrice = resolveActualPriceEur(extracted, f);
  const hasArea =
    (extracted?.areaM2 ?? f?.areaM2) != null && Number(extracted?.areaM2 ?? f?.areaM2) > 0;
  const rawRooms = (extracted?.rooms ?? f?.rooms ?? null) as number | null;
  const saneRooms = sanitizeRooms(rawRooms, (extracted?.title as string) ?? null);
  const hasBaseline = hasAreaPriceBaselineFromSnapshot(
    analysis.scoreSnapshot,
    scoreExplain,
  );
  return buildReportDataQualityGate({
    features: f,
    compCount,
    oldestCompDays,
    hasPrice: actualPrice != null,
    hasArea,
    hasRooms: saneRooms != null,
    hasYearBuilt: !!(extracted?.yearBuilt ?? f?.yearBuilt),
    hasAreaPriceBaseline: hasBaseline,
    yieldGross: analysis.scoreSnapshot?.yieldGross ?? null,
    yieldNet: analysis.scoreSnapshot?.yieldNet ?? null,
    riskStack,
  });
}

export function shouldLinkAdminDataQuality(
  sell: ReportSellabilityResult,
  reportQuality: ReportDataQuality,
): boolean {
  if (sell.sellability === "weak" || sell.sellability === "do_not_sell") return true;
  if (reportQuality === "insufficient" || reportQuality === "weak") return true;
  return false;
}

/** `/report/[id]` is only indexable for done + strong/okay; demo id uses `/raport-exemplu` as canonical, so the `/report/…` URL stays noindex. */
export function isReportPathIndexableBySignals(
  analysis: AnalysisCommercialBundle,
  _compCount: number,
  sell: ReportSellabilityResult,
): boolean {
  if (analysis.id === PUBLIC_SAMPLE_REPORT_ANALYSIS_ID) {
    return false;
  }
  const terminalBad = [
    "error",
    "failed",
    "rejected_rental",
    "rejected_not_realestate",
  ];
  if (terminalBad.includes(analysis.status ?? "")) {
    return false;
  }
  if (analysis.status !== "done") {
    return false;
  }
  return sell.sellability === "strong" || sell.sellability === "okay";
}
