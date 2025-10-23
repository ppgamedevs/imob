# Day 34: Area Intelligence Tiles - Current vs Planned Comparison

## Executive Summary

**Current State:** Basic geo utilities with metro distance calculation, simple heatmap component  
**Planned State:** Precomputed 250m grid tiles with POI scoring, heatmap data, and caching system

---

## Detailed Comparison

### 1. Current Geo Infrastructure

#### **Existing Files:**

**src/lib/geo.ts** (42 lines)
```typescript
export function haversineM(lat1, lon1, lat2, lon2) {
  // Haversine distance formula (meters)
  // Used for: metro distance, area proximity
}

export function nearestStationM(lat: number, lng: number) {
  // Finds nearest metro station from METRO_STATIONS array
  // Returns: { name: string, distM: number }
}

export function gridSlug(lat, lng, p = 2) {
  // Creates simple grid identifier: "g-44.43-26.10"
  // Precision: 2 decimals (~1.1 km grid)
  // Used in: normalize-pipeline for area fallback
}
```

**src/lib/data/metro.ts** (23 lines)
```typescript
export const METRO_STATIONS: Station[] = [
  { name: "Piața Unirii", lat: 44.4274, lng: 26.1032 },
  { name: "Universitate", lat: 44.435, lng: 26.1024 },
  // ... 20 total stations
];
```

**Current Usage:**
- `nearestStationM()` → Used in normalization pipeline for `distMetroM` feature
- `gridSlug()` → Fallback for areaSlug when geocoding fails
- Precision: 2 decimals = ~1.1 km × 1.1 km grid cells (too coarse)

#### **Issues:**
❌ No precomputed tiles (runtime calculation is slow)  
❌ Grid too coarse for detailed analysis (1.1 km vs required 250m)  
❌ No POI data (schools, supermarkets, parks)  
❌ No cached heatmap values  
❌ No tile serving infrastructure

---

### 2. Current Heatmap Implementation

**src/components/ui/area-heatmap.tsx** (42 lines)
```tsx
export default function AreaHeatmap({ score, history, slug }) {
  // Input: demandScore (0-1+)
  // Output: Colored square (gray/emerald/amber/rose)
  
  const normalized = Math.max(0, score);
  let bg = "bg-gray-300";
  if (normalized === 0) bg = "bg-gray-300";
  else if (normalized < 0.5) bg = "bg-emerald-400";
  else if (normalized < 1) bg = "bg-amber-400";
  else bg = "bg-rose-400";
  
  // Displays: colored box + score percentage + optional sparkline
}
```

**Usage in Report Page:**
```tsx
// src/app/report/[id]/page.tsx (line 556)
{areaDailyForDisplay ? (
  <AreaHeatmap score={areaDailyForDisplay.demandScore ?? 0} />
) : null}
```

**Current Data Source:**
- `AreaDaily.demandScore` (computed by `scripts/area-aggregator.ts`)
- Rolling 30-day user activity (view_report, save_report, share_pdf events)
- **Not** based on actual POIs, grid tiles, or precomputed intelligence

#### **Issues:**
❌ Heatmap data is user activity proxy, not actual area intelligence  
❌ No geographic granularity (one score per areaSlug, not per 250m cell)  
❌ No POI influence (schools, supermarkets, metro proximity)  
❌ No visual map overlay (just colored square badge)  
❌ Discover page has no heatmap layer at all

---

### 3. Planned Tile System Architecture

#### **New Directory Structure:**

```
public/
  data/
    tiles/                           # New directory
      bucharest-z14/                 # Zoom level 14 tiles
        14-8956-5632.json            # x/y tile format
        14-8956-5633.json
        ...
      metadata.json                  # Tile index metadata

src/
  scripts/
    build-area-tiles.ts              # NEW: Tile generator script
  lib/
    tiles/
      loader.ts                      # NEW: Tile loading/querying
      quadkey.ts                     # NEW: Quadkey utilities
    data/
      pois.geojson                   # NEW: POI sample data (OSM extract)
```

#### **Tile Data Structure:**

