import { describe, expect, it } from "vitest";
import { fetchIntelPoisMerged } from "@/lib/geo/fetchIntelPois";

const RUN = process.env.RUN_POI_INTEGRATION === "1" || process.env.RUN_POI_INTEGRATION === "true";

/**
 * Real Overpass — run: RUN_POI_INTEGRATION=1 npx vitest run tests/poi-bucharest.integration.test.ts
 */
describe.skipIf(!RUN)("POI pipeline Bucharest (integration)", () => {
  it("dense sectors return non-absurd zeros", async () => {
    const { poisByCategory, pipelineQuality } = await fetchIntelPoisMerged({
      lat: 44.45,
      lng: 26.05,
      userRadiusM: 1000,
    });
    const shops = poisByCategory.supermarket?.length ?? 0;
    const transport = poisByCategory.transport?.length ?? 0;
    const food = poisByCategory.restaurant?.length ?? 0;
    expect(shops + transport + food).toBeGreaterThan(5);
    expect(pipelineQuality.totalPoiCount).toBeGreaterThan(8);
  }, 120_000);
});
