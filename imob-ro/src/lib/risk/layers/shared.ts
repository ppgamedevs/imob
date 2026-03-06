import type { RiskLayerKey, RiskLayerResult, RiskLevel } from "../types";

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 70) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function resolveLocation(features: Record<string, unknown>) {
  return {
    lat: typeof features.lat === "number" ? features.lat : null,
    lng: typeof features.lng === "number" ? features.lng : null,
    addressRaw:
      typeof features.addressRaw === "string"
        ? features.addressRaw
        : typeof features.address === "string"
          ? features.address
          : null,
    areaSlug: typeof features.areaSlug === "string" ? features.areaSlug : null,
  };
}

export function unknownRiskLayer(
  key: RiskLayerKey,
  summary: string,
  details: string[],
): RiskLayerResult {
  return {
    key,
    level: "unknown",
    score: null,
    confidence: null,
    summary,
    details,
    sourceName: "Data not integrated yet",
    sourceUrl: null,
    updatedAt: null,
  };
}