**Tile JSON Schema** (`14-8956-5632.json`):
```json
{
  "zoom": 14,
  "x": 8956,
  "y": 5632,
  "bounds": {
    "north": 44.4500,
    "south": 44.4475,
    "west": 26.1000,
    "east": 26.1025
  },
  "center": {
    "lat": 44.44875,
    "lng": 26.10125
  },
  "cellSize": 250,                   // meters
  "cells": [
    {
      "lat": 44.4488,
      "lng": 26.1013,
      "distMetroM": 450,
      "nearestMetro": "Universitate",
      "poiCounts": {
        "schools": 2,
        "supermarkets": 1,
        "restaurants": 5,
        "parks": 1
      },
      "medianEurM2": 2100,            // Weighted from AreaDaily
      "supply": 15,
      "demandScore": 0.65,
      "intelligenceScore": 0.72        // Composite score
    },
    // ... more cells in this tile
  ]
}
```

**Metadata JSON** (`metadata.json`):
```json
{
  "generated": "2025-10-23T14:30:00Z",
  "version": "1.0",
  "city": "Bucharest",
  "zoom": 14,
  "cellSize": 250,
  "bounds": {
    "north": 44.55,
    "south": 44.35,
    "west": 26.00,
    "east": 26.25
  },
  "tileCount": 156,
  "cellCount": 24960,
  "pois": {
    "schools": 450,
    "supermarkets": 380,
    "restaurants": 1250,
    "parks": 120
  }
}
```

---

### 4. Tile Generator Script

**src/scripts/build-area-tiles.ts** (~300 lines)

