import { describe, expect, it } from "vitest";
import { classifyZone, type ZoneTypeKey } from "@/lib/geo/zoneType";
import type { IntelResult } from "@/lib/geo/intelScoring";
import type { DemandSignals } from "@/lib/geo/signals/querySignals";
import type { OverpassPoi } from "@/lib/geo/overpass";
import type { PoiCategoryKey } from "@/lib/geo/poiCategories";
import { POI_CATEGORY_KEYS } from "@/lib/geo/poiCategories";

const DEFAULT_TEST_COUNTS: Record<PoiCategoryKey, number> = {
  supermarket: 2,
  transport: 2,
  school: 2,
  medical: 1,
  restaurant: 1,
  park: 2,
  gym: 0,
  parking: 0,
};

function makeIntel(overrides: Partial<Record<string, number>> = {}): IntelResult {
  const totalPois = POI_CATEGORY_KEYS.reduce((s, k) => s + DEFAULT_TEST_COUNTS[k], 0);
  const categoriesWithData = POI_CATEGORY_KEYS.filter((k) => DEFAULT_TEST_COUNTS[k] > 0).length;
  return {
    scores: {
      convenience: { value: overrides.convenience ?? 50, label: "Acceptabil", labelRo: "Comoditate zilnica" },
      family: { value: overrides.family ?? 50, label: "Acceptabil", labelRo: "Potrivire familii" },
      nightlifeRisk: { value: overrides.nightlifeRisk ?? 30, label: "Slab", labelRo: "Risc zgomot nocturn" },
      walkability: { value: overrides.walkability ?? 50, label: "Acceptabil", labelRo: "Walkability" },
    },
    evidence: { convenience: [], family: [], nightlifeRisk: [], walkability: [] },
    redFlags: [],
    zoneDataQuality: {
      level: "medie",
      totalPois,
      categoriesWithData,
      emptyCategoryCount: POI_CATEGORY_KEYS.length - categoriesWithData,
      lowDataMode: false,
    },
    categoryCounts: { ...DEFAULT_TEST_COUNTS },
    uncertainScores: {
      convenience: false,
      family: false,
      walkability: false,
      nightlifeRisk: false,
    },
  };
}

function makePois(counts: Partial<Record<PoiCategoryKey, number>> = {}): Record<PoiCategoryKey, OverpassPoi[]> {
  const base: Record<PoiCategoryKey, OverpassPoi[]> = {
    supermarket: [], transport: [], school: [], medical: [],
    restaurant: [], park: [], gym: [], parking: [],
  };

  for (const [key, count] of Object.entries(counts)) {
    const pois: OverpassPoi[] = [];
    for (let i = 0; i < (count ?? 0); i++) {
      pois.push({
        id: `${key}-${i}`,
        name: `${key} ${i}`,
        lat: 44.43,
        lng: 26.10,
        category: key as PoiCategoryKey,
        subType: key === "restaurant" && i % 3 === 0 ? "bar" : key === "school" && i === 0 ? "university" : key,
        tags: {},
        distanceM: 200 + i * 100,
      });
    }
    base[key as PoiCategoryKey] = pois;
  }

  return base;
}

function makeSignals(overrides: Partial<DemandSignals> = {}): DemandSignals {
  return {
    demandIndex: 50,
    demandTrend: "flat",
    demandTrendPct: 0,
    supplyIndex: 50,
    supplyTrend: "flat",
    supplyTrendPct: 0,
    medianPriceM2_30d: null,
    medianPriceM2_90d: null,
    priceTrend: null,
    priceTrendPct: null,
    nListings: 10,
    nEvents30d: 20,
    nEvents90d: 50,
    confidence: "medie",
    disclaimers: [],
    ...overrides,
  };
}

describe("classifyZone", () => {
  it("classifies high-family, low-nightlife as Familie", () => {
    const intel = makeIntel({ family: 80, nightlifeRisk: 20 });
    const pois = makePois({ park: 3, school: 3 });
    const result = classifyZone(intel, pois, null);
    expect(result.zoneType).toBe("familie" as ZoneTypeKey);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it("classifies high nightlife as Nightlife", () => {
    const intel = makeIntel({ nightlifeRisk: 85, convenience: 30, family: 20 });
    // Need actual bar/pub/nightclub subTypes for the nightlife scorer
    const pois = makePois({});
    const restaurantPois: OverpassPoi[] = [];
    for (let i = 0; i < 8; i++) {
      restaurantPois.push({
        id: `bar-${i}`, name: `Bar ${i}`, lat: 44.43, lng: 26.10,
        category: "restaurant", subType: i < 6 ? "bar" : "nightclub",
        tags: {}, distanceM: 150 + i * 40,
      });
    }
    pois.restaurant = restaurantPois;
    const result = classifyZone(intel, pois, null);
    expect(result.zoneType).toBe("nightlife" as ZoneTypeKey);
  });

  it("classifies high convenience + transport as Corporate", () => {
    const intel = makeIntel({ convenience: 80, walkability: 70, nightlifeRisk: 30 });
    const pois = makePois({ transport: 6, restaurant: 8, gym: 2 });
    const result = classifyZone(intel, pois, null);
    expect(result.zoneType).toBe("corporate" as ZoneTypeKey);
  });

  it("classifies demand-up + price-up with signals as In crestere", () => {
    const intel = makeIntel({ walkability: 50 });
    const pois = makePois({});
    const signals = makeSignals({
      demandTrend: "up",
      demandTrendPct: 30,
      priceTrend: "up",
      priceTrendPct: 8,
      medianPriceM2_30d: 2000,
      medianPriceM2_90d: 1850,
    });
    const result = classifyZone(intel, pois, signals);
    expect(result.zoneType).toBe("in_crestere" as ZoneTypeKey);
  });

  it("classifies low-demand, low-convenience as Stagnanta", () => {
    const intel = makeIntel({ convenience: 15, walkability: 20 });
    intel.redFlags = ["0 magazine", "0 transport", "0 parcuri"];
    const pois = makePois({});
    const signals = makeSignals({
      demandTrend: "down",
      demandTrendPct: -20,
      demandIndex: 10,
    });
    const result = classifyZone(intel, pois, signals);
    expect(result.zoneType).toBe("stagnanta" as ZoneTypeKey);
  });

  it("always returns evidence", () => {
    const intel = makeIntel();
    const pois = makePois({ supermarket: 2, transport: 2, park: 1 });
    const result = classifyZone(intel, pois, null);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.labelRo).toBeTruthy();
    expect(["scazuta", "medie", "ridicata"]).toContain(result.confidence);
  });

  it("lowers confidence when margin is thin", () => {
    const intel = makeIntel({ convenience: 50, family: 50, nightlifeRisk: 50, walkability: 50 });
    const pois = makePois({ supermarket: 2, transport: 2, school: 2, restaurant: 5, park: 2 });
    const result = classifyZone(intel, pois, null);
    // With everything equal, the margin should be thin
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
