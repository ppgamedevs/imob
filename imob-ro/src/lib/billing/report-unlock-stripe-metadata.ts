/**
 * Stripe Checkout Session + PaymentIntent metadata for one-time report unlocks.
 * Webhook fulfillment uses `reportUnlockId` and verifies `analysisId` when present.
 */
export const REPORT_UNLOCK_STRIPE_KIND = "report_unlock" as const;

type StripeLikeMeta = Record<string, string | undefined> | null | undefined;

export function buildReportUnlockStripeMetadata(opts: {
  reportUnlockId: string;
  analysisId: string;
  userId: string | null;
}): Record<string, string> {
  const m: Record<string, string> = {
    kind: REPORT_UNLOCK_STRIPE_KIND,
    reportUnlockId: opts.reportUnlockId,
    analysisId: opts.analysisId,
  };
  if (opts.userId) m.userId = opts.userId;
  return m;
}

/** Recognizes report-unlock checkouts. Accepts `kind` (current) or legacy `product` key. */
export function isReportUnlockStripeMetadata(meta: StripeLikeMeta): boolean {
  if (!meta) return false;
  return (
    meta.kind === REPORT_UNLOCK_STRIPE_KIND ||
    meta.product === REPORT_UNLOCK_STRIPE_KIND
  );
}

/** Success redirect: session must be a report unlock and `analysisId` must match the URL. */
export function isReportUnlockCheckoutSessionForAnalysis(
  meta: StripeLikeMeta,
  urlAnalysisId: string,
): boolean {
  if (!isReportUnlockStripeMetadata(meta) || !meta?.analysisId) return false;
  return meta.analysisId === urlAnalysisId;
}
