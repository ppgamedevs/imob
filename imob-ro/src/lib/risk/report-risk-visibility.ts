import type { RiskLayerKey, RiskLayerResult } from "./types";

/**
 * Flood / inundații: produs — strat eliminat din UI. Păstrăm cheia în schema JSON doar pentru compatibilitate.
 * Folosit la normalizare ca să nu reapară texte vechi din DB („dataset neintegrat”, etc.).
 */
export const CANONICAL_HIDDEN_FLOOD_LAYER: RiskLayerResult = {
  key: "flood",
  level: "unknown",
  score: null,
  confidence: null,
  summary: "",
  details: [],
  sourceName: null,
  sourceUrl: null,
  updatedAt: null,
};

/**
 * Flood / inundații: product decision — never show in report or PDF (user request).
 * Keep computing a placeholder in DB optional; UI must not list this layer.
 */
export const RISK_LAYERS_HIDDEN_IN_REPORT: ReadonlySet<RiskLayerKey> = new Set(["flood"]);

/** Explicit allowlist for report UI (defensive — do not rely on Set alone). */
export const RISK_LAYER_KEYS_VISIBLE_IN_REPORT = [
  "seismic",
  "pollution",
  "traffic",
] as const satisfies readonly RiskLayerKey[];

export type ReportVisibleRiskLayerKey = (typeof RISK_LAYER_KEYS_VISIBLE_IN_REPORT)[number];

export function isRiskLayerShownInReport(key: RiskLayerKey): boolean {
  return (RISK_LAYER_KEYS_VISIBLE_IN_REPORT as readonly string[]).includes(key);
}

export function filterRiskLayersForReport(keys: RiskLayerKey[]): RiskLayerKey[] {
  return keys.filter(isRiskLayerShownInReport);
}
