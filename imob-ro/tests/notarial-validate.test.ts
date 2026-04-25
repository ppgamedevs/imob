import { describe, expect, it } from "vitest";

import {
  resolveNotarialDisplayForReport,
  validateNotarialReference,
} from "../src/lib/notarial/notarial-validate";

const base = () => ({
  propertyKind: "apartment" as const,
  isBucharestIlfov: true,
  areaM2Used: 50,
  interpretedEurM2: 1200,
  rawCurrency: "EUR" as const,
  rawUnit: "eur_m2" as const,
  matchMethod: "neighborhood" as const,
  gridYear: new Date().getFullYear(),
  gridZone: "S4 - Tineretului",
  gridSubzone: "Tineretului",
  currentYear: new Date().getFullYear(),
  askingPriceEur: 80_000,
  avmMidEur: 75_000,
});

describe("validateNotarialReference", () => {
  it("suppresses 22k total vs 80k asking (implausible ratio)", () => {
    const r = validateNotarialReference({
      ...base(),
      computedTotalEur: 22_000,
    });
    expect(r.canShow).toBe(false);
    expect(r.suppressReason).toBe("notarial_too_low_vs_asking");
  });

  it("allows 55k notarial vs 80k asking", () => {
    const r = validateNotarialReference({
      ...base(),
      computedTotalEur: 55_000,
    });
    expect(r.canShow).toBe(true);
    expect(r.displayTotalEur).toBe(55_000);
  });

  it("suppresses unknown unit/currency", () => {
    const r = validateNotarialReference({
      ...base(),
      rawCurrency: "unknown",
      rawUnit: "unknown",
      computedTotalEur: 60_000,
    });
    expect(r.canShow).toBe(false);
    expect(r.suppressReason).toBe("unknown_currency_or_unit");
  });

  it("suppresses missing area", () => {
    const r = validateNotarialReference({
      ...base(),
      areaM2Used: null,
      computedTotalEur: 40_000,
    });
    expect(r.canShow).toBe(false);
    expect(r.suppressReason).toBe("missing_area");
  });

  it("suppresses sector fallback match", () => {
    const r = validateNotarialReference({
      ...base(),
      matchMethod: "sector_avg",
      computedTotalEur: 60_000,
    });
    expect(r.canShow).toBe(false);
    expect(r.suppressReason).toBe("sector_fallback_unreliable");
  });

  it("suppresses stale grid year", () => {
    const r = validateNotarialReference({
      ...base(),
      gridYear: new Date().getFullYear() - 3,
      computedTotalEur: 60_000,
    });
    expect(r.canShow).toBe(false);
    expect(r.suppressReason).toBe("stale_grid_year");
  });

  it("suppresses eur/m2 under 400 in Bucuresti/Ilfov (apartments)", () => {
    const r = validateNotarialReference({
      ...base(),
      askingPriceEur: null,
      avmMidEur: null,
      interpretedEurM2: 300,
      computedTotalEur: 15_000,
    });
    expect(r.canShow).toBe(false);
    expect(r.suppressReason).toBe("bucharest_min_eur_m2");
  });

  it("allows neighborhood match when min eur is at least 400 in Bucuresti (no asking/AVM gate)", () => {
    const r = validateNotarialReference({
      ...base(),
      askingPriceEur: null,
      avmMidEur: null,
      interpretedEurM2: 450,
      computedTotalEur: 22_500,
    });
    expect(r.canShow).toBe(true);
  });

  it("suppresses city-level or other non-neighborhood match methods", () => {
    const r = validateNotarialReference({
      ...base(),
      matchMethod: "city_fallback",
      computedTotalEur: 60_000,
    });
    expect(r.canShow).toBe(false);
    expect(r.suppressReason).toBe("weak_notarial_match");
  });

  it("rejects grid year more than one calendar year behind or in the future", () => {
    const y = new Date().getFullYear();
    const past = validateNotarialReference({
      ...base(),
      gridYear: y - 2,
      computedTotalEur: 60_000,
    });
    expect(past.canShow).toBe(false);
    const future = validateNotarialReference({
      ...base(),
      gridYear: y + 1,
      computedTotalEur: 60_000,
    });
    expect(future.canShow).toBe(false);
  });

  it("suppresses non-apartment", () => {
    const r = validateNotarialReference({
      ...base(),
      propertyKind: "other",
      computedTotalEur: 100_000,
    });
    expect(r.canShow).toBe(false);
  });
});

describe("resolveNotarialDisplayForReport", () => {
  it("suppresses legacy snapshot numbers when matchMethod is sector_avg", () => {
    const y = new Date().getFullYear();
    const resolved = resolveNotarialDisplayForReport({
      scoreSnapshot: {
        notarialTotal: 22_000,
        notarialEurM2: 275,
        notarialZone: "Sector 1 (medie)",
        notarialYear: y,
        explain: {
          notarial: {
            matched: true,
            canShow: true,
            displayTotalEur: 22_000,
            matchMethod: "sector_avg",
            computedTotalEur: 22_000,
            interpretedEurM2: 275,
            gridYear: y,
            gridZone: "Sector 1 (medie)",
          },
        },
      },
      askingPriceEur: 80_000,
      avmMidEur: 75_000,
      features: { areaM2: 80, city: "București" },
    });
    expect(resolved.canShow).toBe(false);
    expect(resolved.notarialTotal).toBeNull();
    expect(resolved.showNeutralNote).toBe(true);
    expect(resolved.suppressReason).toBe("sector_fallback_unreliable");
  });

  it("allows neighborhood match from explain + features", () => {
    const y = new Date().getFullYear();
    const resolved = resolveNotarialDisplayForReport({
      scoreSnapshot: {
        notarialTotal: 60_000,
        notarialEurM2: 1200,
        notarialZone: "S4 - Tineretului",
        notarialYear: y,
        explain: {
          notarial: {
            matched: true,
            canShow: true,
            displayTotalEur: 60_000,
            matchMethod: "neighborhood",
            computedTotalEur: 60_000,
            interpretedEurM2: 1200,
            gridYear: y,
            gridZone: "S4 - Tineretului",
          },
        },
      },
      askingPriceEur: 80_000,
      avmMidEur: 75_000,
      features: { areaM2: 50, city: "București" },
    });
    expect(resolved.canShow).toBe(true);
    expect(resolved.notarialTotal).toBe(60_000);
    expect(resolved.showNeutralNote).toBe(false);
  });
});
