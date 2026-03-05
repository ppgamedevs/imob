import { describe, expect, it } from "vitest";
import { computeIntelScores } from "@/lib/geo/intelScoring";
import type { OverpassPoi } from "@/lib/geo/overpass";
import type { PoiCategoryKey } from "@/lib/geo/poiCategories";

function makePoi(
  category: PoiCategoryKey,
  distanceM: number,
  subType?: string,
  name?: string,
): OverpassPoi {
  return {
    id: `${category}-${distanceM}-${Math.random()}`,
    name: name ?? null,
    lat: 44.43,
    lng: 26.10,
    category,
    subType: subType ?? category,
    tags: subType === "subway" ? { station: "subway" } : {},
    distanceM,
  };
}

function emptyPois(): Record<PoiCategoryKey, OverpassPoi[]> {
  return {
    supermarket: [], transport: [], school: [], medical: [],
    restaurant: [], park: [], gym: [], parking: [],
  };
}

describe("computeIntelScores", () => {
  it("returns low scores for empty POIs", () => {
    const result = computeIntelScores(emptyPois());
    expect(result.scores.convenience.value).toBeLessThanOrEqual(10);
    expect(result.scores.family.value).toBeLessThanOrEqual(25);
    expect(result.scores.nightlifeRisk.value).toBeLessThanOrEqual(5);
    expect(result.scores.walkability.value).toBeLessThanOrEqual(5);
    expect(result.redFlags.length).toBeGreaterThan(0);
  });

  it("scores convenience based on supermarkets + transport", () => {
    const pois = emptyPois();
    pois.supermarket = [
      makePoi("supermarket", 200, "supermarket", "Lidl"),
      makePoi("supermarket", 350, "supermarket", "Mega Image"),
      makePoi("supermarket", 600, "pharmacy", "Farmacia Tei"),
    ];
    pois.transport = [
      makePoi("transport", 300, "subway", "Piata Unirii"),
      makePoi("transport", 500, "bus_stop"),
    ];
    const result = computeIntelScores(pois);
    expect(result.scores.convenience.value).toBeGreaterThan(30);
    expect(result.evidence.convenience.length).toBeGreaterThan(0);
  });

  it("gives high family score with schools + parks + low nightlife", () => {
    const pois = emptyPois();
    pois.school = [
      makePoi("school", 400, "school", "Scoala nr. 1"),
      makePoi("school", 700, "kindergarten", "Gradinita nr. 2"),
    ];
    pois.park = [
      makePoi("park", 300, "park", "Parcul IOR"),
      makePoi("park", 500, "playground", "Loc de joaca"),
    ];
    const result = computeIntelScores(pois);
    expect(result.scores.family.value).toBeGreaterThan(40);
  });

  it("gives high nightlife risk with many bars/clubs", () => {
    const pois = emptyPois();
    pois.restaurant = [
      makePoi("restaurant", 200, "bar"),
      makePoi("restaurant", 300, "bar"),
      makePoi("restaurant", 350, "pub"),
      makePoi("restaurant", 400, "nightclub"),
      makePoi("restaurant", 450, "bar"),
      makePoi("restaurant", 500, "restaurant"),
    ];
    const result = computeIntelScores(pois);
    expect(result.scores.nightlifeRisk.value).toBeGreaterThan(50);
  });

  it("computes walkability from variety and density", () => {
    const pois = emptyPois();
    pois.supermarket = [makePoi("supermarket", 300)];
    pois.transport = [makePoi("transport", 400)];
    pois.school = [makePoi("school", 500)];
    pois.medical = [makePoi("medical", 600)];
    pois.restaurant = [makePoi("restaurant", 300), makePoi("restaurant", 500)];
    pois.park = [makePoi("park", 400)];
    pois.gym = [makePoi("gym", 800)];
    const result = computeIntelScores(pois);
    expect(result.scores.walkability.value).toBeGreaterThan(30);
    expect(result.evidence.walkability.some((e) => e.includes("categorii"))).toBe(true);
  });

  it("generates red flags for missing essentials", () => {
    const pois = emptyPois();
    // Only restaurants, nothing else
    pois.restaurant = [makePoi("restaurant", 200)];
    const result = computeIntelScores(pois);
    expect(result.redFlags.some((f) => f.includes("magazine"))).toBe(true);
    expect(result.redFlags.some((f) => f.includes("transport"))).toBe(true);
    expect(result.redFlags.some((f) => f.includes("parcuri"))).toBe(true);
  });

  it("all scores are clamped 0-100", () => {
    const pois = emptyPois();
    // Extreme case: lots of everything
    for (let i = 0; i < 30; i++) {
      pois.supermarket.push(makePoi("supermarket", 100 + i * 10));
      pois.transport.push(makePoi("transport", 100 + i * 10));
      pois.restaurant.push(makePoi("restaurant", 100 + i * 10, "bar"));
    }
    const result = computeIntelScores(pois);
    expect(result.scores.convenience.value).toBeLessThanOrEqual(100);
    expect(result.scores.convenience.value).toBeGreaterThanOrEqual(0);
    expect(result.scores.nightlifeRisk.value).toBeLessThanOrEqual(100);
    expect(result.scores.walkability.value).toBeLessThanOrEqual(100);
  });
});
