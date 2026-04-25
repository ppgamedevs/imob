import { describe, expect, it } from "vitest";

import { buildReportSellability } from "@/lib/report/report-sellability";

function base(overrides: Partial<Parameters<typeof buildReportSellability>[0]> = {}) {
  return {
    hasListingPrice: true,
    hasListingArea: true,
    compCount: 3,
    hasAreaPriceBaseline: true,
    confidenceLevel: "high" as const,
    ...overrides,
  };
}

describe("buildReportSellability", () => {
  it("rule: missing price or area → do_not_sell, no paywall", () => {
    const r1 = buildReportSellability(
      base({ hasListingPrice: false, hasListingArea: true, compCount: 5, confidenceLevel: "high" }),
    );
    expect(r1.sellability).toBe("do_not_sell");
    expect(r1.canShowPaywall).toBe(false);
    expect(r1.paywallBlockMessageRo).toMatch(/Nu avem suficiente date/);
    const r2 = buildReportSellability(
      base({ hasListingPrice: true, hasListingArea: false, compCount: 5, confidenceLevel: "high" }),
    );
    expect(r2.sellability).toBe("do_not_sell");
    expect(r2.canShowPaywall).toBe(false);
  });

  it("rule: no comps and no baseline → do_not_sell", () => {
    const r = buildReportSellability(
      base({ compCount: 0, hasAreaPriceBaseline: false, confidenceLevel: "high" }),
    );
    expect(r.sellability).toBe("do_not_sell");
    expect(r.canShowPaywall).toBe(false);
  });

  it("rule: medium/high and ≥3 comps → strong, paywall on", () => {
    const r = buildReportSellability(base({ compCount: 3, confidenceLevel: "medium" }));
    expect(r.sellability).toBe("strong");
    expect(r.canShowPaywall).toBe(true);
    expect(r.shouldShowRefundFriendlyCopy).toBe(false);
  });

  it("rule: medium with 1–2 comps → okay, refund-friendly", () => {
    const a = buildReportSellability(
      base({ compCount: 1, confidenceLevel: "medium", hasAreaPriceBaseline: true }),
    );
    const b = buildReportSellability(
      base({ compCount: 2, confidenceLevel: "high", hasAreaPriceBaseline: true }),
    );
    expect(a.sellability).toBe("okay");
    expect(b.sellability).toBe("okay");
    expect(a.canShowPaywall).toBe(true);
    expect(a.shouldShowRefundFriendlyCopy).toBe(true);
  });

  it("rule: enough baseline but 0 comps and medium+ → okay", () => {
    const r = buildReportSellability(
      base({ compCount: 0, hasAreaPriceBaseline: true, confidenceLevel: "medium" }),
    );
    expect(r.sellability).toBe("okay");
    expect(r.canShowPaywall).toBe(true);
    expect(r.shouldShowRefundFriendlyCopy).toBe(true);
  });

  it("rule: low + 0 comps + baseline only → weak", () => {
    const r = buildReportSellability(
      base({ compCount: 0, hasAreaPriceBaseline: true, confidenceLevel: "low" }),
    );
    expect(r.sellability).toBe("weak");
    expect(r.canShowPaywall).toBe(false);
    expect(r.paywallBlockMessageRo).toMatch(/încrederea/);
  });

  it("rule: low with ≥1 comp → weak", () => {
    const r = buildReportSellability(
      base({ compCount: 2, hasAreaPriceBaseline: true, confidenceLevel: "low" }),
    );
    expect(r.sellability).toBe("weak");
    expect(r.canShowPaywall).toBe(false);
  });

  it("unknown confidence is treated as low for tiering", () => {
    const r = buildReportSellability(
      base({ compCount: 4, confidenceLevel: null, hasAreaPriceBaseline: true }),
    );
    expect(r.sellability).toBe("weak");
    expect(r.canShowPaywall).toBe(false);
  });
});
