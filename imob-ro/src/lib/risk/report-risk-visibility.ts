import type { RiskLayerKey } from "./types";

/**
 * Risk layers hidden from web report + PDF until we scale beyond Bucharest.
 * Re-enable per city via feature flags / city config later.
 */
export const RISK_LAYERS_HIDDEN_IN_REPORT: ReadonlySet<RiskLayerKey> = new Set(["flood"]);

export function isRiskLayerShownInReport(key: RiskLayerKey): boolean {
  return !RISK_LAYERS_HIDDEN_IN_REPORT.has(key);
}

export function filterRiskLayersForReport(keys: RiskLayerKey[]): RiskLayerKey[] {
  return keys.filter(isRiskLayerShownInReport);
}
