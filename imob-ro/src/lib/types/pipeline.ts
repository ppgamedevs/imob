/**
 * Shared types for the analysis pipeline.
 * Used across normalize, AVM, TTS, seismic, comps, and quality steps.
 */

export interface NormalizedFeatures {
  title?: string | null;
  priceEur?: number | null;
  priceRon?: number | null;
  currency?: string | null;
  areaM2?: number | null;
  rooms?: number | null;
  level?: number | null;
  yearBuilt?: number | null;
  lat?: number | null;
  lng?: number | null;
  addressRaw?: string | null;
  areaSlug?: string | null;
  city?: string | null;
  addressComponents?: Record<string, string> | null;
  photos?: string[] | null;
  distMetroM?: number | null;
  timeToMetroMin?: number | null;
  conditionScore?: number | null;
  [key: string]: unknown;
}

export interface AvmResult {
  low: number | null;
  high: number | null;
  mid: number | null;
  conf: number;
  explain: Record<string, unknown>;
}

export interface TtsResult {
  bucket: "<30" | "30-60" | "60-90" | "90+";
  scoreDays: number;
  minMonths: number;
  maxMonths: number;
  estimateMonths: number;
  explain: Record<string, unknown>;
}

export type SeismicRiskClass = "RS1" | "RS2" | "RS3" | "RS4" | "None" | "Unknown";

export interface SeismicResult {
  riskClass: SeismicRiskClass;
  confidence: number;
  source?: string | null;
  method: "dataset-geo" | "dataset-address" | "heuristic";
  note?: string | null;
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ConfidenceResult {
  level: ConfidenceLevel;
  score: number;
  factors: {
    sampleSize: number;
    recency: boolean;
    geocodingQuality: "exact" | "area" | "none";
    featureCompleteness: number;
  };
}

export interface CompItem {
  analysisId: string;
  priceEur: number | null;
  areaM2: number | null;
  rooms: number | null;
  yearBuilt: number | null;
  lat: number | null;
  lng: number | null;
  areaSlug: string | null;
  similarity: number;
  distanceM: number | null;
  eurPerM2: number | null;
}

export interface PipelineContext {
  analysisId: string;
  url: string;
  html?: string | null;
  extracted?: Record<string, unknown> | null;
  features?: NormalizedFeatures | null;
  avm?: AvmResult | null;
  tts?: TtsResult | null;
  seismic?: SeismicResult | null;
  comps?: CompItem[] | null;
  confidence?: ConfidenceResult | null;
  error?: string | null;
}

export interface PipelineStep {
  name: string;
  run: (ctx: PipelineContext) => Promise<PipelineContext>;
}

/** Prisma Json field types for plan features */
export interface PlanFeatures {
  analyze?: number;
  pdf?: number;
  share?: number;
  support?: string;
  [key: string]: unknown;
}

/** Extracted listing shape from crawl adapters */
export interface ExtractedData {
  title?: string | null;
  price?: number | null;
  currency?: string | null;
  areaM2?: number | null;
  rooms?: number | null;
  floor?: number | null;
  yearBuilt?: number | null;
  lat?: number | null;
  lng?: number | null;
  addressRaw?: string | null;
  photos?: string[] | null;
  description?: string | null;
  sourceListingId?: string | null;
  [key: string]: unknown;
}
