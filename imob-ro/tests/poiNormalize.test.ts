import { describe, expect, it } from "vitest";
import { classifyOsmTags } from "@/lib/geo/poi/normalize-osm-poi";

describe("classifyOsmTags", () => {
  it("maps pharmacy to healthcare (intel layer maps to supermarket bucket)", () => {
    expect(classifyOsmTags({ amenity: "pharmacy" })).toEqual({
      category: "healthcare",
      subcategory: "pharmacy",
    });
  });

  it("maps shop=* to shops", () => {
    expect(classifyOsmTags({ shop: "convenience" })).toEqual({
      category: "shops",
      subcategory: "convenience",
    });
  });

  it("prefers transport for bus_stop over shop on same object (rare)", () => {
    expect(classifyOsmTags({ highway: "bus_stop", shop: "kiosk" })).toEqual({
      category: "transport",
      subcategory: "bus_stop",
    });
  });

  it("maps railway station + subway", () => {
    expect(classifyOsmTags({ railway: "station", station: "subway" })).toEqual({
      category: "transport",
      subcategory: "subway",
    });
  });
});