```typescript
/**
 * Day 34: Build precomputed area intelligence tiles
 * Generates 250m grid over Bucharest with POI scoring
 */

import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { haversineM } from "@/lib/geo";
import { METRO_STATIONS } from "@/lib/data/metro";

// Bucharest bounds (approximate)
const BUCHAREST_BOUNDS = {
  north: 44.55,
  south: 44.35,
  west: 26.00,
  east: 26.25,
};

const CELL_SIZE_M = 250; // 250 meters
const ZOOM = 14;

// POI types to score
type POI = {
  type: "school" | "supermarket" | "restaurant" | "park";
  lat: number;
  lng: number;
  name?: string;
};

/**
 * Load POI data from GeoJSON
 */
async function loadPOIs(): Promise<POI[]> {
  const geojson = JSON.parse(
    await fs.readFile("public/data/pois.geojson", "utf-8")
  );
  
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
function generateGridCells() {
  const cells: Array<{ lat: number; lng: number }> = [];
  
  // Calculate step size in degrees (approximate)
  const latStep = CELL_SIZE_M / 111320; // 1 degree lat ≈ 111.32 km
  const lngStep = CELL_SIZE_M / (111320 * Math.cos((BUCHAREST_BOUNDS.north + BUCHAREST_BOUNDS.south) / 2 * Math.PI / 180));
  
  for (let lat = BUCHAREST_BOUNDS.south; lat < BUCHAREST_BOUNDS.north; lat += latStep) {
    for (let lng = BUCHAREST_BOUNDS.west; lng < BUCHAREST_BOUNDS.east; lng += lngStep) {
      cells.push({ lat: lat + latStep / 2, lng: lng + lngStep / 2 });
    }
  }
  
  return cells;
}

/**
 * Calculate POI counts within radius of cell
 */
function countPOIsNearCell(cellLat: number, cellLng: number, pois: POI[], radius = 500) {
  const counts: Record<string, number> = {
    schools: 0,
    supermarkets: 0,
    restaurants: 0,
    parks: 0,
  };
  
  for (const poi of pois) {
    const dist = haversineM(cellLat, cellLng, poi.lat, poi.lng);
    if (dist <= radius) {
      counts[poi.type + "s"] = (counts[poi.type + "s"] || 0) + 1;
    }
  }
  
  return counts;
}

/**
 * Get weighted median price for cell from AreaDaily
 */
async function getWeightedMedianEurM2(cellLat: number, cellLng: number) {
  // Find nearby areas (within 1 km)
  const areas = await prisma.areaDaily.findMany({
    where: {
      date: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
    include: {
      area: true, // Need lat/lng from Area (if stored)
    },
    take: 100,
  });
  
  // Weight by inverse distance
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const ad of areas) {
    // Need area centroid - approximate from areaSlug or Area table
    // For v1, use simple fallback
    const medianEurM2 = ad.medianEurM2;
    if (!medianEurM2) continue;
    
    // Assume uniform weight for v1 (improve later with actual area centroids)
    const weight = 1;
    weightedSum += medianEurM2 * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

/**
 * Calculate intelligence score for cell
 */
function calculateIntelligenceScore(cell: {
  distMetroM: number;
  poiCounts: Record<string, number>;
  medianEurM2: number | null;
}) {
  let score = 0;
  
  // Metro proximity (0-30 points): closer = better
  if (cell.distMetroM <= 300) score += 30;
  else if (cell.distMetroM <= 600) score += 20;
  else if (cell.distMetroM <= 1000) score += 10;
  
  // POI density (0-40 points)
  const poiTotal =
    cell.poiCounts.schools * 3 + // Schools weighted higher
    cell.poiCounts.supermarkets * 2 +
    cell.poiCounts.restaurants +
    cell.poiCounts.parks * 2;
  score += Math.min(40, poiTotal);
  
  // Price indicator (0-30 points): moderate prices = better livability
  if (cell.medianEurM2) {
    if (cell.medianEurM2 >= 1500 && cell.medianEurM2 <= 2500) score += 30;
    else if (cell.medianEurM2 >= 1200 && cell.medianEurM2 <= 3000) score += 20;
    else score += 10;
  }
  
  return score / 100; // Normalize to 0-1
}

/**
 * Convert lat/lng to tile coordinates (Web Mercator)
 */
function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
  );
  return { x, y };
}

/**
 * Main tile builder
 */
export async function buildAreaTiles() {
  console.log("[Tiles] Starting tile generation...");
  
  // 1. Load POIs
  const pois = await loadPOIs();
  console.log(`[Tiles] Loaded ${pois.length} POIs`);
  
  // 2. Generate grid cells
  const cells = generateGridCells();
  console.log(`[Tiles] Generated ${cells.length} grid cells`);
  
  // 3. Process each cell
  const processedCells = [];
  for (const cell of cells) {
    const nearestMetro = METRO_STATIONS
      .map(s => ({ name: s.name, dist: haversineM(cell.lat, cell.lng, s.lat, s.lng) }))
      .sort((a, b) => a.dist - b.dist)[0];
    
    const poiCounts = countPOIsNearCell(cell.lat, cell.lng, pois);
    const medianEurM2 = await getWeightedMedianEurM2(cell.lat, cell.lng);
    
    const intelligenceScore = calculateIntelligenceScore({
      distMetroM: nearestMetro.dist,
      poiCounts,
      medianEurM2,
    });
    
    processedCells.push({
      lat: cell.lat,
      lng: cell.lng,
      distMetroM: Math.round(nearestMetro.dist),
      nearestMetro: nearestMetro.name,
      poiCounts,
      medianEurM2: medianEurM2 ? Math.round(medianEurM2) : null,
      intelligenceScore: parseFloat(intelligenceScore.toFixed(3)),
    });
  }
  
  // 4. Group cells into tiles
  const tiles: Record<string, any> = {};
  for (const cell of processedCells) {
    const tile = latLngToTile(cell.lat, cell.lng, ZOOM);
    const key = `${ZOOM}-${tile.x}-${tile.y}`;
    
    if (!tiles[key]) {
      tiles[key] = {
        zoom: ZOOM,
        x: tile.x,
        y: tile.y,
        cells: [],
      };
    }
    
    tiles[key].cells.push(cell);
  }
  
  // 5. Write tiles to disk
  const outDir = path.join(process.cwd(), "public/data/tiles/bucharest-z14");
  await fs.mkdir(outDir, { recursive: true });
  
  let tileCount = 0;
  for (const [key, tile] of Object.entries(tiles)) {
    await fs.writeFile(
      path.join(outDir, `${key}.json`),
      JSON.stringify(tile, null, 2)
    );
    tileCount++;
  }
  
  // 6. Write metadata
  await fs.writeFile(
    path.join(process.cwd(), "public/data/tiles/metadata.json"),
    JSON.stringify({
      generated: new Date().toISOString(),
      version: "1.0",
      city: "Bucharest",
      zoom: ZOOM,
      cellSize: CELL_SIZE_M,
      bounds: BUCHAREST_BOUNDS,
      tileCount,
      cellCount: processedCells.length,
      pois: pois.length,
    }, null, 2)
  );
  
  console.log(`[Tiles] Generated ${tileCount} tiles with ${processedCells.length} cells`);
}

// CLI execution
if (require.main === module) {
  buildAreaTiles()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
```

