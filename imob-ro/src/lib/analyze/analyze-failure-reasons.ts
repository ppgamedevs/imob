/**
 * Machine codes for /api/analyze validation failures and for Analysis.error after async steps.
 * Used by UI and funnel metadata; keep stable.
 */
export const ANALYZE_FAILURE_REASONS = [
  "unsupported_domain",
  "search_listing_index",
  "rental_not_sale",
  "non_residential",
  "olx_non_realestate",
  "invalid_url",
  "extraction_failed",
  "missing_price",
  "missing_area",
  "fetch_timeout_blocked",
  "pipeline_error",
] as const;

export type AnalyzeFailureReason = (typeof ANALYZE_FAILURE_REASONS)[number];

export const SUPPORTED_LISTING_DOMAINS_RO = [
  "imobiliare.ro",
  "storia.ro",
  "olx.ro",
  "publi24.ro",
  "lajumate.ro",
  "homezz.ro",
] as const;

export function isAnalyzeFailureReason(s: string): s is AnalyzeFailureReason {
  return (ANALYZE_FAILURE_REASONS as readonly string[]).includes(s);
}

/** Map legacy Analysis.error or status-only cases to a reason for shared UI. */
export function reasonFromAnalysisRecord(opts: {
  status: string | null | undefined;
  error: string | null | undefined;
}): AnalyzeFailureReason {
  const { status, error } = opts;
  if (error && isAnalyzeFailureReason(error)) return error;
  if (status === "rejected_rental") return "rental_not_sale";
  if (status === "rejected_not_realestate") {
    if (error && isAnalyzeFailureReason(error)) return error;
    return "non_residential";
  }
  if (status === "error") return error && isAnalyzeFailureReason(error) ? error : "extraction_failed";
  if (status === "failed") return error && isAnalyzeFailureReason(error) ? error : "pipeline_error";
  return "extraction_failed";
}
