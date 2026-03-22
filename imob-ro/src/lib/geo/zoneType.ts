/**
 * Deterministic Zone Type classifier.
 *
 * Classifies a location into one of 7 types based on
 * POI scores, category counts, and demand/supply signals.
 * Every classification includes evidence bullets.
 */
import type { IntelResult } from "./intelScoring";
import type { DemandSignals, Confidence } from "./signals/querySignals";
import type { OverpassPoi } from "./overpass";
import type { PoiCategoryKey } from "./poiCategories";

// ---- Types ----

export type ZoneTypeKey =
  | "familie"
  | "studenti"
  | "corporate"
  | "nightlife"
  | "investitie"
  | "in_crestere"
  | "stagnanta";

export interface ZoneTypeResult {
  zoneType: ZoneTypeKey;
  labelRo: string;
  confidence: Confidence;
  evidence: string[];
  warnings: string[];
}

// ---- Config ----

const LABELS: Record<ZoneTypeKey, string> = {
  familie: "Zona de familii",
  studenti: "Zona studenteasca",
  corporate: "Zona corporate",
  nightlife: "Zona de nightlife",
  investitie: "Zona de investitie",
  in_crestere: "Zona in crestere",
  stagnanta: "Zona stagnanta",
};

// ---- Helpers ----

function countCategory(
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
  key: PoiCategoryKey,
  maxDistM?: number,
): number {
  const pois = poisByCategory[key] ?? [];
  if (maxDistM == null) return pois.length;
  return pois.filter((p) => p.distanceM <= maxDistM).length;
}

function countSubType(
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
  key: PoiCategoryKey,
  subType: string,
  maxDistM?: number,
): number {
  const pois = poisByCategory[key] ?? [];
  const filtered = pois.filter((p) => p.subType === subType);
  if (maxDistM == null) return filtered.length;
  return filtered.filter((p) => p.distanceM <= maxDistM).length;
}

// ---- Scoring rules ----

interface Candidate {
  type: ZoneTypeKey;
  score: number;
  evidence: string[];
  warnings: string[];
  confidenceBase: Confidence;
}

function scoreFamilie(
  intel: IntelResult,
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
): Candidate {
  const evidence: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  const fam = intel.scores.family.value;
  const night = intel.scores.nightlifeRisk.value;
  const parks = countCategory(poisByCategory, "park", 800);
  const schools = countCategory(poisByCategory, "school", 1000);

  if (fam >= 70) { score += 30; evidence.push(`Scor familie ridicat (${fam}/100)`); }
  else if (fam >= 50) { score += 15; evidence.push(`Scor familie mediu (${fam}/100)`); }

  if (night <= 30) { score += 20; evidence.push("Zgomot nocturn scazut"); }
  else if (night <= 50) { score += 10; }
  else { score -= 15; warnings.push(`Zgomot nocturn ridicat (${night}/100)`); }

  if (parks >= 2) { score += 15; evidence.push(`${parks} parcuri in 800m`); }
  if (schools >= 2) { score += 15; evidence.push(`${schools} scoli/gradinite in 1 km`); }
  else if (schools === 0 && !intel.zoneDataQuality.lowDataMode) {
    score -= 10;
    warnings.push("0 scoli in 1 km");
  }

  const playgrounds = countSubType(poisByCategory, "park", "playground", 800);
  if (playgrounds > 0) { score += 10; evidence.push(`${playgrounds} locuri de joaca`); }

  return { type: "familie", score, evidence, warnings, confidenceBase: "medie" };
}

function scoreStudenti(
  intel: IntelResult,
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
): Candidate {
  const evidence: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  const conv = intel.scores.convenience.value;
  const night = intel.scores.nightlifeRisk.value;
  const restaurants = countCategory(poisByCategory, "restaurant", 800);
  const transport = countCategory(poisByCategory, "transport", 500);
  const universities = countSubType(poisByCategory, "school", "university", 2000);

  if (conv >= 50) { score += 15; evidence.push(`Comoditate ${conv}/100`); }
  if (night >= 40 && night <= 70) { score += 20; evidence.push(`Viata de noapte moderata (${night}/100)`); }
  else if (night > 70) { score += 10; }

  if (restaurants >= 8) { score += 20; evidence.push(`${restaurants} restaurante/baruri in 800m`); }
  else if (restaurants >= 4) { score += 10; evidence.push(`${restaurants} restaurante/baruri`); }

  if (transport >= 3) { score += 15; evidence.push(`${transport} statii transport < 500m`); }
  if (universities > 0) { score += 20; evidence.push(`Universitate in 2 km`); }

  return { type: "studenti", score, evidence, warnings, confidenceBase: "medie" };
}

