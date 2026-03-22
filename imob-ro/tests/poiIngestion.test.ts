import { describe, expect, it } from "vitest";
import { mergeAndDedupeCategory } from "@/lib/geo/poiIngestion";
import type { OverpassPoi } from "@/lib/geo/overpass";

function p(
  id: string,
  lat: number,
  lng: number,
  distanceM: number,
): OverpassPoi {
  return {
    id,
    name: id,
    lat,
    lng,
    category: "supermarket",
    subType: "supermarket",
    tags: {},
    distanceM,
  };
}

describe("mergeAndDedupeCategory", () => {
  it("keeps OSM and adds non-duplicate Google POIs", () => {
    const osm = [p("osm/1", 44.43, 26.1, 100)];
    const google = [p("google:x", 44.43001, 26.10001, 102)]; // ~14m — dup
    const google2 = [p("google:y", 44.44, 26.11, 900)]; // far — keep
    const merged = mergeAndDedupeCategory(osm, [...google, ...google2], 10);
    expect(merged.map((x) => x.id)).toEqual(["osm/1", "google:y"]);
  });
});
