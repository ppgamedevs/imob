import { buildSeismicRiskLayerFromExplain } from "./seismic-layer";
import {
  CANONICAL_HIDDEN_FLOOD_LAYER,
  filterRiskLayersForReport,
  RISK_LAYERS_HIDDEN_IN_REPORT,
} from "./report-risk-visibility";
import { computeOverall } from "./stack";
import type { RiskLayerKey, RiskLayerResult, RiskLevel, RiskStackResult } from "./types";

export { filterRiskLayersForReport, RISK_LAYERS_HIDDEN_IN_REPORT } from "./report-risk-visibility";

export const RISK_LAYER_LABELS: Record<RiskLayerKey, string> = {
  seismic: "Seismic",
  flood: "Inundatii",
  pollution: "Poluare",
  traffic: "Trafic",
};

export function riskLevelLabel(level: RiskLevel): string {
  if (level === "high") return "Ridicat";
  if (level === "medium") return "Mediu";
  if (level === "low") return "Scazut";
  return "Necunoscut";
}

export function sourceModeForLayer(key: RiskLayerKey): "official" | "proxy" {
  return key === "seismic" ? "official" : "proxy";
}

export function severityRank(level: RiskLevel): number {
  if (level === "high") return 0;
  if (level === "medium") return 1;
  if (level === "unknown") return 2;
  return 3;
}

export function scoreRank(layer: RiskLayerResult): number {
  return layer.score ?? -1;
}

