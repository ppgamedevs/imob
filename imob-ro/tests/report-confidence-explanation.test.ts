import { describe, expect, it } from "vitest";

import { buildReportConfidenceExplanation } from "@/lib/report/report-confidence-explanation";
import type { NormalizedFeatures } from "@/lib/types/pipeline";

function baseFeatures(overrides: Partial<NormalizedFeatures> = {}): NormalizedFeatures {
  return {
    lat: 44.44,
    lng: 26.1,
    areaSlug: "sector-1",
    areaM2: 60,
    rooms: 2,
    level: 3,
    yearBuilt: 1985,
    ...overrides,
  };
}

describe("buildReportConfidenceExplanation", () => {
  it("cannot return high when compCount < 3", () => {
    const r = buildReportConfidenceExplanation({
      features: baseFeatures(),
      compCount: 2,
      hasListingPrice: true,
      hasListingArea: true,
      hasListingRooms: true,
      hasFloor: true,
      hasYearBuilt: true,
    });
    expect(r.level).not.toBe("high");
  });

  it("caps high to medium when geocoding is area-only", () => {
    const r = buildReportConfidenceExplanation({
      features: baseFeatures({ lat: null, lng: null, areaSlug: "sector-2" }),
      compCount: 10,
      hasListingPrice: true,
      hasListingArea: true,
      hasListingRooms: true,
      hasFloor: true,
      hasYearBuilt: true,
    });
    expect(r.level).toBe("medium");
  });

  it("lists missing year in missingDataRo", () => {
    const r = buildReportConfidenceExplanation({
      features: baseFeatures({ yearBuilt: null }),
      compCount: 8,
      hasListingPrice: true,
      hasListingArea: true,
      hasListingRooms: true,
      hasFloor: true,
      hasYearBuilt: false,
    });
    expect(r.missingDataRo.some((s) => /Anul construcției/i.test(s))).toBe(true);
  });

  it("sets shouldSuppressStrongVerdict when price missing", () => {
    const r = buildReportConfidenceExplanation({
      features: baseFeatures(),
      compCount: 8,
      hasListingPrice: false,
      hasListingArea: true,
      hasListingRooms: true,
      hasFloor: true,
      hasYearBuilt: true,
    });
    expect(r.shouldSuppressStrongVerdict).toBe(true);
  });

  it("uses stricter of pipeline level when provided", () => {
    const r = buildReportConfidenceExplanation({
      features: baseFeatures(),
      compCount: 10,
      pipelineConfidenceLevel: "low",
      hasListingPrice: true,
      hasListingArea: true,
      hasListingRooms: true,
      hasFloor: true,
      hasYearBuilt: true,
    });
    expect(r.level).toBe("low");
  });

  it("exposes Romanian labels", () => {
    const r = buildReportConfidenceExplanation({
      features: baseFeatures(),
      compCount: 1,
      hasListingPrice: true,
      hasListingArea: true,
      hasListingRooms: true,
      hasFloor: true,
      hasYearBuilt: true,
    });
    expect(["Încredere ridicată", "Încredere medie", "Încredere redusă"]).toContain(r.labelRo);
  });
});