function scoreCorporate(
  intel: IntelResult,
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
): Candidate {
  const evidence: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  const conv = intel.scores.convenience.value;
  const walk = intel.scores.walkability.value;
  const night = intel.scores.nightlifeRisk.value;
  const transport = countCategory(poisByCategory, "transport", 500);
  const restaurants = countCategory(poisByCategory, "restaurant", 800);
  const gyms = countCategory(poisByCategory, "gym", 1000);

  if (conv >= 70) { score += 25; evidence.push(`Comoditate ridicata (${conv}/100)`); }
  else if (conv >= 50) { score += 15; }

  if (walk >= 60) { score += 15; evidence.push(`Walkability ${walk}/100`); }
  if (transport >= 4) { score += 20; evidence.push(`${transport} statii transport < 500m`); }
  if (restaurants >= 5 && restaurants <= 15) { score += 10; evidence.push(`${restaurants} restaurante (nivel moderat)`); }
  if (night <= 50) { score += 10; evidence.push("Zgomot nocturn controlat"); }
  if (gyms >= 1) { score += 5; evidence.push(`Sala de sport in 1 km`); }

  return { type: "corporate", score, evidence, warnings, confidenceBase: "medie" };
}

function scoreNightlife(
  intel: IntelResult,
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
): Candidate {
  const evidence: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  const night = intel.scores.nightlifeRisk.value;
  const bars = countSubType(poisByCategory, "restaurant", "bar", 500)
    + countSubType(poisByCategory, "restaurant", "pub", 500);
  const clubs = countSubType(poisByCategory, "restaurant", "nightclub", 800);
  const restaurants = countCategory(poisByCategory, "restaurant", 500);

  if (night >= 70) { score += 30; evidence.push(`Risc zgomot nocturn ridicat (${night}/100)`); }
  else if (night >= 50) { score += 15; }

  if (bars >= 5) { score += 20; evidence.push(`${bars} baruri/puburi in 500m`); }
  else if (bars >= 3) { score += 10; evidence.push(`${bars} baruri in 500m`); }

  if (clubs >= 1) { score += 15; evidence.push(`${clubs} cluburi in 800m`); }
  if (restaurants >= 10) { score += 10; evidence.push(`${restaurants} localuri in 500m`); }

  if (intel.scores.family.value >= 60)
    warnings.push("Zona are si facilitati pentru familii, dar viata de noapte domina");

  return { type: "nightlife", score, evidence, warnings, confidenceBase: "medie" };
}

function scoreInvestitie(
  intel: IntelResult,
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
  signals: DemandSignals | null,
): Candidate {
  const evidence: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  const walk = intel.scores.walkability.value;
  const conv = intel.scores.convenience.value;

  if (walk >= 60) { score += 10; evidence.push(`Walkability bun (${walk}/100)`); }
  if (conv >= 50) { score += 10; }

  if (signals) {
    if (signals.demandIndex >= 60) {
      score += 25; evidence.push(`Cerere ridicata (index ${signals.demandIndex}/100)`);
    } else if (signals.demandIndex >= 40) {
      score += 12;
    }

    if (signals.supplyIndex >= 40) {
      score += 10; evidence.push(`Oferta activa (${signals.nListings} anunturi)`);
    }

    if (signals.demandTrend === "up") {
      score += 15; evidence.push(`Cerere in crestere (+${signals.demandTrendPct}%)`);
    }

    if (signals.priceTrend === "up" && signals.priceTrendPct != null) {
      score += 15;
      evidence.push(`Pret in crestere: +${signals.priceTrendPct}% (30d vs 90d)`);
    }

    if (signals.confidence === "scazuta")
      warnings.push("Date insuficiente pentru semnale de investitie fiabile");
  } else {
    warnings.push("Semnale de piata indisponibile");
  }

  return { type: "investitie", score, evidence, warnings, confidenceBase: signals?.confidence ?? "scazuta" };
}

