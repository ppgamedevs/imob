import type {
  RiskLayerKey,
  RiskLayerResult,
  RiskLevel,
  RiskStackResult,
} from "./types";

const DEFAULT_WEIGHTS: Record<RiskLayerKey, number> = {
  seismic: 0.45,
  flood: 0.2,
  pollution: 0.2,
  traffic: 0.15,
};

function scoreToLevel(score: number): RiskLevel {
  if (score >= 70) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export type ComputeOverallOptions = {
  /** Omit these keys from aggregation and from "unavailable layers" notes (e.g. report UI). */
  excludeKeys?: ReadonlySet<RiskLayerKey>;
};

export function computeOverall(
  layers: Record<RiskLayerKey, RiskLayerResult>,
  options?: ComputeOverallOptions,
): Pick<RiskStackResult, "overallScore" | "overallLevel" | "notes"> {
  const notes: string[] = [];
  const exclude = options?.excludeKeys;
  const entries = (Object.entries(layers) as [RiskLayerKey, RiskLayerResult][]).filter(
    ([key]) => !exclude?.has(key),
  );
  const unknownLayers = entries.filter(([, layer]) => layer.level === "unknown" || layer.score == null);

  if (unknownLayers.length > 0) {
    const label: Record<RiskLayerKey, string> = {
      seismic: "Seismic",
      flood: "Inundatii",
      pollution: "Poluare",
      traffic: "Trafic",
    };
    notes.push(
      `Straturi indisponibile momentan: ${unknownLayers.map(([key]) => label[key] ?? key).join(", ")}.`,
    );
  }

  if (unknownLayers.length >= 2) {
    notes.push(
      "Scorul general nu este calculat pana cand cel putin trei straturi au date integrate.",
    );
    return {
      overallScore: null,
      overallLevel: "unknown",
      notes,
    };
  }

  const knownLayers = entries.filter(([, layer]) => layer.score != null);
  if (knownLayers.length === 0) {
    notes.push("Nu exista date suficiente pentru un scor agregat.");
    return {
      overallScore: null,
      overallLevel: "unknown",
      notes,
    };
  }

  const totalWeight = knownLayers.reduce((sum, [key]) => sum + DEFAULT_WEIGHTS[key], 0);
  if (totalWeight <= 0) {
    notes.push("Configuratia de ponderi nu permite calculul unui scor general.");
    return {
      overallScore: null,
      overallLevel: "unknown",
      notes,
    };
  }

  const weightedScore = knownLayers.reduce((sum, [key, layer]) => {
    return sum + (layer.score ?? 0) * DEFAULT_WEIGHTS[key];
  }, 0);
  const overallScore = Math.round(weightedScore / totalWeight);

  return {
    overallScore,
    overallLevel: scoreToLevel(overallScore),
    notes,
  };
}