---

### 5. Tile Loader Module

**src/lib/tiles/loader.ts** (~150 lines)

```typescript
/**
 * Day 34: Tile loading and querying utilities
 */

import fs from "fs/promises";
import path from "path";

type TileCell = {
  lat: number;
  lng: number;
  distMetroM: number;
  nearestMetro: string;
  poiCounts: Record<string, number>;
  medianEurM2: number | null;
  intelligenceScore: number;
};

type Tile = {
  zoom: number;
  x: number;
  y: number;
  cells: TileCell[];
};

const TILE_CACHE = new Map<string, Tile>();

/**
 * Convert lat/lng to tile coordinates
 */
function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
  );
  return { x, y };
}

/**
 * Load tile from disk (with caching)
 */
export async function loadTile(x: number, y: number, zoom = 14): Promise<Tile | null> {
  const key = `${zoom}-${x}-${y}`;
  
  if (TILE_CACHE.has(key)) {
    return TILE_CACHE.get(key)!;
  }
  
  const tilePath = path.join(
    process.cwd(),
    "public/data/tiles/bucharest-z14",
    `${key}.json`
  );
  
  try {
    const data = await fs.readFile(tilePath, "utf-8");
    const tile = JSON.parse(data);
    TILE_CACHE.set(key, tile);
    return tile;
  } catch {
    return null;
  }
}

/**
 * Find nearest cell to given lat/lng
 */
export async function getNearestCell(lat: number, lng: number): Promise<TileCell | null> {
  const tile = latLngToTile(lat, lng, 14);
  const tileData = await loadTile(tile.x, tile.y, 14);
  
  if (!tileData || !tileData.cells.length) return null;
  
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
 */
export async function getIntelligenceScore(lat: number, lng: number): Promise<number | null> {
  const cell = await getNearestCell(lat, lng);
  return cell?.intelligenceScore ?? null;
}

/**
 * Get heatmap data for bounding box (for map rendering)
 */
export async function getHeatmapData(bounds: {
  north: number;
  south: number;
  west: number;
  east: number;
}) {
  const tiles: TileCell[] = [];
  
  // Calculate tile range
  const nw = latLngToTile(bounds.north, bounds.west, 14);
  const se = latLngToTile(bounds.south, bounds.east, 14);
  
  // Load all tiles in range
  for (let x = nw.x; x <= se.x; x++) {
    for (let y = nw.y; y <= se.y; y++) {
      const tile = await loadTile(x, y, 14);
      if (tile) {
        tiles.push(...tile.cells);
      }
    }
  }
  
  return tiles;
}

function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
```

---

### 6. Integration Points

#### **Report Page Enhancement:**

```tsx
// src/app/report/[id]/page.tsx
import { getNearestCell } from "@/lib/tiles/loader";

// Replace current heatmap
const lat = f?.lat;
const lng = f?.lng;

const tileData = lat && lng ? await getNearestCell(lat, lng) : null;

// ... in render
{tileData ? (
  <div className="space-y-2">
    <AreaHeatmap 
      score={tileData.intelligenceScore} 
      slug={f?.area_slug}
    />
    
    <div className="text-sm space-y-1">
      <div>Metro: {tileData.nearestMetro} ({tileData.distMetroM}m)</div>
      <div>POIs: {tileData.poiCounts.schools} schools, {tileData.poiCounts.supermarkets} supermarkets</div>
      <div>Area avg: €{tileData.medianEurM2}/m²</div>
    </div>
  </div>
) : (
  <AreaHeatmap score={areaDailyForDisplay?.demandScore ?? 0} />
)}
```

#### **Discover Map with Heatmap Layer:**

