/**
 * Area Pages v2 - Data Transfer Objects
 * 
 * Type definitions for area detail pages with KPIs, time series, tiles, and listings.
 */

/**
 * Core area KPIs and metadata
 */
export interface AreaKpis {
  slug: string;
  name: string;
  city: string;
  population?: number;
  listingsNow: number;
  medianEurM2: number;
  medianEurM2Change30d: number;      // % change
  medianEurM2Change12m: number;      // % change
  medianRentEurM2?: number;
  yieldNet?: number;                  // % (e.g., 0.06 = 6%)
  ttsMedianDays?: number;
  seismicMix?: {
    none: number;      // % of buildings with no risk
    RS3: number;       // % low risk
    RS2: number;       // % medium risk
    RS1: number;       // % high risk
  };
}

/**
 * Time series data point (daily or weekly)
 */
export interface AreaSeries {
  date: string;          // YYYY-MM-DD
  eurM2?: number;        // Median price per m²
  rentEurM2?: number;    // Median rent per m²
  yieldNet?: number;     // Net yield %
  ttsDays?: number;      // Median TTS in days
  supply?: number;       // Number of active listings
  demandScore?: number;  // 0-100 demand score
}

/**
 * Mini-heatmap tile grid for area visualization
 */
export interface AreaTilesSummary {
  bounds: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  cells: Array<{
    x: number;           // Grid column (0-indexed)
    y: number;           // Grid row (0-indexed)
    lat: number;         // Center latitude
    lng: number;         // Center longitude
    eurM2?: number;      // Median price per m²
    demand?: number;     // Demand score 0-100
    count?: number;      // Number of listings in cell
  }>;
  metro: Array<{
    name: string;
    lat: number;
    lng: number;
  }>;
  gridSize: {
    cols: number;        // Number of columns
    rows: number;        // Number of rows
    cellSizeM: number;   // Cell size in meters (approx)
  };
}

/**
 * Listing summary for "Best Now" section
 */
export interface ListingSummary {
  id: string;
  groupId?: string;
  href: string;
  mediaUrl?: string;
  priceEur: number;
  eurM2: number;
  avmBadge?: 'under' | 'fair' | 'over';
  tts?: string;                // e.g., "sub 60 zile"
  yieldNet?: number;           // Net yield %
  seismic?: string;            // e.g., "RS1"
  distMetroM?: number;
  areaM2: number;
  rooms: number;
  floor?: string;              // e.g., "3/10"
  yearBuilt?: number;
  areaName: string;
  title: string;
  sourceHost?: string;
  faviconUrl?: string;
}

/**
 * Neighboring area summary for comparison
 */
export interface NeighborArea {
  slug: string;
  name: string;
  medianEurM2: number;
  medianEurM2Change30d?: number;
  listingsNow?: number;
  distanceKm?: number;         // Distance from current area
}

/**
 * Complete area page data bundle
 */
export interface AreaPageData {
  kpis: AreaKpis;
  series: AreaSeries[];        // Time series (180-365 days)
  tiles: AreaTilesSummary;     // Mini-heatmap grid
  best: ListingSummary[];      // Top 6 listings (underpriced, high yield, fast TTS)
  neighbors: NeighborArea[];   // Adjacent/nearby areas
  faq?: Array<{
    question: string;
    answer: string;
  }>;
}

/**
 * Chart data range options
 */
export type ChartRange = '3m' | '6m' | '12m';

/**
 * Chart tab types
 */
export type ChartTab = 'price' | 'rent' | 'yield' | 'tts' | 'supply';

/**
 * Compare areas data structure
 */
export interface AreaComparison {
  areas: Array<{
    slug: string;
    name: string;
    medianEurM2: number;
    medianRentEurM2?: number;
    yieldNet?: number;
    ttsMedianDays?: number;
    listingsNow: number;
  }>;
  metrics: Array<{
    key: string;
    label: string;
    values: number[];      // Parallel to areas array
    unit?: string;
  }>;
}
