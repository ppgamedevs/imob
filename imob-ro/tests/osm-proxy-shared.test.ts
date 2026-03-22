import { describe, expect, it } from "vitest";

import {
  pollutionProximityStress,
  roadDensityPerKm2,
  withProxyDisclaimer,
} from "@/lib/risk/layers/osm-proxy-shared";

describe("osm-proxy-shared", () => {
  it("pollutionProximityStress is lower for motorways at same distance (worse proxy)", () => {
    expect(pollutionProximityStress(100, "motorway")).toBeLessThan(
      pollutionProximityStress(100, "tertiary"),
    );
  });

  it("roadDensityPerKm2 scales with area", () => {
    const d = roadDensityPerKm2(100, 800);
    expect(d).toBeGreaterThan(0);
  });

  it("withProxyDisclaimer caps bullets and appends disclaimer", () => {
    const d = withProxyDisclaimer(["a", "b", "c", "d"]);
    expect(d).toHaveLength(4);
    expect(d[3]).toContain("Estimare bazata pe date publice");
  });
});
