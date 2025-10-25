/**
 * Day 34: Build Area Intelligence Tiles
 *
 * Generates precomputed 250m grid tiles over Bucharest with:
 * - Distance to nearest metro station
 * - POI counts (schools, supermarkets, parks, restaurants)
 * - Weighted median €/m² from AreaDaily
 * - Composite intelligence score
 *
 * Output: JSON tiles in public/data/tiles/bucharest-z14/
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

import { METRO_STATIONS } from "../lib/data/metro";
import { haversineM } from "../lib/geo";

const prisma = new PrismaClient();

// Bucharest bounds (approximate)
const BUCHAREST_BOUNDS = {
  north: 44.55,
  south: 44.35,
  west: 26.0,
  east: 26.25,
};

const CELL_SIZE_M = 250; // 250 meters
const ZOOM = 14;
const POI_RADIUS_M = 500; // Count POIs within 500m of cell center

type POI = {
  type: "school" | "supermarket" | "restaurant" | "park";
  lat: number;
  lng: number;
  name?: string;
};

type GridCell = {
  lat: number;
  lng: number;
  distMetroM: number;
  nearestMetro: string;
  poiCounts: {
    schools: number;
    supermarkets: number;
    restaurants: number;
    parks: number;
  };
  medianEurM2: number | null;
  intelligenceScore: number;
};

/**
 * Load POI data from GeoJSON
 */
async function loadPOIs(): Promise<POI[]> {
  const geojsonPath = path.join(process.cwd(), "public/data/pois.geojson");
  const geojson = JSON.parse(await fs.readFile(geojsonPath, "utf-8"));

  return geojson.features.map((f: any) => ({
    type: f.properties.type,
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    name: f.properties.name,
  }));
}

/**
 * Generate 250m grid cells for Bucharest
 */
function generateGridCells(): Array<{ lat: number; lng: number }> {
  const cells: Array<{ lat: number; lng: number }> = [];

  // Calculate step size in degrees (approximate)
  const latStep = CELL_SIZE_M / 111320; // 1 degree lat ≈ 111.32 km
  const avgLat = (BUCHAREST_BOUNDS.north + BUCHAREST_BOUNDS.south) / 2;
  const lngStep = CELL_SIZE_M / (111320 * Math.cos((avgLat * Math.PI) / 180));

  for (let lat = BUCHAREST_BOUNDS.south; lat < BUCHAREST_BOUNDS.north; lat += latStep) {
    for (let lng = BUCHAREST_BOUNDS.west; lng < BUCHAREST_BOUNDS.east; lng += lngStep) {
      // Use cell center
      cells.push({ lat: lat + latStep / 2, lng: lng + lngStep / 2 });
    }
  }

  console.log(`[Grid] Generated ${cells.length} cells`);
  return cells;
}

/**
 * Calculate POI counts within radius of cell
 */
function countPOIsNearCell(
  cellLat: number,
  cellLng: number,
  pois: POI[],
  radius = POI_RADIUS_M,
): GridCell["poiCounts"] {
  const counts = {
    schools: 0,
    supermarkets: 0,
    restaurants: 0,
    parks: 0,
  };

  for (const poi of pois) {
    const dist = haversineM(cellLat, cellLng, poi.lat, poi.lng);
    if (dist <= radius) {
      counts[(poi.type + "s") as keyof typeof counts]++;
    }
  }

  return counts;
}

/**
 * Get weighted median price for cell from AreaDaily
 *
 * For v1: Use simple average of recent area prices
 * Future: Weight by proximity to cell and recency
 */
async function getWeightedMedianEurM2(cellLat: number, cellLng: number): Promise<number | null> {
  // Get recent AreaDaily records (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const recentAreas = await prisma.areaDaily.findMany({
    where: {
      date: {
        gte: thirtyDaysAgo,
      },
      medianEurM2: {
        not: null,
      },
    },
    select: {
      medianEurM2: true,
      supply: true,
    },
    take: 100, // Limit for performance
  });

  if (recentAreas.length === 0) return null;

  // Simple weighted average by supply
  let totalWeight = 0;
  let weightedSum = 0;

  for (const area of recentAreas) {
    if (!area.medianEurM2) continue;
    const weight = Math.max(1, area.supply ?? 1); // Weight by supply count
    weightedSum += area.medianEurM2 * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
}

