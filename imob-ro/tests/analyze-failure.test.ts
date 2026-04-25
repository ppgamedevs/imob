import { describe, expect, it } from "vitest";

import { checkListingUrl } from "@/lib/analyze/check-listing-url";
import { reasonFromAnalysisRecord } from "@/lib/analyze/analyze-failure-reasons";

describe("checkListingUrl", () => {
  it("rejects unsupported domain", () => {
    const r = checkListingUrl("https://example.com/listing/1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("unsupported_domain");
  });

  it("accepts imobiliare oferta path", () => {
    const r = checkListingUrl("https://www.imobiliare.ro/oferta/apartament-de-vanzare-x-123456");
    expect(r.ok).toBe(true);
  });

  it("rejects imobiliare search-style path", () => {
    const r = checkListingUrl("https://www.imobiliare.ro/vanzare-apartamente/bucuresti/sector-3");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("search_listing_index");
  });

  it("rejects rental path on imobiliare", () => {
    const r = checkListingUrl("https://www.imobiliare.ro/inchirieri/bucuresti/apartament.html");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("rental_not_sale");
  });

  it("normalizes m.publi24 to publi24 for support check", () => {
    const r = checkListingUrl("https://m.publi24.ro/anunt/123");
    expect(r.ok).toBe(true);
  });
});

describe("reasonFromAnalysisRecord", () => {
  it("maps stored error codes", () => {
    expect(
      reasonFromAnalysisRecord({ status: "error", error: "fetch_timeout_blocked" }),
    ).toBe("fetch_timeout_blocked");
    expect(reasonFromAnalysisRecord({ status: "failed", error: "missing_price" })).toBe("missing_price");
  });

  it("maps status-only rejected rental", () => {
    expect(reasonFromAnalysisRecord({ status: "rejected_rental", error: null })).toBe("rental_not_sale");
  });

  it("prefers analysis.error for rejected_not_realestate", () => {
    expect(
      reasonFromAnalysisRecord({ status: "rejected_not_realestate", error: "olx_non_realestate" }),
    ).toBe("olx_non_realestate");
  });
});