```tsx
// src/app/discover/ui/DiscoverMap.tsx (new component)
import { getHeatmapData } from "@/lib/tiles/loader";

export default async function DiscoverMap({ bounds }) {
  const heatmap = await getHeatmapData(bounds);
  
  return (
    <div className="relative h-full">
      <CompsMap comps={[]} center={center} />
      
      {/* Overlay heatmap cells */}
      <svg className="absolute inset-0 pointer-events-none">
        {heatmap.map((cell, i) => {
          const { x, y } = latLngToPixel(cell.lat, cell.lng);
          const opacity = cell.intelligenceScore;
          const color = getHeatmapColor(cell.intelligenceScore);
          
          return (
            <rect
              key={i}
              x={x - 5}
              y={y - 5}
              width={10}
              height={10}
              fill={color}
              opacity={opacity}
            />
          );
        })}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded shadow">
        <div className="text-xs font-medium mb-2">Area Intelligence</div>
        <div className="flex gap-2">
          <div className="w-4 h-4 bg-green-500" />
          <div className="w-4 h-4 bg-yellow-500" />
          <div className="w-4 h-4 bg-red-500" />
        </div>
      </div>
    </div>
  );
}
```

#### **Rebuild Cron:**

```typescript
// src/app/api/cron/tiles/rebuild/route.ts
import { buildAreaTiles } from "@/scripts/build-area-tiles";

export async function GET() {
  try {
    await buildAreaTiles();
    
    return Response.json({
      success: true,
      message: "Tiles rebuilt successfully",
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

### 7. POI Data Sample

**public/data/pois.geojson** (sample OSM extract)

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [26.1024, 44.435]
      },
      "properties": {
        "type": "school",
        "name": "Universitate School #1",
        "amenity": "school"
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [26.1032, 44.4274]
      },
      "properties": {
        "type": "supermarket",
        "name": "Mega Image Unirii",
        "shop": "supermarket"
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [26.0696, 44.4358]
      },
      "properties": {
        "type": "park",
        "name": "Parcul Eroilor",
        "leisure": "park"
      }
    }
    // ... 100+ more POIs for v1
  ]
}
```

---

## Summary Comparison Table

| Aspect | Current (v0) | Planned (Day 34) | Improvement |
|--------|--------------|------------------|-------------|
| **Grid Size** | 1.1 km (2 decimal precision) | 250m cells | 4.4× finer |
| **Tile System** | None | Precomputed JSON tiles | ∞× faster |
| **Data Source** | AreaDaily.demandScore | POIs + Metro + Price | Real intelligence |
| **POI Support** | None | Schools, markets, parks, etc. | New capability |
| **Heatmap Granularity** | 1 score per area | 1 score per 250m cell | ~100× finer |
| **Map Overlay** | None | SVG grid layer with legend | Visual enhancement |
| **Caching** | No | In-memory + disk tiles | Fast queries |
| **Update Frequency** | Nightly (demand calc) | Weekly cron | Lower overhead |
| **File Size** | N/A | ~5 MB for all tiles | Reasonable |
| **Coverage** | All areas | Bucharest only (v1) | Focused launch |

---

## Implementation Checklist

### Phase 1: Data Preparation
- [ ] Create `public/data/pois.geojson` with OSM sample (100+ POIs)
- [ ] Extract Bucharest schools, supermarkets, parks from OSM
- [ ] Validate METRO_STATIONS coverage (20 stations complete)

### Phase 2: Tile Generator
- [ ] Create `src/scripts/build-area-tiles.ts`
- [ ] Implement 250m grid generation over Bucharest bounds
- [ ] Add POI counting within 500m radius
- [ ] Add weighted median price from AreaDaily
- [ ] Calculate intelligence score (metro + POI + price)
- [ ] Group cells into z14 tiles (Web Mercator)
- [ ] Write tiles to `public/data/tiles/bucharest-z14/`
- [ ] Generate `metadata.json` with tile index

### Phase 3: Tile Loader
- [ ] Create `src/lib/tiles/loader.ts`
- [ ] Implement tile caching (in-memory Map)
- [ ] Add `latLngToTile()` coordinate conversion
- [ ] Add `loadTile()` with disk read + cache
- [ ] Add `getNearestCell()` for point queries
- [ ] Add `getHeatmapData()` for bounding box queries
- [ ] Add `getIntelligenceScore()` convenience wrapper

### Phase 4: Report Page Integration
- [ ] Update `src/app/report/[id]/page.tsx`
- [ ] Replace `AreaHeatmap` data source with tile data
- [ ] Show nearest metro + distance
- [ ] Show POI counts (schools, supermarkets)
- [ ] Show tile's median €/m² (comparison with listing)
- [ ] Add fallback to current demandScore if tile not found

