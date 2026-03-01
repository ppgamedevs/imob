/**
 * Centralized constants for scoring, filtering, and thresholds.
 * All magic numbers from across the codebase belong here.
 */

// --- AVM (Automated Valuation Model) ---
export const AVM_DEFAULT_EUR_M2 = 1800;
export const AVM_CITY_FALLBACK: Record<string, number> = { bucuresti: 1800 };
export const AVM_SPREAD_MIN = 0.06;
export const AVM_SPREAD_MAX = 0.18;
export const AVM_SPREAD_BASE = 0.12;
export const AVM_AREA_MIN = 8;
export const AVM_AREA_MAX = 1000;
export const AVM_FALLBACK_BASE_EUR_M2 = 1500;

// Floor adjustments (multiplicative)
export const ADJ_FLOOR_BASEMENT = 0.97;
export const ADJ_FLOOR_GOOD = 1.02; // etaje 1-3
export const ADJ_FLOOR_HIGH = 0.99;

// Year adjustments (multiplicative)
export const ADJ_YEAR_POST_2015 = 1.05;
export const ADJ_YEAR_POST_2000 = 1.03;
export const ADJ_YEAR_POST_1980 = 1.0;
export const ADJ_YEAR_POST_1960 = 0.98;
export const ADJ_YEAR_OLD = 0.95;

// Metro distance adjustments
export const ADJ_METRO_CLOSE = 1.05; // <=300m
export const ADJ_METRO_MEDIUM = 1.02; // <=600m
export const ADJ_METRO_NORMAL = 1.0; // <=1000m
export const ADJ_METRO_FAR = 0.97; // >1000m

// Condition adjustments
export const ADJ_CONDITION_BASE = 0.95;
export const ADJ_CONDITION_RANGE = 0.1;

// --- TTS (Time to Sell) ---
export const TTS_BASE_DAYS = 60;
export const TTS_OVERPRICED_FACTOR = 1.2;
export const TTS_UNDERPRICED_FACTOR = 0.8;
export const TTS_DEMAND_SENSITIVITY = 0.75;
export const TTS_DEMAND_MIN = 0.7;
export const TTS_DEMAND_MAX = 1.3;
export const TTS_MIN_DAYS = 10;
export const TTS_MAX_DAYS = 180;
export const TTS_CONSERVATIVE_MULTIPLIER = 1.2;
export const TTS_INTERVAL_SPREAD = 0.3; // +/- 30% for min/max range
export const TTS_CONDITION_SENSITIVITY = 0.16;
export const TTS_SMALL_AREA_BOOST = 0.9; // garsoniere sell faster
export const TTS_LARGE_AREA_PENALTY = 1.08;
export const TTS_SMALL_AREA_THRESHOLD = 35;
export const TTS_LARGE_AREA_THRESHOLD = 90;

export const TTS_SEASONALITY: Record<number, number> = {
  1: 1.1, 2: 0.98, 3: 0.92, 4: 0.9, 5: 0.92, 6: 0.96,
  7: 1.04, 8: 1.14, 9: 0.94, 10: 0.96, 11: 1.02, 12: 1.12,
};

// --- Comps ---
export const COMPS_DISTANCE_CAP_M = 1500;
export const COMPS_MAX_DISTANCE_M = 2500;
export const COMPS_AREA_TOLERANCE = 0.18; // 18% relative difference
export const COMPS_AREA_RANGE_LOW = 0.7;
export const COMPS_AREA_RANGE_HIGH = 1.3;
export const COMPS_MAX_AGE_DAYS = 180;
export const COMPS_FETCH_LIMIT = 500;
export const COMPS_TOP_N = 12;
export const COMPS_WEIGHT_DIST = 0.35;
export const COMPS_WEIGHT_AREA = 0.35;
export const COMPS_WEIGHT_ROOMS = 0.2;
export const COMPS_WEIGHT_YEAR = 0.1;

// --- Confidence ---
export const CONFIDENCE_COMPS_LOW = 3;
export const CONFIDENCE_COMPS_MEDIUM = 7;
export const CONFIDENCE_MAX_AGE_DAYS = 60;

// --- Seismic ---
export const SEISMIC_GEO_MATCH_RADIUS_M = 40;
export const SEISMIC_LEGACY_MATCH_RADIUS_M = 100;

// --- Rate Limiting ---
export const RATE_WINDOW_MS = parseInt(process.env.RATE_WINDOW_MS || "60000", 10);
export const RATE_MAX_REQUESTS = parseInt(process.env.RATE_MAX_REQUESTS || "30", 10);
export const RATE_BUCKET_MAX = 10000;

// --- Analysis Pipeline ---
export const ANALYSIS_DEDUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const ANALYSIS_POLL_TIMEOUT_MS = 5000;
export const ANALYSIS_POLL_INTERVAL_MS = 500;

// --- Currency ---
export const DEFAULT_EUR_TO_RON = Number(process.env.EXCHANGE_RATE_EUR_TO_RON) || 4.9;

// --- Geocoding ---
export const WALKING_SPEED_M_PER_MIN = 80;
export const DRIVING_SPEED_M_PER_MIN = 800;
export const EARTH_RADIUS_M = 6371000;
