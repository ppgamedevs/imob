/**
 * Test script for Day 34 tile system
 * Tests getNearestCell with known coordinates
 */

import { getIntelligenceScore, getNearestCell, getPOISummary } from "../lib/tiles/loader";

async function testTileSystem() {
  console.log("[Test] Testing tile system...\n");

  // Test coordinates (Piața Unirii area - central Bucharest)
  const testCases = [
    { name: "Piața Unirii", lat: 44.4274, lng: 26.1032 },
    { name: "Universitate", lat: 44.435, lng: 26.1024 },
    { name: "Piața Victoriei", lat: 44.4482, lng: 26.0941 },
    { name: "Pipera", lat: 44.4946, lng: 26.1193 },
    { name: "Politehnica", lat: 44.4388, lng: 26.0564 },
  ];

  for (const test of testCases) {
    console.log(`\n=== ${test.name} (${test.lat}, ${test.lng}) ===`);

    const start = Date.now();
    const cell = await getNearestCell(test.lat, test.lng);
    const duration = Date.now() - start;

    if (cell) {
      console.log(`✓ Found cell in ${duration}ms`);
      console.log(`  Location: ${cell.lat.toFixed(6)}, ${cell.lng.toFixed(6)}`);
      console.log(`  Intelligence Score: ${cell.intelligenceScore}`);
      console.log(`  Metro: ${cell.nearestMetro} (${cell.distMetroM}m)`);
      console.log(
        `  POIs: ${cell.poiCounts.schools} schools, ${cell.poiCounts.supermarkets} supermarkets, ${cell.poiCounts.restaurants} restaurants, ${cell.poiCounts.parks} parks`,
      );
      console.log(`  Median €/m²: ${cell.medianEurM2 ?? "N/A"}`);

      // Validate intelligence score range
      if (cell.intelligenceScore < 0 || cell.intelligenceScore > 1) {
        console.error(`  ⚠️  Intelligence score out of range: ${cell.intelligenceScore}`);
      }
    } else {
      console.log(`✗ No cell found (${duration}ms) - outside Bucharest bounds?`);
    }
  }

  // Test intelligence score convenience method
  console.log("\n=== Testing convenience methods ===");
  const score = await getIntelligenceScore(44.4274, 26.1032);
  console.log(`getIntelligenceScore(Piața Unirii): ${score}`);

  const pois = await getPOISummary(44.4274, 26.1032);
  console.log(`getPOISummary(Piața Unirii):`, pois);

  console.log("\n[Test] ✓ All tests completed!");
}

testTileSystem()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[Test] Error:", err);
    process.exit(1);
  });
