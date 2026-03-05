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

  it("returns low score when fairLikely is zero and no data", () => {
    const score = computeValueScore(baseInput({ fairLikelyEur: 0 }));
    expect(score).toBe(40);
  });

  it("uses EUR/mp heuristic when no fair value but has price and area", () => {
    const score = computeValueScore(baseInput({
      fairLikelyEur: 0,
      listingPriceEur: 100_000,
      areaM2: 50,
    }));
    expect(score).toBeGreaterThan(30);
    expect(score).toBeLessThanOrEqual(55);
  });

  it("differentiates well between bargain and overpriced", () => {
    const high = { confidence: 90 };
    const bargain = computeValueScore(baseInput({ listingPriceEur: 85_000, ...high }));
    const fair = computeValueScore(baseInput({ listingPriceEur: 100_000, ...high }));
    const overpriced = computeValueScore(baseInput({ listingPriceEur: 120_000, ...high }));
    expect(bargain).toBeGreaterThan(fair);
    expect(fair).toBeGreaterThan(overpriced);
    expect(bargain - overpriced).toBeGreaterThan(20);
  });
});

// ---------------------------------------------------------------------------
// Risk Score
// ---------------------------------------------------------------------------

describe("computeRiskScore", () => {
  it("gives high score for modern building with good amenities", () => {
    const score = computeRiskScore(baseInput({
      yearBucket: "2006+",
      condition: "nou",
      hasElevator: true,
      hasParking: true,
    }));
    expect(score).toBeGreaterThanOrEqual(85);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("does NOT default to 100 for basic input", () => {
    const score = computeRiskScore(baseInput());
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThanOrEqual(60);
  });

  it("penalises pre-1977 buildings", () => {
    const score = computeRiskScore(baseInput({ yearBucket: "<1977" }));
    expect(score).toBeLessThanOrEqual(55);
  });

  it("penalises no elevator on high floor", () => {
    const score = computeRiskScore(baseInput({ hasElevator: false, floor: 6 }));
    expect(score).toBeLessThanOrEqual(60);
  });

  it("applies seismic RS1 penalty", () => {
    const score = computeRiskScore(
      baseInput({ geoIntel: { seismicRiskClass: "RS1" } }),
    );
    expect(score).toBeLessThanOrEqual(40);
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
    expect(score).toBeLessThan(25);
  });

  it("rewards modern buildings with centrala", () => {
    const base = computeRiskScore(baseInput());
    const good = computeRiskScore(baseInput({
      yearBucket: "2006+",
      condition: "nou",
      hasElevator: true,
      hasParking: true,
      heatingType: "centrala proprie",
    }));
    expect(good).toBeGreaterThan(base);
  });

  it("handles under-construction properties", () => {
    const score = computeRiskScore(baseInput({
      yearBucket: "2006+",
      isUnderConstruction: true,
      sellerType: "dezvoltator",
    }));
    expect(score).toBeGreaterThanOrEqual(80);
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

  it("defaults to ~50 without liquidity data", () => {
    const score = computeLiquidityScore(baseInput());
    expect(score).toBeGreaterThanOrEqual(45);
    expect(score).toBeLessThanOrEqual(55);
  });

  it("boosts 2-room apartments (most liquid in Bucharest)", () => {
    const oneRoom = computeLiquidityScore(baseInput({ rooms: 1 }));
    const twoRoom = computeLiquidityScore(baseInput({ rooms: 2 }));
    expect(twoRoom).toBeGreaterThan(oneRoom);
  });

  it("penalises under-construction (can't resell immediately)", () => {
    const existing = computeLiquidityScore(baseInput());
    const dev = computeLiquidityScore(baseInput({ isUnderConstruction: true }));
    expect(dev).toBeLessThan(existing);
  });
});

// ---------------------------------------------------------------------------
// Lifestyle Score
// ---------------------------------------------------------------------------

describe("computeLifestyleScore", () => {
  it("returns moderate score without geo intel", () => {
    const score = computeLifestyleScore(baseInput());
    expect(score).toBeGreaterThanOrEqual(40);
    expect(score).toBeLessThanOrEqual(55);
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
    expect(score).toBeGreaterThanOrEqual(75);
  });

  it("penalises distant metro", () => {
    const near = computeLifestyleScore(baseInput({ geoIntel: { metroWalkMin: 5 } }));
    const far = computeLifestyleScore(baseInput({ geoIntel: { metroWalkMin: 30 } }));
    expect(near).toBeGreaterThan(far);
  });

  it("includes property-level factors (parking, elevator, condition)", () => {
    const base = computeLifestyleScore(baseInput());
    const good = computeLifestyleScore(baseInput({
      hasParking: true,
      hasElevator: true,
      condition: "renovat",
    }));
    expect(good).toBeGreaterThan(base);
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
        hasElevator: true,
        hasParking: true,
        rooms: 2,
        areaM2: 55,
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
    expect(result.score).toBeLessThan(50);
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

  it("produces different scores for different apartments", () => {
    const good = computeApartmentScore(baseInput({
      listingPriceEur: 92_000,
      confidence: 80,
      yearBucket: "2006+",
      condition: "renovat",
      hasElevator: true,
      hasParking: true,
    }));
    const bad = computeApartmentScore(baseInput({
      listingPriceEur: 130_000,
      confidence: 20,
      yearBucket: "<1977",
      condition: "de_renovat",
    }));
    expect(good.score - bad.score).toBeGreaterThan(20);
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

  it("under-construction apartment gets reasonable score", () => {
    const result = computeApartmentScore(baseInput({
      listingPriceEur: 124_000,
      isUnderConstruction: true,
      yearBuilt: 2027,
      yearBucket: "2006+",
      condition: "nou",
      sellerType: "dezvoltator",
      hasParking: true,
      rooms: 1,
      areaM2: 57,
    }));
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThanOrEqual(85);
    expect(result.subscores.risk).toBeGreaterThanOrEqual(70);
  });

  it("risk score varies meaningfully across different profiles", () => {
    const modern = computeRiskScore(baseInput({
      yearBucket: "2006+",
      condition: "nou",
      hasElevator: true,
      hasParking: true,
    }));
    const average = computeRiskScore(baseInput({
      yearBucket: "1991-2005",
      condition: "locuibil",
    }));
    const old = computeRiskScore(baseInput({
      yearBucket: "<1977",
      condition: "de_renovat",
      hasElevator: false,
      floor: 5,
    }));
    expect(modern).toBeGreaterThan(average);
    expect(average).toBeGreaterThan(old);
    expect(modern - old).toBeGreaterThan(30);
  });
});
