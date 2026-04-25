/** Stable id for the public demonstrative full report (seeded, not a real listing). */
export const PUBLIC_SAMPLE_REPORT_ANALYSIS_ID = "cmibexemplurap0001publicdemo";

/**
 * Fictive source URL. Not a live listing. Used only to mark this row in the database.
 * Do not scrape this URL in production.
 */
export const PUBLIC_SAMPLE_SOURCE_URL = "https://exemplu.imobintel.ro/raport-demonstrativ";

export const RAPORT_EXEMPLU_PATH = "/raport-exemplu" as const;

export function isPublicSampleReportView(
  analysisId: string,
  exempluSearchParam: string | string[] | undefined,
): boolean {
  const p = Array.isArray(exempluSearchParam) ? exempluSearchParam[0] : exempluSearchParam;
  if (p !== "1" && p !== "true") return false;
  return analysisId === PUBLIC_SAMPLE_REPORT_ANALYSIS_ID;
}
