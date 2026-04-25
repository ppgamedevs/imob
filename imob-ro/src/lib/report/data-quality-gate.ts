/**
 * Coarse data-quality guardrails for ImobIntel buyer reports.
 * Prevents weak inputs from driving confident copy (verdict, preview, PDF).
 */

import { computeConfidence } from "@/lib/scoring/confidence";
import type { RiskStackResult } from "@/lib/risk/types";
import type { RiskLayerResult } from "@/lib/risk/types";
import type { NormalizedFeatures } from "@/lib/types/pipeline";

export type ReportDataQuality = "strong" | "usable" | "weak" | "insufficient";

export type ReportDataQualityGateInput = {
  features: NormalizedFeatures;
  compCount: number;
  oldestCompDays?: number | null;
  hasPrice: boolean;
  hasArea: boolean;
  hasRooms: boolean;
  hasYearBuilt: boolean;
  /**
   * True when a model baseline exists (comparables fair range, area AVM, or score snapshot AVM).
   * Used with compCount to decide if a "price position" is meaningful.
   */
  hasAreaPriceBaseline: boolean;
  yieldGross: number | null;
  yieldNet: number | null;
  riskStack: RiskStackResult;
};

export type ReportDataQualityGate = {
  canShowPriceVerdict: boolean;
  canShowStrongBuyerVerdict: boolean;
  /**
   * "Pare scump" / clear under/over vs market — only when at least 3 comparables (rule 5).
   * Can be true while `canShowStrongBuyerVerdict` is false (e.g. missing year / risk layers).
   */
  canShowStrongPricePositionLanguage: boolean;
  canShowComps: boolean;
  canShowNegotiationArguments: boolean;
  canShowYield: boolean;
  /** When false, soften or hide neighborhood + contextual risk / vibe copy (rule 6). */
  canShowNeighborhoodRiskClaims: boolean;
  /** When true, surface year-built warning in UI (rule 7). */
  showYearBuiltWarning: boolean;
  /**
   * Contextual environment layers (poluare/trafic) are unknown placeholders — do not imply coverage.
   * UI should say we lack sufficient data (rule 8).
   */
  contextualRiskDataInsufficient: boolean;
  reportQuality: ReportDataQuality;
  reasonsRo: string[];
  geocodingQuality: "exact" | "area" | "none";
};

function isPlaceholderOrOffLayer(layer: RiskLayerResult | undefined): boolean {
  if (!layer) return true;
  if (layer.level !== "unknown") return false;
  const t = `${layer.sourceName ?? ""} ${layer.summary ?? ""}`.toLowerCase();
  return (
    t.includes("neintegrat") ||
    t.includes("indisponibile") ||
    t.includes("dataset") ||
    (t.includes("pregatit") && t.includes("integrat")) ||
    t.includes("nu influenteaza verdictul")
  );
}

function hasFiniteYieldGrossNet(gross: number | null, net: number | null): boolean {
  return (
    gross != null &&
    net != null &&
    Number.isFinite(gross) &&
    Number.isFinite(net) &&
    gross > 0 &&
    net > 0
  );
}

/**
 * Coarse gating for report, preview, PDF, and `VerdictInput.dataQuality`.
 */
