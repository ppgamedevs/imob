/**
 * Shared Zod schema and TypeScript types for the estimation engine.
 * Used by both the API route and any future consumer.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Input schema (Zod)
// ---------------------------------------------------------------------------

export const EstimateInputSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  addressText: z.string().max(300).optional(),
  zoneSlug: z.string().max(80).optional(),
  rooms: z.number().int().min(1).max(10),
  usableAreaM2: z.number().min(10).max(500),
  floor: z.number().int().min(-2).max(50).optional(),
  totalFloors: z.number().int().min(1).max(50).optional(),
  yearBuilt: z.number().int().min(1800).max(2035).optional(),
  yearBucket: z.enum(["<1977", "1978-1990", "1991-2005", "2006+"]).optional(),
  condition: z.enum(["nou", "renovat", "locuibil", "necesita_renovare", "de_renovat"]),
  hasElevator: z.boolean().optional(),
  hasParking: z.boolean().optional(),
  heatingType: z.enum(["RADET", "centrala", "pompa_caldura", "electric", "unknown"]).optional(),
  balconyM2: z.number().min(0).max(100).optional(),
  layoutType: z
    .enum(["decomandat", "semidecomandat", "circular", "nedecomandat", "unknown"])
    .optional(),
  isThermoRehab: z.boolean().optional(),
  photos: z.array(z.string().max(5_000_000)).max(5).optional(),
});

export type EstimateInput = z.infer<typeof EstimateInputSchema>;

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface EstimateComp {
  id: string;
  url?: string;
  priceEur: number;
  pricePerSqm: number;
  distanceMeters: number;
  similarityScore: number;
  source?: string;
}

export interface EstimateAdjustment {
  name: string;
  deltaPct: number;
  reason: string;
}

export interface EstimateLiquidity {
  daysMin?: number;
  daysMax?: number;
  label: "ridicata" | "medie" | "scazuta" | "necunoscuta";
  why?: string;
}

export interface EstimateRecommendation {
  title: string;
  impactEurMin: number;
  impactEurMax: number;
  why: string;
}

export interface EstimateRisk {
  type: string;
  severity: "low" | "medium" | "high";
  details: string;
}

export interface EstimateTightenTip {
  field: string;
  tip: string;
}

export interface EstimateLimits {
  freeCompsReturned: number;
  proCompsReturned: number;
  totalCompsAvailable: number;
  paywallActive: boolean;
}

export interface VisionAnalysis {
  condition: string;
  furnishing: string;
  brightness: number;
  layoutQuality: string | null;
  visibleIssues: string[];
  confidence: number;
  evidence: string;
}

export interface EstimateMeta {
  compsCount: number;
  dispersion: number;
  usedRadiusMeters: number;
  limits: EstimateLimits;
}

export interface EstimateOutput {
  fairLikely: number;
  range80: { min: number; max: number };
  range95: { min: number; max: number };
  confidence: number;
  confidenceWhy: string[];
  comps: EstimateComp[];
  adjustments: EstimateAdjustment[];
  liquidity: EstimateLiquidity;
  recommendations: EstimateRecommendation[];
  risks: EstimateRisk[];
  tightenTips: EstimateTightenTip[];
  meta: EstimateMeta;
  visionAnalysis?: VisionAnalysis;
}
