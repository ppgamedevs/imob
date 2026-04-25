import { describe, expect, it } from "vitest";

import { buildReportDataQualityGate } from "@/lib/report/data-quality-gate";
import { normalizeRiskStack } from "@/lib/risk/executive";
import type { NormalizedFeatures } from "@/lib/types/pipeline";
import type { RiskStackResult } from "@/lib/risk/types";

function features(overrides: Partial<NormalizedFeatures> = {}): NormalizedFeatures {
  return {
    lat: 44.44,
    lng: 26.1,
    areaSlug: "sector-1",
    areaM2: 60,
    rooms: 2,
    level: 3,
    yearBuilt: 1985,
    ...overrides,
  } as NormalizedFeatures;
}

function defaultStack(): RiskStackResult {
  return normalizeRiskStack(null, { riskClass: "RsIV" });
}

describe("buildReportDataQualityGate", () => {
  it("rule 1: no price => insufficient, no price verdict", () => {
    const g = buildReportDataQualityGate({
      features: features(),
      compCount: 5,
      hasPrice: false,
      hasArea: true,
      hasRooms: true,
      hasYearBuilt: true,
      hasAreaPriceBaseline: true,
      yieldGross: 0.05,
      yieldNet: 0.04,
      riskStack: defaultStack(),
    });
    expect(g.reportQuality).toBe("insufficient");
    expect(g.canShowPriceVerdict).toBe(false);
  });

  it("rule 2+3: missing area/rooms caps quality below strong", () => {
    const g1 = buildReportDataQualityGate({
      features: features(),
      compCount: 5,
      hasPrice: true,
      hasArea: false,
      hasRooms: true,
      hasYearBuilt: true,
      hasAreaPriceBaseline: true,
      yieldGross: 0.05,
      yieldNet: 0.04,
      riskStack: defaultStack(),
    });
    expect(g1.reportQuality).not.toBe("strong");

    const g2 = buildReportDataQualityGate({
      features: features(),
      compCount: 5,
      hasPrice: true,
      hasArea: true,
      hasRooms: false,
      hasYearBuilt: true,
      hasAreaPriceBaseline: true,
      yieldGross: 0.05,
      yieldNet: 0.04,
      riskStack: defaultStack(),
    });
    expect(g2.reportQuality).not.toBe("strong");
  });

  it("rule 4: no comps and no area baseline => no price verdict", () => {
    const g = buildReportDataQualityGate({
      features: features(),
      compCount: 0,
      hasPrice: true,
      hasArea: true,
      hasRooms: true,
      hasYearBuilt: true,
      hasAreaPriceBaseline: false,
      yieldGross: 0.05,
      yieldNet: 0.04,
      riskStack: defaultStack(),
    });
    expect(g.canShowPriceVerdict).toBe(false);
  });

  it("rule 4: with baseline, price verdict allowed even with zero comps", () => {
    const g = buildReportDataQualityGate({
      features: features(),
      compCount: 0,
      hasPrice: true,
      hasArea: true,
      hasRooms: true,
      hasYearBuilt: true,
      hasAreaPriceBaseline: true,
      yieldGross: 0.05,
      yieldNet: 0.04,
      riskStack: defaultStack(),
    });
    expect(g.canShowPriceVerdict).toBe(true);
  });

  it("rule 5: fewer than 3 comps => no strong price position language", () => {
    const g = buildReportDataQualityGate({
      features: features(),
      compCount: 2,
      hasPrice: true,
      hasArea: true,
      hasRooms: true,
      hasYearBuilt: true,
      hasAreaPriceBaseline: true,
      yieldGross: 0.05,
      yieldNet: 0.04,
      riskStack: defaultStack(),
    });
    expect(g.canShowStrongPricePositionLanguage).toBe(false);
  });

  it("rule 6: weak location suppresses neighborhood/risk claims", () => {
    const g = buildReportDataQualityGate({
      features: features({ lat: null, lng: null, areaSlug: null }),
      compCount: 5,
      hasPrice: true,
      hasArea: true,
      hasRooms: true,
      hasYearBuilt: true,
      hasAreaPriceBaseline: true,
      yieldGross: 0.05,
      yieldNet: 0.04,
      riskStack: defaultStack(),
    });
    expect(g.canShowNeighborhoodRiskClaims).toBe(false);
  });

  it("rule 7: missing year => showYearBuiltWarning", () => {
    const g = buildReportDataQualityGate({
      features: features(),
      compCount: 5,
      hasPrice: true,
      hasArea: true,
      hasRooms: true,
      hasYearBuilt: false,
      hasAreaPriceBaseline: true,
      yieldGross: 0.05,
      yieldNet: 0.04,
      riskStack: defaultStack(),
    });
    expect(g.showYearBuiltWarning).toBe(true);
  });

  it("rule 8: both pollution and traffic are placeholder unknown => insufficient contextual data", () => {
    const ph = (key: "pollution" | "traffic") => ({
      key,
      level: "unknown" as const,
      score: null,
      confidence: null,
      summary:
        "Date indisponibile momentan. Stratul este pregatit, dar dataset-ul nu este integrat inca.",
      details: [] as string[],
      sourceName: "Dataset neintegrat momentan",
      sourceUrl: null,
      updatedAt: null,
    });
    const base = defaultStack();
    const stack: RiskStackResult = {
      ...base,
      layers: {
        ...base.layers,
        pollution: ph("pollution"),
        traffic: ph("traffic"),
      },
    };
    const g = buildReportDataQualityGate({
      features: features(),
      compCount: 5,
      hasPrice: true,
      hasArea: true,
      hasRooms: true,
      hasYearBuilt: true,
      hasAreaPriceBaseline: true,
      yieldGross: 0.05,
      yieldNet: 0.04,
      riskStack: stack,
    });
    expect(g.contextualRiskDataInsufficient).toBe(true);
  });

  it("rule 9: yield needs gross+net; missing net => canShowYield false", () => {
    const g = buildReportDataQualityGate({
      features: features(),
      compCount: 5,
      hasPrice: true,
      hasArea: true,
      hasRooms: true,
      hasYearBuilt: true,
      hasAreaPriceBaseline: true,
      yieldGross: 0.05,
      yieldNet: null,
      riskStack: defaultStack(),
    });
    expect(g.canShowYield).toBe(false);
  });
});
