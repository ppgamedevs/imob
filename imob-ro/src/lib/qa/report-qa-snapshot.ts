import { reasonFromAnalysisRecord } from "@/lib/analyze/analyze-failure-reasons";
import { SUPPORTED_LISTING_DOMAINS_RO } from "@/lib/analyze/analyze-failure-reasons";
import { prisma } from "@/lib/db";
import {
  computeReportSellabilityFromBundle,
  resolveActualPriceEur,
  type AnalysisCommercialBundle,
} from "@/lib/report/report-commercial-signals";
import { sanitizeRooms } from "@/lib/property-type";
import type { NormalizedFeatures } from "@/lib/types/pipeline";

export type ReportQaSnapshot = {
  portal: string;
  sourceHost: string;
  analysisId: string;
  reportUrl: string;
  status: string;
  extractedTitle: string | null;
  price: string;
  area: string;
  rooms: string;
  location: string;
  photoCount: number;
  compCount: number;
  confidenceLevel: string | null;
  sellability: string;
  paywallShown: boolean;
  failureReason: string | null;
};

function portalLabel(host: string): string {
  const h = host.replace(/^www\./, "").toLowerCase();
  const hit = SUPPORTED_LISTING_DOMAINS_RO.find((d) => h === d || h.endsWith(`.${d}`));
  return hit ?? h;
}

function photoCountFromExtracted(photos: unknown): number {
  if (photos == null) return 0;
  if (Array.isArray(photos)) return photos.length;
  if (typeof photos === "object" && "length" in (photos as object)) {
    const n = (photos as { length: number }).length;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return 0;
}

/**
 * One row of QA metrics for an analysis, using the same sellability path as the product
 * (`buildReportSellability` via `computeReportSellabilityFromBundle`). Does not alter data.
 */
export async function getReportQaSnapshot(
  analysisId: string,
  siteBase: string = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000",
): Promise<ReportQaSnapshot | null> {
  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: { extractedListing: true, featureSnapshot: true, scoreSnapshot: true },
  });
  if (!analysis) return null;

  const bundle = analysis as AnalysisCommercialBundle;
  const compCount = await prisma.compMatch.count({ where: { analysisId } });
  const sell = computeReportSellabilityFromBundle(bundle, compCount);
  const ex = analysis.extractedListing;
  const f = (bundle.featureSnapshot?.features ?? null) as NormalizedFeatures | null;
  const priceEur = resolveActualPriceEur(ex, f);
  const scoreExplain = analysis.scoreSnapshot?.explain as Record<string, unknown> | null;
  const conf = scoreExplain?.confidence as { level?: string } | undefined;
  const saneRooms = sanitizeRooms(
    (ex?.rooms ?? f?.rooms ?? null) as number | null,
    (ex?.title as string) ?? null,
  );

  const base = siteBase.replace(/\/$/, "");
  const fail =
    analysis.status === "done"
      ? null
      : reasonFromAnalysisRecord({ status: analysis.status, error: analysis.error });
  const sourceHost = (() => {
    try {
      return new URL(analysis.sourceUrl).hostname;
    } catch {
      return "";
    }
  })();

  return {
    portal: portalLabel(sourceHost),
    sourceHost,
    analysisId: analysis.id,
    reportUrl: `${base}/report/${analysis.id}`,
    status: analysis.status,
    extractedTitle: ex?.title ?? null,
    price: priceEur != null ? `${priceEur} EUR` : "—",
    area:
      ex?.areaM2 != null || f?.areaM2 != null
        ? `${(ex?.areaM2 ?? f?.areaM2) as number} mp`
        : "—",
    rooms: saneRooms != null ? String(saneRooms) : "—",
    location: (ex?.addressRaw as string | undefined) ?? f?.addressRaw ?? "—",
    photoCount: photoCountFromExtracted(ex?.photos),
    compCount,
    confidenceLevel: conf?.level ?? null,
    sellability: sell.sellability,
    paywallShown: sell.canShowPaywall,
    failureReason: fail,
  };
}

/**
 * Latest N analyses with QA snapshots (newest first).
 */
export async function getRecentReportQaSnapshots(
  take: number,
  siteBase?: string,
): Promise<ReportQaSnapshot[]> {
  const rows = await prisma.analysis.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(take, 1), 100),
    select: { id: true },
  });
  const out: ReportQaSnapshot[] = [];
  for (const r of rows) {
    const s = await getReportQaSnapshot(r.id, siteBase);
    if (s) out.push(s);
  }
  return out;
}
