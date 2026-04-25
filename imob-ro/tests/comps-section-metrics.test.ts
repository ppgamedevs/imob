import { describe, expect, it } from "vitest";

import {
  isSafeHttpUrl,
  medianEurM2FromCompRows,
  pctAskingEurM2VsMedian,
  roHeadlineCompsFound,
  roPriceM2VsCompMedian,
} from "@/lib/report/comps-section-metrics";

describe("comps-section-metrics", () => {
  it("medianEurM2FromCompRows", () => {
    expect(medianEurM2FromCompRows([2000, 3000, 4000])).toBe(3000);
    expect(medianEurM2FromCompRows([])).toBe(null);
  });

  it("pctAskingEurM2VsMedian", () => {
    expect(pctAskingEurM2VsMedian(2800, 2500)).toBe(12);
  });

  it("roHeadlineCompsFound", () => {
    expect(roHeadlineCompsFound(0)).toBe("");
    expect(roHeadlineCompsFound(1)).toContain("1 anunț");
    expect(roHeadlineCompsFound(8)).toContain("8 anunțuri");
  });

  it("roPriceM2VsCompMedian", () => {
    expect(roPriceM2VsCompMedian(12, true)).toMatch(/peste/);
    expect(roPriceM2VsCompMedian(-5, true)).toMatch(/sub/);
  });

  it("isSafeHttpUrl", () => {
    expect(isSafeHttpUrl("https://example.com/x")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl(null)).toBe(false);
  });
});
