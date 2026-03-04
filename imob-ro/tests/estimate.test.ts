import { describe, expect, it } from "vitest";

import { computeConfidence, computeConfidenceWhy, inputCompleteness } from "@/lib/estimate/confidence";
import { computeSpreadRanges } from "@/lib/estimate/priceRange";
import { scoreAndClassify, type RawComp } from "@/lib/estimate/findComparables";
import { computeAdjustments, totalAdjustmentPct } from "@/lib/estimate/adjustments";
import { computeTightenTips } from "@/lib/estimate/liquidity";
import { computeSimilarityScore } from "@/lib/estimate/similarity";
import { computeRecommendations } from "@/lib/estimate/recommendations";
import { computeRisks } from "@/lib/estimate/risks";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeComp(overrides: Partial<RawComp> = {}): RawComp {
  return {
    id: "test-1",
    sourceUrl: null,
    priceEur: 80_000,
    areaM2: 55,
    eurM2: 1455,
    rooms: 2,
    yearBuilt: 1985,
    lat: 44.43,
    lng: 26.1,
    distanceM: 300,
    source: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeConfidence
// ---------------------------------------------------------------------------

describe("computeConfidence", () => {
  it("returns high confidence with many comps, low dispersion, full completeness", () => {
    const score = computeConfidence(20, 0.05, 1.0, 1.0);
    expect(score).toBeGreaterThanOrEqual(75);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns low confidence with few comps and high dispersion", () => {
    const score = computeConfidence(1, 0.5, 0, 0.3);
    expect(score).toBeLessThan(40);
  });

  it("returns 0 with zero comps and worst inputs", () => {
    const score = computeConfidence(0, 1.0, 0, 0);
    expect(score).toBe(0);
  });

  it("increases with more comps", () => {
    const s3 = computeConfidence(3, 0.15, 0.5, 0.5);
    const s10 = computeConfidence(10, 0.15, 0.5, 0.5);
    const s20 = computeConfidence(20, 0.15, 0.5, 0.5);
    expect(s10).toBeGreaterThan(s3);
    expect(s20).toBeGreaterThan(s10);
  });

  it("decreases with higher dispersion", () => {
    const low = computeConfidence(10, 0.05, 0.8, 0.7);
    const high = computeConfidence(10, 0.4, 0.8, 0.7);
    expect(low).toBeGreaterThan(high);
  });

  it("caps at 100", () => {
    const score = computeConfidence(50, 0.01, 1.0, 1.0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// inputCompleteness
// ---------------------------------------------------------------------------

describe("inputCompleteness", () => {
  it("returns 1.0 when all fields provided", () => {
    const c = inputCompleteness({
      lat: 44.43,
      lng: 26.1,
      yearBuilt: 1985,
      floor: 3,
      hasElevator: true,
      hasParking: false,
      heatingType: "centrala",
      layoutType: "decomandat",
      balconyM2: 6,
      totalFloors: 10,
      isThermoRehab: true,
    });
    expect(c).toBe(1);
  });

  it("returns 0 when nothing provided", () => {
    const c = inputCompleteness({});
    expect(c).toBe(0);
  });

  it("treats 'unknown' heatingType as incomplete", () => {
    const withUnknown = inputCompleteness({ heatingType: "unknown" });
    const withReal = inputCompleteness({ heatingType: "centrala" });
    expect(withReal).toBeGreaterThan(withUnknown);
  });
});

// ---------------------------------------------------------------------------
// computeSpreadRanges — range widening
// ---------------------------------------------------------------------------

describe("computeSpreadRanges", () => {
  const area = 55;
  const medianEurM2 = 1500;

  it("returns tight range80 when confidence high + dispersion low", () => {
    const result = computeSpreadRanges(medianEurM2, area, 0.08, 85, 0);
    const likely = medianEurM2 * area;
    const spread80 = (result.range80.max - result.range80.min) / likely;
    expect(spread80).toBeLessThan(0.15);
  });

  it("widens range80 when confidence < 30", () => {
    const tight = computeSpreadRanges(medianEurM2, area, 0.08, 85, 0);
    const wide = computeSpreadRanges(medianEurM2, area, 0.35, 20, 0);
    const tightSpread = tight.range80.max - tight.range80.min;
    const wideSpread = wide.range80.max - wide.range80.min;
    expect(wideSpread).toBeGreaterThan(tightSpread);
  });

  it("widens further when dispersion > 0.3", () => {
    const normal = computeSpreadRanges(medianEurM2, area, 0.15, 50, 0);
    const highDisp = computeSpreadRanges(medianEurM2, area, 0.4, 50, 0);
    const normalSpread = normal.range80.max - normal.range80.min;
    const highSpread = highDisp.range80.max - highDisp.range80.min;
    expect(highSpread).toBeGreaterThan(normalSpread);
  });

  it("range95 is always wider than range80", () => {
    for (const conf of [10, 30, 50, 75, 90]) {
      const r = computeSpreadRanges(medianEurM2, area, 0.15, conf, 0);
      expect(r.range95.max - r.range95.min).toBeGreaterThan(
        r.range80.max - r.range80.min,
      );
    }
  });

  it("applies adjustments to fairLikely", () => {
    const noAdj = computeSpreadRanges(medianEurM2, area, 0.1, 80, 0);
    const plusAdj = computeSpreadRanges(medianEurM2, area, 0.1, 80, 10);
    expect(plusAdj.fairLikely).toBeGreaterThan(noAdj.fairLikely);
  });

  it("never returns negative prices", () => {
    const r = computeSpreadRanges(500, 20, 0.5, 10, -20);
    expect(r.range95.min).toBeGreaterThanOrEqual(0);
    expect(r.range80.min).toBeGreaterThanOrEqual(0);
    expect(r.fairLikely).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// scoreAndClassify — similarity scoring
// ---------------------------------------------------------------------------

describe("scoreAndClassify", () => {
  it("gives high score to very similar comp", () => {
    const comps = [makeComp({ distanceM: 100, areaM2: 55, rooms: 2, yearBuilt: 1985 })];
    const [scored] = scoreAndClassify(comps, {
      lat: 44.43,
      lng: 26.1,
      areaM2: 55,
      rooms: 2,
      yearBuilt: 1985,
    });
    expect(scored.similarityScore).toBeGreaterThanOrEqual(90);
    expect(scored.matchType).toBe("tight");
  });

  it("penalises distant comps", () => {
    const near = makeComp({ id: "near", distanceM: 200 });
    const far = makeComp({ id: "far", distanceM: 1500 });
    const [first, second] = scoreAndClassify([near, far], {
      areaM2: 55,
      rooms: 2,
    });
    expect(first.id).toBe("near");
    expect(first.similarityScore).toBeGreaterThan(second.similarityScore);
  });

  it("classifies beyond-radius as relaxed", () => {
    const comps = [makeComp({ distanceM: 1200, areaM2: 80 })];
    const [scored] = scoreAndClassify(comps, { areaM2: 55, rooms: 2 });
    expect(scored.matchType).toBe("relaxed");
  });

  it("returns tight comps only when enough exist", () => {
    const tightComps = Array.from({ length: 5 }, (_, i) =>
      makeComp({ id: `t${i}`, distanceM: 300, areaM2: 55, rooms: 2 }),
    );
    const relaxed = makeComp({ id: "r1", distanceM: 1200, areaM2: 80 });
    const scored = scoreAndClassify([...tightComps, relaxed], {
      areaM2: 55,
      rooms: 2,
    });
    expect(scored.every((c) => c.matchType === "tight")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeAdjustments
// ---------------------------------------------------------------------------

describe("computeAdjustments", () => {
  it("returns empty array for neutral input", () => {
    const adj = computeAdjustments({ condition: "locuibil" });
    expect(adj).toEqual([]);
  });

  it("adds positive delta for new construction", () => {
    const adj = computeAdjustments({ condition: "nou" });
    const total = totalAdjustmentPct(adj);
    expect(total).toBeGreaterThan(0);
  });

  it("adds negative delta for needs renovation", () => {
    const adj = computeAdjustments({ condition: "de_renovat" });
    const total = totalAdjustmentPct(adj);
    expect(total).toBeLessThan(0);
  });

  it("stacks multiple adjustments", () => {
    const adj = computeAdjustments({
      condition: "nou",
      hasParking: true,
      heatingType: "centrala",
      floor: 3,
    });
    expect(adj.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// computeTightenTips
// ---------------------------------------------------------------------------

describe("computeTightenTips", () => {
  it("suggests lat/lng when missing", () => {
    const tips = computeTightenTips({ rooms: 2, usableAreaM2: 55 }, 10);
    expect(tips.some((t) => t.field === "lat/lng")).toBe(true);
  });

  it("suggests more fields when few comps", () => {
    const tips = computeTightenTips({ rooms: 2, usableAreaM2: 55 }, 2);
    expect(tips.length).toBeGreaterThanOrEqual(2);
  });

  it("returns no lat/lng tip when coordinates present", () => {
    const tips = computeTightenTips(
      { rooms: 2, usableAreaM2: 55, lat: 44.43, lng: 26.1, yearBuilt: 1985, floor: 3 },
      20,
    );
    const latTip = tips.find((t) => t.field === "lat/lng");
    expect(latTip).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// computeConfidenceWhy
// ---------------------------------------------------------------------------

describe("computeConfidenceWhy", () => {
  it("returns array of reasons", () => {
    const reasons = computeConfidenceWhy(15, 0.1, 0.8, 0.9);
    expect(Array.isArray(reasons)).toBe(true);
    expect(reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("mentions few comps when count is low", () => {
    const reasons = computeConfidenceWhy(2, 0.3, 0.2, 0.5);
    expect(reasons.some((r) => r.includes("Foarte putine"))).toBe(true);
  });

  it("mentions no comps when zero", () => {
    const reasons = computeConfidenceWhy(0, 1, 0, 0);
    expect(reasons.some((r) => r.includes("Nicio comparabila"))).toBe(true);
  });

  it("mentions high dispersion", () => {
    const reasons = computeConfidenceWhy(10, 0.35, 0.5, 0.5);
    expect(reasons.some((r) => r.includes("variate") || r.includes("larg"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeSimilarityScore
// ---------------------------------------------------------------------------

describe("computeSimilarityScore", () => {
  it("gives max score for identical properties nearby", () => {
    const score = computeSimilarityScore(
      { areaM2: 55, rooms: 2, yearBuilt: 1985, floor: 3 },
      { areaM2: 55, rooms: 2, yearBuilt: 1985, distanceM: 50, floor: 3 },
    );
    expect(score).toBe(100);
  });

  it("penalises distance", () => {
    const near = computeSimilarityScore(
      { areaM2: 55, rooms: 2 },
      { areaM2: 55, rooms: 2, yearBuilt: null, distanceM: 100 },
    );
    const far = computeSimilarityScore(
      { areaM2: 55, rooms: 2 },
      { areaM2: 55, rooms: 2, yearBuilt: null, distanceM: 1500 },
    );
    expect(near).toBeGreaterThan(far);
  });

  it("penalises room mismatch", () => {
    const same = computeSimilarityScore(
      { areaM2: 55, rooms: 2 },
      { areaM2: 55, rooms: 2, yearBuilt: null, distanceM: 200 },
    );
    const diff = computeSimilarityScore(
      { areaM2: 55, rooms: 2 },
      { areaM2: 55, rooms: 4, yearBuilt: null, distanceM: 200 },
    );
    expect(same).toBeGreaterThan(diff);
  });
});

// ---------------------------------------------------------------------------
// computeRecommendations (new module)
// ---------------------------------------------------------------------------

describe("computeRecommendations", () => {
  it("always includes photo and staging recs", () => {
    const recs = computeRecommendations({ rooms: 2, usableAreaM2: 55, condition: "locuibil" });
    expect(recs.some((r) => r.title.includes("Poze"))).toBe(true);
    expect(recs.some((r) => r.title.includes("staging"))).toBe(true);
  });

  it("includes renovation rec for bad condition", () => {
    const recs = computeRecommendations({ rooms: 2, usableAreaM2: 55, condition: "de_renovat" });
    expect(recs.some((r) => r.title.includes("Renovare"))).toBe(true);
  });

  it("returns at most 6 recommendations", () => {
    const recs = computeRecommendations({
      rooms: 2,
      usableAreaM2: 55,
      condition: "necesita_renovare",
      heatingType: "RADET",
      hasParking: false,
    });
    expect(recs.length).toBeLessThanOrEqual(6);
  });
});

// ---------------------------------------------------------------------------
// computeRisks (new module)
// ---------------------------------------------------------------------------

describe("computeRisks (separate module)", () => {
  it("flags seismic for pre-1977", () => {
    const risks = computeRisks({ rooms: 2, usableAreaM2: 55, yearBuilt: 1965 });
    expect(risks.some((r) => r.type === "seismic" && r.severity === "high")).toBe(true);
  });

  it("flags no elevator at high floor", () => {
    const risks = computeRisks({
      rooms: 2,
      usableAreaM2: 55,
      hasElevator: false,
      floor: 6,
    });
    expect(risks.some((r) => r.type === "accesibilitate")).toBe(true);
  });

  it("returns empty for ideal property", () => {
    const risks = computeRisks({
      rooms: 2,
      usableAreaM2: 55,
      yearBuilt: 2010,
      floor: 3,
      totalFloors: 8,
      hasElevator: true,
      heatingType: "centrala",
      layoutType: "decomandat",
    });
    expect(risks.length).toBe(0);
  });
});