export function orderRiskLayerKeys(layers: Record<RiskLayerKey, RiskLayerResult>): RiskLayerKey[] {
  return (["seismic", "flood", "pollution", "traffic"] as RiskLayerKey[]).sort((a, b) => {
    const severityDiff = severityRank(layers[a].level) - severityRank(layers[b].level);
    if (severityDiff !== 0) return severityDiff;

    const scoreDiff = scoreRank(layers[b]) - scoreRank(layers[a]);
    if (scoreDiff !== 0) return scoreDiff;

    const sourceDiff =
      Number(sourceModeForLayer(a) !== "official") - Number(sourceModeForLayer(b) !== "official");
    if (sourceDiff !== 0) return sourceDiff;

    return (
      ["seismic", "flood", "pollution", "traffic"].indexOf(a) -
      ["seismic", "flood", "pollution", "traffic"].indexOf(b)
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function makeUnknownLayer(key: RiskLayerKey): RiskLayerResult {
  return {
    key,
    level: "unknown",
    score: null,
    confidence: null,
    summary:
      "Date indisponibile momentan. Stratul este pregatit, dar dataset-ul nu este integrat inca.",
    details: ["Integrarea este in curs. Pana atunci, acest strat nu influenteaza verdictul final."],
    sourceName: "Dataset neintegrat momentan",
    sourceUrl: null,
    updatedAt: null,
  };
}

function normalizeLayer(
  key: RiskLayerKey,
  raw: unknown,
  fallback?: RiskLayerResult,
): RiskLayerResult {
  if (!isRecord(raw)) {
    return fallback ?? makeUnknownLayer(key);
  }

  return {
    key,
    level:
      raw.level === "low" ||
      raw.level === "medium" ||
      raw.level === "high" ||
      raw.level === "unknown"
        ? raw.level
        : (fallback?.level ?? "unknown"),
    score: typeof raw.score === "number" ? raw.score : (fallback?.score ?? null),
    confidence:
      typeof raw.confidence === "number" ? raw.confidence : (fallback?.confidence ?? null),
    summary:
      typeof raw.summary === "string" && raw.summary.trim().length > 0
        ? raw.summary
        : (fallback?.summary ?? makeUnknownLayer(key).summary),
    details: Array.isArray(raw.details)
      ? raw.details.filter((item): item is string => typeof item === "string")
      : (fallback?.details ?? makeUnknownLayer(key).details),
    sourceName:
      typeof raw.sourceName === "string" || raw.sourceName === null
        ? raw.sourceName
        : (fallback?.sourceName ?? null),
    sourceUrl:
      typeof raw.sourceUrl === "string" || raw.sourceUrl === null
        ? raw.sourceUrl
        : (fallback?.sourceUrl ?? null),
    updatedAt:
      typeof raw.updatedAt === "string" || raw.updatedAt === null
        ? raw.updatedAt
        : (fallback?.updatedAt ?? null),
  };
}

export function normalizeRiskStack(
  raw: RiskStackResult | Record<string, unknown> | null | undefined,
  seismicExplain: Record<string, unknown> | null | undefined,
): RiskStackResult {
  const rawLayers = isRecord(raw?.layers) ? raw.layers : null;
  const fallbackSeismic = buildSeismicRiskLayerFromExplain(seismicExplain ?? null, null);
  const layers: Record<RiskLayerKey, RiskLayerResult> = {
    seismic: normalizeLayer("seismic", rawLayers?.seismic, fallbackSeismic),
    // Ignore stale flood payloads from older score snapshots — user-facing layer removed.
    flood: CANONICAL_HIDDEN_FLOOD_LAYER,
    pollution: normalizeLayer("pollution", rawLayers?.pollution),
    traffic: normalizeLayer("traffic", rawLayers?.traffic),
  };
  const computedOverall = computeOverall(layers, {
    excludeKeys: RISK_LAYERS_HIDDEN_IN_REPORT,
  });
  // Always derive notes from layers with hidden keys excluded (ignore stale DB strings mentioning flood).
  const notes = computedOverall.notes;

  return {
    overallScore:
      typeof raw?.overallScore === "number" ? raw.overallScore : computedOverall.overallScore,
    overallLevel:
      raw?.overallLevel === "low" ||
      raw?.overallLevel === "medium" ||
      raw?.overallLevel === "high" ||
      raw?.overallLevel === "unknown"
        ? raw.overallLevel
        : computedOverall.overallLevel,
    layers,
    notes,
  };
}

export function buildRiskInsights(
  resolved: RiskStackResult,
  orderedKeys: RiskLayerKey[],
): { dominantKey: RiskLayerKey | null; items: string[] } {
  const knownKeys = orderedKeys.filter((key) => resolved.layers[key].score != null);
  const dominantKey = knownKeys[0] ?? null;
  const highKeys = knownKeys.filter((key) => resolved.layers[key].level === "high");
  const mediumKeys = knownKeys.filter((key) => resolved.layers[key].level === "medium");
  const unknownKeys = orderedKeys.filter((key) => resolved.layers[key].level === "unknown");
  const items: string[] = [];

  if (dominantKey) {
    const dominantLayer = resolved.layers[dominantKey];
    items.push(
      `${RISK_LAYER_LABELS[dominantKey]} este stratul dominant momentan, cu un scor de ${dominantLayer.score}/100 si nivel ${riskLevelLabel(dominantLayer.level).toLowerCase()}.`,
    );
  }

  if (highKeys.length >= 2) {
    items.push(
      `Se observa o combinatie de riscuri ridicate pe ${highKeys.map((key) => RISK_LAYER_LABELS[key].toLowerCase()).join(" si ")}, ceea ce merita verificata inainte de decizia finala.`,
    );
  } else if (highKeys.length === 1 && mediumKeys.length > 0) {
    items.push(
      `${RISK_LAYER_LABELS[highKeys[0]]} este principalul punct de atentie, iar ${RISK_LAYER_LABELS[mediumKeys[0]].toLowerCase()} adauga presiune secundara asupra locatiei.`,
    );
  } else if (resolved.overallLevel === "low") {
    items.push(
      "Imaginea de ansamblu este relativ echilibrata: riscurile detectate sunt limitate sau bine distribuite intre straturi.",
    );
  } else if (resolved.overallLevel === "unknown" && unknownKeys.length > 0) {
    items.push(
      `Verdictul general ramane partial deoarece lipsesc date ferme pentru ${unknownKeys.map((key) => RISK_LAYER_LABELS[key].toLowerCase()).join(", ")}.`,
    );
  }

  return {
    dominantKey,
    items: items.slice(0, 3),
  };
}

export function buildRecommendedNextStep(
  resolved: RiskStackResult,
  dominantKey: RiskLayerKey | null,
): string | null {
  if (!dominantKey) return null;

  const dominantLayer = resolved.layers[dominantKey];
  if (dominantLayer.level === "unknown") {
    return `Confirma date suplimentare pentru ${RISK_LAYER_LABELS[dominantKey].toLowerCase()} inainte de a te baza pe verdictul final.`;
  }

  switch (dominantKey) {
    case "seismic":
      return "Verifica expertiza tehnica, istoricul de consolidare si documentele AMCCRS/PMB inainte de orice angajament.";
    case "flood":
      return "Cere confirmari despre istoricul de inundatii al imobilului si verifica hartile oficiale de hazard pentru zona.";
    case "pollution":
      return "Viziteaza proprietatea la ore diferite si compara cu date oficiale AQI sau statii de monitorizare din apropiere.";
    case "traffic":
      return "Testeaza accesul in ore de varf si verifica expunerea reala la bulevard, zgomot si flux rutier.";
    default:
      return null;
  }
}

/** Recompute overall score/notes for report/PDF, excluding layers hidden per city (e.g. flood in Bucharest). */
export function applyReportRiskVisibility(stack: RiskStackResult): RiskStackResult {
  const computedOverall = computeOverall(stack.layers, {
    excludeKeys: RISK_LAYERS_HIDDEN_IN_REPORT,
  });
  return {
    ...stack,
    overallScore: computedOverall.overallScore,
    overallLevel: computedOverall.overallLevel,
    notes: computedOverall.notes,
  };
}

export function orderRiskLayerKeysForReport(
  layers: Record<RiskLayerKey, RiskLayerResult>,
): RiskLayerKey[] {
  return filterRiskLayersForReport(orderRiskLayerKeys(layers));
}
