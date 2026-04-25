import { describe, expect, it } from "vitest";

import { buildNegotiationAssistant } from "@/lib/report/negotiation-assistant";

describe("buildNegotiationAssistant", () => {
  it("returns low confidence strategy when comps are few", () => {
    const b = buildNegotiationAssistant({
      title: "Test",
      overpricingPct: 15,
      confidenceLevel: "high",
      compsCount: 1,
      canShowStrongPricePosition: true,
      canShowSubstantiveNegotiation: true,
      hasYearBuilt: true,
      seismicRiskClass: "RsIV",
      isRender: false,
      isUnderConstruction: false,
      points: [],
    });
    expect(b.strategy.kind).toBe("low_confidence");
  });

  it("suggests risk focus when seismic class is high", () => {
    const b = buildNegotiationAssistant({
      title: null,
      overpricingPct: 0,
      confidenceLevel: "high",
      compsCount: 5,
      canShowStrongPricePosition: true,
      canShowSubstantiveNegotiation: true,
      hasYearBuilt: true,
      seismicRiskClass: "RS2",
      isRender: false,
      isUnderConstruction: false,
      points: [],
    });
    expect(b.strategy.kind).toBe("risk_focus");
  });

  it("allowNumericOfferHint only when high confidence and enough comps", () => {
    const ok = buildNegotiationAssistant({
      title: null,
      overpricingPct: 5,
      confidenceLevel: "high",
      compsCount: 5,
      canShowStrongPricePosition: true,
      canShowSubstantiveNegotiation: true,
      hasYearBuilt: true,
      seismicRiskClass: "RsIV",
      isRender: false,
      isUnderConstruction: false,
      points: [],
    });
    expect(ok.allowNumericOfferHint).toBe(true);

    const bad = buildNegotiationAssistant({
      title: null,
      overpricingPct: 5,
      confidenceLevel: "medium",
      compsCount: 5,
      canShowStrongPricePosition: true,
      canShowSubstantiveNegotiation: true,
      hasYearBuilt: true,
      seismicRiskClass: "RsIV",
      isRender: false,
      isUnderConstruction: false,
      points: [],
    });
    expect(bad.allowNumericOfferHint).toBe(false);
  });

  it("includes suggestedMessageRo with greeting", () => {
    const b = buildNegotiationAssistant({
      title: "Garsonieră Floreasca",
      overpricingPct: null,
      confidenceLevel: "low",
      compsCount: 0,
      canShowStrongPricePosition: false,
      canShowSubstantiveNegotiation: false,
      hasYearBuilt: false,
      seismicRiskClass: null,
      isRender: true,
      isUnderConstruction: false,
      points: [],
    });
    expect(b.suggestedMessageRo).toMatch(/Bună ziua/i);
    expect(b.suggestedMessageRo).toMatch(/randări 3D/i);
  });
});
