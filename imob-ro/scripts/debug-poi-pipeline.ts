/**
 * Manual Bucharest smoke test for the POI pipeline (hits real Overpass).
 *
 * Usage (from imob-ro):
 *   POI_PIPELINE_DEBUG=1 npx tsx scripts/debug-poi-pipeline.ts
 */
import { fetchIntelPoisMerged } from "../src/lib/geo/fetchIntelPois";

const CASES: { name: string; lat: number; lng: number; r: number }[] = [
  { name: "Crangasi", lat: 44.455, lng: 26.045, r: 1000 },
  { name: "Militari", lat: 44.435, lng: 26.03, r: 1000 },
  { name: "Floreasca", lat: 44.48, lng: 26.095, r: 1000 },
  { name: "Drumul Taberei", lat: 44.415, lng: 26.035, r: 1000 },
  { name: "Tineretului", lat: 44.405, lng: 26.105, r: 1000 },
];

async function main() {
  for (const c of CASES) {
    const { poisByCategory, poiIngestion, pipelineQuality } = await fetchIntelPoisMerged({
      lat: c.lat,
      lng: c.lng,
      userRadiusM: c.r,
    });
    const counts = Object.fromEntries(
      Object.entries(poisByCategory).map(([k, v]) => [k, v.length]),
    ) as Record<string, number>;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log("\n===", c.name, "===");
    console.log("total merged:", total, "raw OSM elements:", poiIngestion.rawOsmElementCount);
    console.log("per intel category:", counts);
    console.log("pipeline lowDataMode:", pipelineQuality.lowDataMode, "confidence:", pipelineQuality.confidence);
    console.log("product coverage:", pipelineQuality.categoryCoverage);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
