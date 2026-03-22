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
    title: typeof features.title === "string" ? features.title : null,
    addressRaw:
      typeof features.addressRaw === "string"
        ? features.addressRaw
        : typeof features.address_raw === "string"
          ? features.address_raw
          : typeof features.address === "string"
            ? features.address
            : null,
    areaSlug:
      typeof features.areaSlug === "string"
        ? features.areaSlug
        : typeof features.area_slug === "string"
          ? features.area_slug
          : null,
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
    sourceName: "Dataset neintegrat momentan",
    sourceUrl: null,
    updatedAt: null,
  };
}
