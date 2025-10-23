/**
 * Day 34: Tile Loading and Querying
 *
 * Provides utilities to:
 * - Load precomputed tiles with caching
 * - Find nearest cell for a given lat/lng
 * - Query tiles for map rendering
 * - Get intelligence scores for locations
 */

import fs from "fs/promises";
import path from "path";

export type TileCell = {
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

export type Tile = {
  zoom: number;
  x: number;
  y: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  center: {
    lat: number;
    lng: number;
  };
  cellSize: number;
  cells: TileCell[];
};

// In-memory cache for loaded tiles
const TILE_CACHE = new Map<string, Tile>();

/**
 * Convert lat/lng to tile coordinates (Web Mercator)
 */
export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

/**
 * Load tile from disk (with caching)
 */
export async function loadTile(x: number, y: number, zoom = 14): Promise<Tile | null> {
  const key = `${zoom}-${x}-${y}`;

  // Check cache first
  if (TILE_CACHE.has(key)) {
    return TILE_CACHE.get(key)!;
  }

  const tilePath = path.join(process.cwd(), "public/data/tiles/bucharest-z14", `${key}.json`);

  try {
    const data = await fs.readFile(tilePath, "utf-8");
    const tile: Tile = JSON.parse(data);
    TILE_CACHE.set(key, tile);
    return tile;
  } catch (error) {
    // Tile doesn't exist (outside Bucharest bounds or not generated)
    return null;
  }
}

/**
 * Haversine distance in meters
 */
function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Find nearest cell to given lat/lng
 *
 * Returns cell data including intelligence score, metro distance, POI counts, etc.
 */
export async function getNearestCell(
  lat: number,
  lng: number,
  zoom = 14,
): Promise<TileCell | null> {
  // Get tile coordinates for this location
  const tile = latLngToTile(lat, lng, zoom);

  // Load the tile
  const tileData = await loadTile(tile.x, tile.y, zoom);

  if (!tileData || !tileData.cells || tileData.cells.length === 0) {
    return null;
  }

  // Find nearest cell within tile
  let nearest = tileData.cells[0];
  let minDist = haversineDist(lat, lng, nearest.lat, nearest.lng);

  for (const cell of tileData.cells) {
    const dist = haversineDist(lat, lng, cell.lat, cell.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = cell;
    }
  }

  return nearest;
}

/**
 * Get intelligence score for location
 *
 * Convenience wrapper around getNearestCell
 */
export async function getIntelligenceScore(lat: number, lng: number): Promise<number | null> {
  const cell = await getNearestCell(lat, lng);
  return cell?.intelligenceScore ?? null;
}

/**
 * Get heatmap data for bounding box (for map rendering)
 *
 * Returns all cells within the given bounds for visualization
 */
export async function getHeatmapData(bounds: {
  north: number;
  south: number;
  west: number;
  east: number;
}): Promise<TileCell[]> {
  const cells: TileCell[] = [];
  const zoom = 14;

  // Calculate tile range covering the bounds
  const nw = latLngToTile(bounds.north, bounds.west, zoom);
  const se = latLngToTile(bounds.south, bounds.east, zoom);

  // Ensure proper order (min to max)
  const minX = Math.min(nw.x, se.x);
  const maxX = Math.max(nw.x, se.x);
  const minY = Math.min(nw.y, se.y);
  const maxY = Math.max(nw.y, se.y);

  // Load all tiles in range
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const tile = await loadTile(x, y, zoom);
      if (tile && tile.cells) {
        // Filter cells to only those within bounds
        const filteredCells = tile.cells.filter(
          (cell) =>
            cell.lat >= bounds.south &&
            cell.lat <= bounds.north &&
            cell.lng >= bounds.west &&
            cell.lng <= bounds.east,
        );
        cells.push(...filteredCells);
      }
    }
  }

  return cells;
}

/**
 * Get tile metadata
 */
export async function getTileMetadata(): Promise<any | null> {
  const metadataPath = path.join(process.cwd(), "public/data/tiles/metadata.json");

  try {
    const data = await fs.readFile(metadataPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Clear tile cache (useful after regenerating tiles)
 */
export function clearTileCache(): void {
  TILE_CACHE.clear();
}

/**
 * Get POI summary for a location (convenience method)
 */
export async function getPOISummary(
  lat: number,
  lng: number,
): Promise<TileCell["poiCounts"] | null> {
  const cell = await getNearestCell(lat, lng);
  return cell?.poiCounts ?? null;
}

/**
 * Get nearest metro station info for a location
 */
export async function getNearestMetroInfo(
  lat: number,
  lng: number,
): Promise<{ name: string; distM: number } | null> {
  const cell = await getNearestCell(lat, lng);
  if (!cell) return null;

  return {
    name: cell.nearestMetro,
    distM: cell.distMetroM,
  };
}
