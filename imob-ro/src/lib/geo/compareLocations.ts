/**
 * A/B location comparison engine.
 *
 * Compares two IntelV2 payloads and produces a structured verdict:
 * - Per-metric winners
 * - Top 3 wins for each location
 * - Summary verdict
 */
import type { IntelResult, IntelScore } from "./intelScoring";
import type { DemandSignals } from "./signals/querySignals";
import type { ZoneTypeResult } from "./zoneType";

// ---- Types ----

export interface CompareMetric {
  key: string;
  labelRo: string;
  valueA: number;
  valueB: number;
  winner: "A" | "B" | "tie";
  delta: number;
  deltaLabel: string;
}

export interface CompareVerdict {
  metrics: CompareMetric[];
  winsA: string[];
  winsB: string[];
  summary: string;
}

// ---- Logic ----

function compareMetric(
  key: string,
  labelRo: string,
  a: number,
  b: number,
  higherIsBetter = true,
): CompareMetric {
  const delta = a - b;
  const absDelta = Math.abs(delta);
  let winner: "A" | "B" | "tie" = "tie";

  if (absDelta >= 5) {
    if (higherIsBetter) winner = delta > 0 ? "A" : "B";
    else winner = delta < 0 ? "A" : "B";
  }

  const sign = delta > 0 ? "+" : "";
  const deltaLabel = absDelta < 5 ? "Egal" : `${sign}${delta} puncte`;

  return { key, labelRo, valueA: a, valueB: b, winner, delta, deltaLabel };
}

export function compareLocations(
  intelA: IntelResult,
  intelB: IntelResult,
  signalsA: DemandSignals | null,
  signalsB: DemandSignals | null,
  _zoneA: ZoneTypeResult | null,
  _zoneB: ZoneTypeResult | null,
): CompareVerdict {
  const metrics: CompareMetric[] = [];

  // Core scores
  metrics.push(compareMetric("convenience", "Comoditate zilnica", intelA.scores.convenience.value, intelB.scores.convenience.value));
  metrics.push(compareMetric("family", "Potrivire familii", intelA.scores.family.value, intelB.scores.family.value));
  metrics.push(compareMetric("nightlifeRisk", "Zgomot nocturn", intelA.scores.nightlifeRisk.value, intelB.scores.nightlifeRisk.value, false));
  metrics.push(compareMetric("walkability", "Walkability", intelA.scores.walkability.value, intelB.scores.walkability.value));

  // Demand signals
  if (signalsA && signalsB) {
    metrics.push(compareMetric("demand", "Cerere", signalsA.demandIndex, signalsB.demandIndex));
    metrics.push(compareMetric("supply", "Oferta", signalsA.supplyIndex, signalsB.supplyIndex));

    if (signalsA.medianPriceM2_30d != null && signalsB.medianPriceM2_30d != null) {
      metrics.push(compareMetric(
        "priceM2",
        "Pret mediu EUR/mp",
        signalsA.medianPriceM2_30d,
        signalsB.medianPriceM2_30d,
        false, // lower price is better for buyer
      ));
    }
  }

  metrics.push(
    compareMetric(
      "zonePoiCoverage",
      "Acoperire POI (OSM)",
      intelA.zoneDataQuality.totalPois,
      intelB.zoneDataQuality.totalPois,
    ),
  );

  // Compute wins
  const winsA: string[] = [];
  const winsB: string[] = [];

  for (const m of metrics) {
    if (m.winner === "A") winsA.push(`${m.labelRo} (${m.deltaLabel})`);
    else if (m.winner === "B") winsB.push(`${m.labelRo} (${m.deltaLabel})`);
  }

  // Summary
  const countA = metrics.filter((m) => m.winner === "A").length;
  const countB = metrics.filter((m) => m.winner === "B").length;

  let summary: string;
  if (countA > countB + 1) {
    summary = `Locatia A castiga ${countA} din ${metrics.length} metrici. Este o optiune mai buna in general.`;
  } else if (countB > countA + 1) {
    summary = `Locatia B castiga ${countB} din ${metrics.length} metrici. Este o optiune mai buna in general.`;
  } else {
    summary = `Cele doua locatii sunt echilibrate (A: ${countA}, B: ${countB} din ${metrics.length} metrici). Decizia depinde de prioritatile tale.`;
  }

  return {
    metrics,
    winsA: winsA.slice(0, 3),
    winsB: winsB.slice(0, 3),
    summary,
  };
}