export function buildReportDataQualityGate(input: ReportDataQualityGateInput): ReportDataQualityGate {
  const reasons: string[] = [];
  const {
    features,
    compCount: rawComp,
    hasPrice,
    hasArea,
    hasRooms,
    hasYearBuilt,
    hasAreaPriceBaseline,
    yieldGross,
    yieldNet,
    riskStack,
  } = input;
  const compCount = Math.max(0, Math.floor(rawComp));

  const conf = computeConfidence(
    features,
    compCount,
    input.oldestCompDays == null ? undefined : input.oldestCompDays,
  );
  const geocodingQuality = conf.factors.geocodingQuality;

  if (!hasPrice) {
    reasons.push("Lipsește prețul listat: nu putem ancoră concluzii de preț.");
  }
  if (!hasArea) {
    reasons.push("Lipsește suprafața: calitatea maximă a raportului nu poate fi «puternică».");
  }
  if (!hasRooms) {
    reasons.push("Numărul de camere e neclar: calitatea maximă a raportului nu poate fi «puternică».");
  }
  if (!hasYearBuilt) {
    reasons.push("Anul construcției lipsește: afectează risc, costuri și ancorarea comparației.");
  }
  if (compCount === 0 && !hasAreaPriceBaseline) {
    reasons.push("Fără comparabile și fără reper de preț pe zonă: suprimăm verdictul de poziționare pe piață.");
  }
  if (compCount > 0 && compCount < 3) {
    reasons.push("Sub 3 comparabile: evităm formulări tari «prea scump/ieftin» pe preț.");
  }
  if (geocodingQuality === "none") {
    reasons.push("Localizare slabă (fără coordonate / zonă): reducem afirmațiile despre cartier și riscuri contextuale.");
  } else if (geocodingQuality === "area" && compCount < 2) {
    reasons.push("Avem doar zonă, nu punct exact, și prea puține comparabile: ton moderat pe context.");
  }

  const pollution = riskStack.layers.pollution;
  const traffic = riskStack.layers.traffic;
  const contextualRiskDataInsufficient = isPlaceholderOrOffLayer(pollution) && isPlaceholderOrOffLayer(traffic);
  if (contextualRiskDataInsufficient) {
    reasons.push("Straturi de risc mediu: nu avem date suficiente integrare — nu explicăm acoperire completă.");
  }

  if (!hasFiniteYieldGrossNet(yieldGross, yieldNet)) {
    reasons.push("Randament: afișăm doar când modelul a produs atât brut cât și net, nu cifre estimate din gol.");
  }

  const canShowComps = compCount > 0;
  const canShowPriceVerdict = hasPrice && (compCount > 0 || hasAreaPriceBaseline);
  const canShowStrongPricePositionLanguage = canShowPriceVerdict && compCount >= 3;

  const locationWeak =
    geocodingQuality === "none" || (geocodingQuality === "area" && compCount < 2);
  const canShowNeighborhoodRiskClaims = hasPrice && !locationWeak;

  const canShowStrongBuyerVerdict =
    canShowPriceVerdict &&
    canShowStrongPricePositionLanguage &&
    hasArea &&
    hasRooms &&
    canShowNeighborhoodRiskClaims &&
    !contextualRiskDataInsufficient;

  const canShowNegotiationArguments = canShowPriceVerdict && (compCount > 0 || hasAreaPriceBaseline);
  const canShowYield = hasFiniteYieldGrossNet(yieldGross, yieldNet);

  let reportQuality: ReportDataQuality;
  if (!hasPrice) {
    reportQuality = "insufficient";
  } else if (!canShowPriceVerdict || (compCount === 0 && !hasAreaPriceBaseline)) {
    reportQuality = "weak";
  } else if (!hasArea || !hasRooms) {
    reportQuality = "usable";
  } else if (
    canShowStrongBuyerVerdict &&
    hasYearBuilt &&
    compCount >= 5 &&
    geocodingQuality === "exact"
  ) {
    reportQuality = "strong";
  } else if (compCount >= 3 && hasArea && hasRooms && canShowPriceVerdict) {
    reportQuality = "usable";
  } else {
    reportQuality = "weak";
  }

  return {
    canShowPriceVerdict,
    canShowStrongBuyerVerdict,
    canShowStrongPricePositionLanguage,
    canShowComps,
    canShowNegotiationArguments,
    canShowYield,
    canShowNeighborhoodRiskClaims,
    showYearBuiltWarning: hasPrice && !hasYearBuilt,
    contextualRiskDataInsufficient,
    reportQuality,
    reasonsRo: reasons,
    geocodingQuality,
  };
}
