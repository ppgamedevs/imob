import { describe, expect, it } from "vitest";

import {
  computeApartmentScore,
  computeValueScore,
  computeRiskScore,
  computeLiquidityScore,
  computeLifestyleScore,
  type ApartmentScoreInput,
} from "@/lib/score/apartmentScore";

function baseInput(overrides: Partial<ApartmentScoreInput> = {}): ApartmentScoreInput {
  return {
    fairLikelyEur: 100_000,
    range80: { min: 90_000, max: 110_000 },
    range95: { min: 80_000, max: 120_000 },
    confidence: 70,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Value Score
// ---------------------------------------------------------------------------

describe("computeValueScore", () => {
  it("gives high score when listing is below fair price", () => {
    const score = computeValueScore(baseInput({ listingPriceEur: 92_000 }));
    expect(score).toBeGreaterThanOrEqual(75);
  });

  it("gives lower score when listing is overpriced", () => {
    const fair = computeValueScore(baseInput({ listingPriceEur: 100_000 }));
    const over = computeValueScore(baseInput({ listingPriceEur: 125_000 }));
    expect(fair).toBeGreaterThan(over);
  });

  it("penalises heavily when price exceeds range80.max", () => {
    const score = computeValueScore(baseInput({ listingPriceEur: 130_000 }));
    expect(score).toBeLessThan(50);
  });

  it("caps score based on confidence", () => {
    const lowConf = computeValueScore(baseInput({ listingPriceEur: 95_000, confidence: 20 }));
    expect(lowConf).toBeLessThanOrEqual(60);
  });

  it("returns 50 when fairLikely is zero", () => {
    const score = computeValueScore(baseInput({ fairLikelyEur: 0 }));
    expect(score).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Risk Score
// ---------------------------------------------------------------------------

describe("computeRiskScore", () => {
  it("starts at 100 for ideal property", () => {
    const score = computeRiskScore(baseInput({ yearBucket: "2006+" }));
    expect(score).toBe(100);
  });

  it("penalises pre-1977 buildings", () => {
    const score = computeRiskScore(baseInput({ yearBucket: "<1977" }));
    expect(score).toBeLessThanOrEqual(80);
  });

  it("penalises no elevator on high floor", () => {
    const score = computeRiskScore(baseInput({ hasElevator: false, floor: 6 }));
    expect(score).toBeLessThanOrEqual(85);
  });

  it("applies seismic RS1 penalty", () => {
    const score = computeRiskScore(
      baseInput({ geoIntel: { seismicRiskClass: "RS1" } }),
    );
    expect(score).toBeLessThanOrEqual(60);
  });

  it("stacks multiple penalties", () => {
    const score = computeRiskScore(
      baseInput({
        yearBucket: "<1977",
        hasElevator: false,
        floor: 5,
        condition: "de_renovat",
        geoIntel: { seismicRiskClass: "RS2" },
      }),
    );
    expect(score).toBeLessThan(40);
  });
});

// ---------------------------------------------------------------------------
// Liquidity Score
// ---------------------------------------------------------------------------

describe("computeLiquidityScore", () => {
  it("gives high score for fast-selling area", () => {
    const score = computeLiquidityScore(
      baseInput({ liquidity: { daysMin: 10, daysMax: 20, label: "ridicata" } }),
    );
    expect(score).toBeGreaterThanOrEqual(85);
  });

  it("gives low score for slow-selling area", () => {
    const score = computeLiquidityScore(
      baseInput({ liquidity: { daysMin: 90, daysMax: 150, label: "scazuta" } }),
    );
    expect(score).toBeLessThan(45);
  });

  it("penalises price drops", () => {
    const clean = computeLiquidityScore(baseInput({ liquidity: { label: "medie" } }));
    const drops = computeLiquidityScore(
      baseInput({
        liquidity: { label: "medie" },
        integrity: { priceDrops: 3 },
      }),
    );
    expect(drops).toBeLessThan(clean);
  });

  it("defaults to 60 without liquidity data", () => {
    const score = computeLiquidityScore(baseInput());
    expect(score).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// Lifestyle Score
// ---------------------------------------------------------------------------

describe("computeLifestyleScore", () => {
  it("returns 50 without geo intel", () => {
    const score = computeLifestyleScore(baseInput());
    expect(score).toBe(50);
  });

  it("boosts for close metro", () => {
    const score = computeLifestyleScore(
      baseInput({ geoIntel: { metroWalkMin: 5 } }),
    );
    expect(score).toBeGreaterThan(60);
  });

  it("boosts for good vibe scores", () => {
    const score = computeLifestyleScore(
      baseInput({
        geoIntel: {
          metroWalkMin: 8,
          vibe: { nightlife: 80, family: 70, convenience: 75, green: 65 },
        },
      }),
    );
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it("penalises distant metro", () => {
    const near = computeLifestyleScore(baseInput({ geoIntel: { metroWalkMin: 5 } }));
    const far = computeLifestyleScore(baseInput({ geoIntel: { metroWalkMin: 30 } }));
    expect(near).toBeGreaterThan(far);
  });
});

// ---------------------------------------------------------------------------
// computeApartmentScore — integration
// ---------------------------------------------------------------------------

describe("computeApartmentScore", () => {
  it("returns score in 0-100 range", () => {
    const result = computeApartmentScore(baseInput());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("maps high score to Excelent or Bun", () => {
    const result = computeApartmentScore(
      baseInput({
        listingPriceEur: 92_000,
        confidence: 85,
        yearBucket: "2006+",
        condition: "nou",
        liquidity: { daysMin: 10, daysMax: 18, label: "ridicata" },
        geoIntel: {
          metroWalkMin: 5,
          vibe: { nightlife: 60, family: 80, convenience: 75, green: 70 },
        },
      }),
    );
    expect(["Excelent", "Bun"]).toContain(result.label);
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it("maps risky/overpriced to Atentie or Evita", () => {
    const result = computeApartmentScore(
      baseInput({
        listingPriceEur: 140_000,
        yearBucket: "<1977",
        condition: "de_renovat",
        hasElevator: false,
        floor: 7,
        geoIntel: { seismicRiskClass: "RS1" },
      }),
    );
    expect(["Atentie", "Evita"]).toContain(result.label);
    expect(result.score).toBeLessThan(60);
  });

  it("always returns exactly 3 pros, 3 cons, 3 actions", () => {
    const result = computeApartmentScore(baseInput({ listingPriceEur: 100_000 }));
    expect(result.pros.length).toBe(3);
    expect(result.cons.length).toBe(3);
    expect(result.actions.length).toBe(3);
  });

  it("returns input confidence", () => {
    const result = computeApartmentScore(baseInput({ confidence: 42 }));
    expect(result.confidence).toBe(42);
  });

  it("handles missing listing price gracefully", () => {
    const result = computeApartmentScore(baseInput());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.label).toBeDefined();
  });

  it("produces stable scores (deterministic)", () => {
    const input = baseInput({ listingPriceEur: 105_000, yearBucket: "1978-1990" });
    const r1 = computeApartmentScore(input);
    const r2 = computeApartmentScore(input);
    expect(r1.score).toBe(r2.score);
    expect(r1.label).toBe(r2.label);
    expect(r1.pros).toEqual(r2.pros);
  });

  it("sub-scores are all 0-100", () => {
    const result = computeApartmentScore(
      baseInput({
        listingPriceEur: 200_000,
        yearBucket: "<1977",
        condition: "de_renovat",
        geoIntel: { seismicRiskClass: "RS1" },
        integrity: { priceDrops: 5, reposts: 3, duplicates: 4 },
      }),
    );
    for (const key of ["value", "risk", "liquidity", "lifestyle"] as const) {
      expect(result.subscores[key]).toBeGreaterThanOrEqual(0);
      expect(result.subscores[key]).toBeLessThanOrEqual(100);
    }
  });
});
