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

export function computeOverall(
  layers: Record<RiskLayerKey, RiskLayerResult>,
): Pick<RiskStackResult, "overallScore" | "overallLevel" | "notes"> {
  const notes: string[] = [];
  const entries = Object.entries(layers) as [RiskLayerKey, RiskLayerResult][];
  const unknownLayers = entries.filter(([, layer]) => layer.level === "unknown" || layer.score == null);

  if (unknownLayers.length > 0) {
    notes.push(
      `Straturi indisponibile momentan: ${unknownLayers.map(([key]) => key).join(", ")}.`,
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
