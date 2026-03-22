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
  it("empty POIs: low-data mode, softened scores, no misleading red flags", () => {
    const result = computeIntelScores(emptyPois());
    expect(result.zoneDataQuality.lowDataMode).toBe(true);
    expect(result.zoneDataQuality.totalPois).toBe(0);
    expect(result.redFlags.length).toBe(0);
    expect(result.uncertainScores.convenience).toBe(true);
    expect(result.uncertainScores.walkability).toBe(true);
    expect(result.uncertainScores.nightlifeRisk).toBe(true);
    // Softened toward neutral — not a punitive "0/100 = bad neighborhood"
    expect(result.scores.convenience.value).toBeGreaterThanOrEqual(35);
    expect(result.scores.convenience.value).toBeLessThanOrEqual(55);
    // Nightlife neutral + uncertain when OSM empty (not "silent zero risk")
    expect(result.scores.nightlifeRisk.value).toBe(40);
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
    // Enough cross-category POIs so zone is not in low-data mode (nightlife is meaningful)
    pois.supermarket = [makePoi("supermarket", 250, "convenience"), makePoi("supermarket", 400, "bakery")];
    pois.transport = [makePoi("transport", 300, "bus_stop"), makePoi("transport", 400, "tram_stop")];
    pois.school = [makePoi("school", 600, "school")];
    pois.medical = [makePoi("medical", 700, "doctors")];
    pois.park = [makePoi("park", 500, "park")];
    pois.gym = [makePoi("gym", 800, "fitness_centre")];
    pois.parking = [makePoi("parking", 900, "parking")];
    pois.restaurant = [
      makePoi("restaurant", 200, "bar"),
      makePoi("restaurant", 300, "bar"),
      makePoi("restaurant", 350, "pub"),
      makePoi("restaurant", 400, "nightclub"),
      makePoi("restaurant", 450, "bar"),
      makePoi("restaurant", 500, "restaurant"),
    ];
    const result = computeIntelScores(pois);
    expect(result.zoneDataQuality.lowDataMode).toBe(false);
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

  it("sparse POIs: no red-flag strings (OSM gaps are not product conclusions)", () => {
    const pois = emptyPois();
    pois.restaurant = [makePoi("restaurant", 200)];
    const result = computeIntelScores(pois);
    expect(result.redFlags.length).toBe(0);
    expect(result.zoneDataQuality.lowDataMode).toBe(true);
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