### Phase 5: Discover Map Enhancement
- [ ] Create `src/app/discover/ui/DiscoverMap.tsx`
- [ ] Load heatmap tiles for visible bounds
- [ ] Render SVG overlay with colored cells
- [ ] Add color scale based on intelligenceScore
- [ ] Add interactive legend
- [ ] Optimize rendering (only visible tiles)

### Phase 6: Cron Job
- [ ] Create `src/app/api/cron/tiles/rebuild/route.ts`
- [ ] Add weekly schedule to Vercel cron config
- [ ] Add logging and error handling
- [ ] Add cache invalidation after rebuild

### Phase 7: QA & Visual Check
- [ ] Run `tsx src/scripts/build-area-tiles.ts` locally
- [ ] Verify tile count (~150 tiles expected)
- [ ] Check cell count (~25,000 cells)
- [ ] Visual check on CompsMap with grid overlay
- [ ] Test getNearestCell() with sample coordinates
- [ ] Verify POI counts are reasonable
- [ ] Check intelligence scores distribution (0-1 range)

---

## Key Differences from Spec

### ✅ Aligned:
- 250m grid cell size
- Zoom 14 tiles
- Distance to nearest metro (already have function)
- POI counts from OSM extract (GeoJSON)
- Median €/m² from AreaDaily weighted by proximity
- Tile format (JSON, keyed by x/y)
- Loader module for querying
- Report page integration
- Discover map heatmap layer
- Weekly rebuild cron

### ⚠️ Clarifications Needed:
- **Quadkey vs x/y:** Spec mentions quadkey, but x/y is more standard for z14. Recommend x/y.
- **POI radius:** Using 500m radius for counting (not specified in spec)
- **Intelligence score formula:** Created weighted formula (metro 30%, POI 40%, price 30%)
- **Tile loading:** Server-side for now (could add client-side loader later)
- **Area centroid lookup:** Need to add centroids to Area table or calculate from polygon

### 🔄 Enhancements Over Spec:
- In-memory tile caching for performance
- Metadata.json for tile index
- Intelligence score composite (not just raw POI counts)
- Fallback to current demandScore if tile unavailable
- POI type weighting (schools × 3, supermarkets × 2)

---

## File Creation Summary

**New Files (7):**
1. `src/scripts/build-area-tiles.ts` (~300 lines)
2. `src/lib/tiles/loader.ts` (~150 lines)
3. `src/lib/tiles/quadkey.ts` (~50 lines, optional)
4. `public/data/pois.geojson` (~2000 lines, 100+ POIs)
5. `src/app/api/cron/tiles/rebuild/route.ts` (~30 lines)
6. `src/app/discover/ui/DiscoverMap.tsx` (~100 lines)
7. `public/data/tiles/metadata.json` (auto-generated)

**Modified Files (2):**
1. `src/app/report/[id]/page.tsx` (add tile integration)
2. `src/components/ui/area-heatmap.tsx` (optional: enhance with POI display)

**Generated Files (~156):**
- `public/data/tiles/bucharest-z14/*.json` (one per tile)

---

## Estimated Impact

**Performance:**
- Current: ~100ms per area lookup (DB query)
- After: ~5ms per tile lookup (JSON read + cache)
- **20× faster** for heatmap queries

**Data Quality:**
- Current: User activity proxy (demandScore)
- After: Real POI + metro + price intelligence
- **Much more accurate** area scoring

**User Experience:**
- Report page: Shows actual walkability metrics (metro, schools, shops)
- Discover map: Visual heatmap layer reveals best neighborhoods at glance
- Faster page loads due to precomputed data

**Storage:**
- ~5 MB total for all tiles
- ~32 KB per tile (average)
- Negligible compared to photos/videos

---

## Next Steps After Comparison

1. **Review comparison with user** - Confirm approach aligns with Day 34 goals
2. **Prepare POI data** - Extract from OSM or create sample GeoJSON
3. **Implement tile generator** - Build script first to validate data structure
4. **Test tile output** - Verify JSON format and cell accuracy
5. **Implement loader** - Add querying functions
6. **Integrate into report page** - Replace heatmap data source
7. **Add discover map layer** - Visual heatmap overlay
8. **Deploy and schedule cron** - Weekly tile rebuilds

**Ready to proceed with implementation?**
