import { describe, expect, it } from "vitest";
import { evaluatePoiDataQuality } from "@/lib/geo/poi/evaluate-poi-quality";
import type { NormalizedPoi } from "@/lib/geo/poi/types";

function p(
  category: NormalizedPoi["category"],
  lat = 44.45,
  lng = 26.05,
): NormalizedPoi {
  return {
    id: `t/${Math.random()}`,
    source: "osm",
    category,
    lat,
    lng,
    distanceM: 100,
    rawTags: {},
  };
}

describe("evaluatePoiDataQuality", () => {
  it("flags low data in Bucharest bbox with very few POIs", () => {
    const q = evaluatePoiDataQuality({
      pois: [p("shops"), p("transport")],
      lat: 44.45,
      lng: 26.05,
    });
    expect(q.lowDataMode).toBe(true);
    expect(q.confidence).toBe("low");
    expect(q.reasons.some((r) => r.includes("bucuresti") || r.includes("urban"))).toBe(true);
  });

  it("high confidence with dense coverage", () => {
    const pois: NormalizedPoi[] = [];
    for (let i = 0; i < 60; i++) {
      pois.push(p("shops", 44.45 + i * 0.0001, 26.05));
    }
    PRODUCT_FILL: for (const c of [
      "transport",
      "education",
      "healthcare",
      "restaurants",
      "parks",
      "sports",
      "parking",
    ] as const) {
      pois.push(p(c));
    }
    const q = evaluatePoiDataQuality({ pois, lat: 44.45, lng: 26.05 });
    expect(q.lowDataMode).toBe(false);
    expect(q.confidence).not.toBe("low");
  });
});
