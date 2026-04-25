import { prisma } from "@/lib/db";
import {
  computeReportSellabilityFromBundle,
  isReportPathIndexableBySignals,
  type AnalysisCommercialBundle,
} from "@/lib/report/report-commercial-signals";
import { buildReportSellability } from "@/lib/report/report-sellability";

/**
 * Index `/report/[id]` only for terminal success and commercial sellability (strong | okay).
 * Public sample id is not indexed at this path (canonical `/raport-exemplu`). See `buildReportSellability`.
 */
export async function getReportPageIndexable(
  analysisId: string,
): Promise<{
  indexable: boolean;
  sellability: ReturnType<typeof buildReportSellability>["sellability"] | null;
}> {
  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: { extractedListing: true, featureSnapshot: true, scoreSnapshot: true },
  });

  if (!analysis) {
    return { indexable: false, sellability: null };
  }

  const bundle = analysis as AnalysisCommercialBundle;
  const compCount = await prisma.compMatch.count({ where: { analysisId } });
  const sell = computeReportSellabilityFromBundle(bundle, compCount);
  const indexable = isReportPathIndexableBySignals(bundle, compCount, sell);
  return { indexable, sellability: sell.sellability };
}

/**
 * Report URLs for sitemap: `done` analyses with strong/okay sellability, excluding the public demo id
 * (listed under `/raport-exemplu`).
 */
export async function getIndexableDoneReportIdsForSitemap(limit: number): Promise<string[]> {
  const cap = Math.min(Math.max(limit, 1), 8000);
  const analyses = await prisma.analysis.findMany({
    where: { status: "done" },
    orderBy: { updatedAt: "desc" },
    take: cap,
    include: { extractedListing: true, featureSnapshot: true, scoreSnapshot: true },
  });
  if (analyses.length === 0) return [];
  const ids = analyses.map((a) => a.id);
  const groups = await prisma.compMatch.groupBy({
    by: ["analysisId"],
    where: { analysisId: { in: ids } },
    _count: { _all: true },
  });
  const compMap = new Map(groups.map((g) => [g.analysisId, g._count._all]));
  const out: string[] = [];
  for (const a of analyses) {
    const bundle = a as AnalysisCommercialBundle;
    const compCount = compMap.get(a.id) ?? 0;
    const sell = computeReportSellabilityFromBundle(bundle, compCount);
    if (isReportPathIndexableBySignals(bundle, compCount, sell)) {
      out.push(a.id);
    }
  }
  return out;
}