function scoreInCrestere(
  intel: IntelResult,
  _poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
  signals: DemandSignals | null,
): Candidate {
  const evidence: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  if (signals) {
    if (signals.demandTrend === "up") {
      score += 25;
      evidence.push(`Cerere in crestere (+${signals.demandTrendPct}% saptamana curenta)`);
    }
    if (signals.priceTrend === "up" && signals.priceTrendPct != null) {
      score += 25;
      evidence.push(`Pret in crestere: +${signals.priceTrendPct}% (30d vs 90d)`);
    }
    if (signals.supplyTrend === "up") {
      score += 10;
      evidence.push("Oferta in crestere (dezvoltatori activi)");
    }
    if (signals.demandIndex >= 40) {
      score += 10;
    }
    if (signals.confidence === "scazuta")
      warnings.push("Trend bazat pe date limitate");
  } else {
    warnings.push("Semnale de piata indisponibile");
  }

  const walk = intel.scores.walkability.value;
  if (walk >= 40) { score += 5; }

  return { type: "in_crestere", score, evidence, warnings, confidenceBase: signals?.confidence ?? "scazuta" };
}

function scoreStagnanta(
  intel: IntelResult,
  _poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
  signals: DemandSignals | null,
): Candidate {
  const evidence: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  const conv = intel.scores.convenience.value;
  if (conv <= 30) { score += 15; evidence.push(`Comoditate scazuta (${conv}/100)`); }

  if (signals) {
    if (signals.demandTrend === "down") {
      score += 20; evidence.push(`Cerere in scadere (${signals.demandTrendPct}%)`);
    } else if (signals.demandTrend === "flat") {
      score += 10; evidence.push("Cerere stabila, fara crestere");
    }
    if (signals.priceTrend === "down" && signals.priceTrendPct != null) {
      score += 20; evidence.push(`Pret in scadere: ${signals.priceTrendPct}% (30d vs 90d)`);
    } else if (signals.priceTrend === "flat") {
      score += 5;
    }
    if (signals.demandIndex <= 20) {
      score += 15; evidence.push(`Cerere foarte scazuta (index ${signals.demandIndex}/100)`);
    }
  }

  return { type: "stagnanta", score, evidence, warnings, confidenceBase: signals?.confidence ?? "scazuta" };
}

// ---- Main classifier ----

export function classifyZone(
  intel: IntelResult,
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
  signals: DemandSignals | null,
): ZoneTypeResult {
  const candidates: Candidate[] = [
    scoreFamilie(intel, poisByCategory),
    scoreStudenti(intel, poisByCategory),
    scoreCorporate(intel, poisByCategory),
    scoreNightlife(intel, poisByCategory),
    scoreInvestitie(intel, poisByCategory, signals),
    scoreInCrestere(intel, poisByCategory, signals),
    scoreStagnanta(intel, poisByCategory, signals),
  ];

  // Pick highest scoring candidate
  candidates.sort((a, b) => b.score - a.score);
  const winner = candidates[0];

  // Adjust confidence: if winning margin is thin, lower confidence
  const runnerUp = candidates[1];
  let confidence = winner.confidenceBase;
  if (winner.score - runnerUp.score < 10) {
    if (confidence === "ridicata") confidence = "medie";
    else if (confidence === "medie") confidence = "scazuta";
  }
  if (winner.score < 20) confidence = "scazuta";
  if (intel.zoneDataQuality.lowDataMode && confidence === "ridicata") confidence = "medie";
  if (intel.zoneDataQuality.lowDataMode && confidence === "medie") confidence = "scazuta";

  if (intel.zoneDataQuality.lowDataMode) {
    winner.warnings.unshift("Putine puncte OSM in raza aleasa — tipul zonei este orientativ.");
  }

  // Add runner-up info to warnings if close
  if (winner.score - runnerUp.score < 15) {
    winner.warnings.push(
      `Zona se incadreaza partial si ca "${LABELS[runnerUp.type]}"`,
    );
  }

  return {
    zoneType: winner.type,
    labelRo: LABELS[winner.type],
    confidence,
    evidence: winner.evidence.slice(0, 6),
    warnings: winner.warnings.slice(0, 3),
  };
}
