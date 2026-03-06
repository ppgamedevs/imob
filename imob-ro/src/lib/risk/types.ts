export type RiskLevel = "low" | "medium" | "high" | "unknown";

export type RiskLayerKey = "seismic" | "flood" | "pollution" | "traffic";

export interface RiskLayerResult {
  key: RiskLayerKey;
  level: RiskLevel;
  score: number | null;
  confidence: number | null;
  summary: string;
  details?: string[];
  sourceName?: string | null;
  sourceUrl?: string | null;
  updatedAt?: string | null;
}

export interface RiskStackResult {
  overallScore: number | null;
  overallLevel: RiskLevel;
  layers: Record<RiskLayerKey, RiskLayerResult>;
  notes: string[];
}