/**
 * Calculate intelligence score for cell (0-1 scale)
 *
 * Formula:
 * - Metro proximity: 30% (closer = better)
 * - POI density: 40% (more amenities = better)
 * - Price indicator: 30% (moderate prices = better livability)
 */
function calculateIntelligenceScore(cell: {
  distMetroM: number;
  poiCounts: GridCell["poiCounts"];
  medianEurM2: number | null;
}): number {
  let score = 0;

  // 1. Metro proximity (0-30 points)
  if (cell.distMetroM <= 300) score += 30;
  else if (cell.distMetroM <= 600) score += 20;
  else if (cell.distMetroM <= 1000) score += 10;
  else if (cell.distMetroM <= 1500) score += 5;

  // 2. POI density (0-40 points) - weighted by importance
  const poiTotal =
    cell.poiCounts.schools * 3 + // Schools weighted 3x
    cell.poiCounts.supermarkets * 2 + // Supermarkets 2x
    cell.poiCounts.restaurants * 1 + // Restaurants 1x
    cell.poiCounts.parks * 2; // Parks 2x

  score += Math.min(40, poiTotal * 2); // Scale up, cap at 40

  // 3. Price indicator (0-30 points) - moderate prices = better
  if (cell.medianEurM2) {
    if (cell.medianEurM2 >= 1500 && cell.medianEurM2 <= 2500) {
      score += 30; // Sweet spot
    } else if (cell.medianEurM2 >= 1200 && cell.medianEurM2 <= 3000) {
      score += 20; // Acceptable range
    } else if (cell.medianEurM2 >= 1000 && cell.medianEurM2 <= 3500) {
      score += 10; // Wider range
    }
  } else {
    score += 5; // Small penalty for no data
  }

  // Normalize to 0-1
  return Math.min(1, score / 100);
}

/**
 * Convert lat/lng to tile coordinates (Web Mercator)
 */
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

/**
 * Get tile bounds from tile coordinates
 */
function tileToBounds(
  x: number,
  y: number,
  zoom: number,
): { north: number; south: number; east: number; west: number } {
  const n = Math.pow(2, zoom);
  const west = (x / n) * 360 - 180;
  const east = ((x + 1) / n) * 360 - 180;

  const n1 = Math.PI - (2 * Math.PI * y) / n;
  const north = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n1) - Math.exp(-n1)));

  const n2 = Math.PI - (2 * Math.PI * (y + 1)) / n;
  const south = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n2) - Math.exp(-n2)));

  return { north, south, east, west };
}

/**
 * Main tile builder
 */
