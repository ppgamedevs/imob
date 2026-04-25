import { describe, expect, it } from "vitest";

import {
  buildReportUnlockStripeMetadata,
  isReportUnlockCheckoutSessionForAnalysis,
  isReportUnlockStripeMetadata,
} from "@/lib/billing/report-unlock-stripe-metadata";

describe("report unlock Stripe metadata", () => {
  it("builds kind, reportUnlockId, analysisId, and userId when logged in", () => {
    const m = buildReportUnlockStripeMetadata({
      reportUnlockId: "r1",
      analysisId: "a1",
      userId: "u1",
    });
    expect(m).toEqual({
      kind: "report_unlock",
      reportUnlockId: "r1",
      analysisId: "a1",
      userId: "u1",
    });
  });

  it("omits userId for guests", () => {
    const m = buildReportUnlockStripeMetadata({
      reportUnlockId: "r1",
      analysisId: "a1",
      userId: null,
    });
    expect(m).toEqual({
      kind: "report_unlock",
      reportUnlockId: "r1",
      analysisId: "a1",
    });
    expect(m.userId).toBeUndefined();
  });

  it("isReportUnlockStripeMetadata accepts kind and legacy product", () => {
    expect(isReportUnlockStripeMetadata({ kind: "report_unlock" })).toBe(true);
    expect(isReportUnlockStripeMetadata({ product: "report_unlock" })).toBe(true);
    expect(isReportUnlockStripeMetadata({ kind: "other" })).toBe(false);
  });

  it("isReportUnlockCheckoutSessionForAnalysis requires kind/product and matching analysisId", () => {
    expect(
      isReportUnlockCheckoutSessionForAnalysis(
        { kind: "report_unlock", analysisId: "x" },
        "x",
      ),
    ).toBe(true);
    expect(
      isReportUnlockCheckoutSessionForAnalysis(
        { kind: "report_unlock", analysisId: "x" },
        "y",
      ),
    ).toBe(false);
  });
});