export async function buildAreaTiles() {
  const startTime = Date.now();
  console.log("[Tiles] Starting tile generation...");
  console.log(`[Tiles] Bounds: ${JSON.stringify(BUCHAREST_BOUNDS)}`);
  console.log(`[Tiles] Cell size: ${CELL_SIZE_M}m, Zoom: ${ZOOM}`);

  // 1. Load POIs
  const pois = await loadPOIs();
  console.log(`[Tiles] Loaded ${pois.length} POIs`);
  const poiSummary = {
    schools: pois.filter((p) => p.type === "school").length,
    supermarkets: pois.filter((p) => p.type === "supermarket").length,
    restaurants: pois.filter((p) => p.type === "restaurant").length,
    parks: pois.filter((p) => p.type === "park").length,
  };
  console.log(`[Tiles] POI breakdown:`, poiSummary);

  // 2. Generate grid cells
  const cells = generateGridCells();

  // 3. Get global median price once (for efficiency)
  console.log(`[Tiles] Calculating global median price...`);
  const globalMedianEurM2 = await getWeightedMedianEurM2(44.45, 26.1);
  console.log(`[Tiles] Global median: €${globalMedianEurM2}/m²`);

  // 4. Process each cell
  console.log(`[Tiles] Processing ${cells.length} cells...`);
  const processedCells: GridCell[] = [];
  let processedCount = 0;

  for (const cell of cells) {
    // Find nearest metro
    const metroDistances = METRO_STATIONS.map((s) => ({
      name: s.name,
      dist: haversineM(cell.lat, cell.lng, s.lat, s.lng),
    })).sort((a, b) => a.dist - b.dist);

    const nearestMetro = metroDistances[0];

    // Count POIs
    const poiCounts = countPOIsNearCell(cell.lat, cell.lng, pois);

    // Use global median for all cells (v1 simplification)
    const medianEurM2 = globalMedianEurM2;

    // Calculate intelligence score
    const intelligenceScore = calculateIntelligenceScore({
      distMetroM: nearestMetro.dist,
      poiCounts,
      medianEurM2,
    });

    processedCells.push({
      lat: parseFloat(cell.lat.toFixed(6)),
      lng: parseFloat(cell.lng.toFixed(6)),
      distMetroM: Math.round(nearestMetro.dist),
      nearestMetro: nearestMetro.name,
      poiCounts,
      medianEurM2,
      intelligenceScore: parseFloat(intelligenceScore.toFixed(3)),
    });

    processedCount++;
    if (processedCount % 1000 === 0) {
      console.log(`[Tiles] Processed ${processedCount}/${cells.length} cells...`);
    }
  }

  console.log(`[Tiles] Processed ${processedCells.length} cells`);

  // 5. Group cells into tiles
  console.log(`[Tiles] Grouping cells into tiles...`);
  const tiles: Record<
    string,
    {
      zoom: number;
      x: number;
      y: number;
      bounds: { north: number; south: number; east: number; west: number };
      center: { lat: number; lng: number };
      cellSize: number;
      cells: GridCell[];
    }
  > = {};

  for (const cell of processedCells) {
    const tile = latLngToTile(cell.lat, cell.lng, ZOOM);
    const key = `${ZOOM}-${tile.x}-${tile.y}`;

    if (!tiles[key]) {
      const bounds = tileToBounds(tile.x, tile.y, ZOOM);
      tiles[key] = {
        zoom: ZOOM,
        x: tile.x,
        y: tile.y,
        bounds,
        center: {
          lat: (bounds.north + bounds.south) / 2,
          lng: (bounds.east + bounds.west) / 2,
        },
        cellSize: CELL_SIZE_M,
        cells: [],
      };
    }

    tiles[key].cells.push(cell);
  }

  console.log(`[Tiles] Grouped into ${Object.keys(tiles).length} tiles`);

  // 6. Write tiles to disk
  const outDir = path.join(process.cwd(), "public/data/tiles/bucharest-z14");
  await fs.mkdir(outDir, { recursive: true });

  console.log(`[Tiles] Writing tiles to ${outDir}...`);
  let tileCount = 0;
  for (const [key, tile] of Object.entries(tiles)) {
    await fs.writeFile(path.join(outDir, `${key}.json`), JSON.stringify(tile, null, 2));
    tileCount++;
  }

  // 7. Write metadata
  const metadata = {
    generated: new Date().toISOString(),
    version: "1.0",
    city: "Bucharest",
    zoom: ZOOM,
    cellSize: CELL_SIZE_M,
    bounds: BUCHAREST_BOUNDS,
    tileCount,
    cellCount: processedCells.length,
    pois: poiSummary,
    stats: {
      avgIntelligenceScore:
        processedCells.reduce((sum, c) => sum + c.intelligenceScore, 0) / processedCells.length,
      minDistMetroM: Math.min(...processedCells.map((c) => c.distMetroM)),
      maxDistMetroM: Math.max(...processedCells.map((c) => c.distMetroM)),
      avgDistMetroM:
        processedCells.reduce((sum, c) => sum + c.distMetroM, 0) / processedCells.length,
      globalMedianEurM2,
    },
  };

  await fs.writeFile(
    path.join(process.cwd(), "public/data/tiles/metadata.json"),
    JSON.stringify(metadata, null, 2),
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(
    `[Tiles] ✓ Generated ${tileCount} tiles with ${processedCells.length} cells in ${duration}s`,
  );
  console.log(`[Tiles] Metadata:`, metadata.stats);

  return metadata;
}

// CLI execution
if (require.main === module) {
  buildAreaTiles()
    .then(() => {
      console.log("[Tiles] Done!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Tiles] Error:", err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
