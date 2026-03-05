/**
 * Actionable recommendations to increase property value.
 * Pure function - no DB or side effects.
 */

import type { PropertyProfile, Recommendation } from "./liquidity";

const BUCHAREST_FALLBACK_EUR_M2 = 1450;

export function computeRecommendations(input: PropertyProfile): Recommendation[] {
  const recs: Recommendation[] = [];
  const base = input.usableAreaM2 * BUCHAREST_FALLBACK_EUR_M2;

  recs.push({
    title: "Poze profesionale",
    impactEurMin: Math.round(base * 0.01),
    impactEurMax: Math.round(base * 0.03),
    why: "Anunturile cu poze profesionale se vand cu 2-3% mai scump si de 2x mai repede",
  });

  recs.push({
    title: "Home staging minim",
    impactEurMin: Math.round(base * 0.015),
    impactEurMax: Math.round(base * 0.04),
    why: "Dezasamblare mobilier vechi, curatenie profunda si cateva accente moderne cresc perceptia de valoare",
  });

  if (input.condition === "necesita_renovare" || input.condition === "de_renovat") {
    recs.push({
      title: "Renovare completa",
      impactEurMin: Math.round(base * 0.08),
      impactEurMax: Math.round(base * 0.18),
      why: "Poate creste valoarea cu 8-18% dupa renovare (investitie 300-600 EUR/mp)",
    });
  } else if (input.condition === "locuibil") {
    recs.push({
      title: "Reparatii mici + curatenie",
      impactEurMin: Math.round(base * 0.01),
      impactEurMax: Math.round(base * 0.03),
      why: "Varuire, reparatii usi/prize, curatat rosturi - cost mic, impact vizual mare",
    });
  }

  recs.push({
    title: "Descriere detaliata si structurata",
    impactEurMin: Math.round(base * 0.005),
    impactEurMax: Math.round(base * 0.02),
    why: "Un anunt bine scris cu detalii cheie reduce timpul de vanzare cu 15-20%",
  });

  if (input.heatingType === "RADET") {
    recs.push({
      title: "Montaj centrala proprie",
      impactEurMin: Math.round(base * 0.02),
      impactEurMax: Math.round(base * 0.05),
      why: "Independenta termica si cost lunar mai mic atrag cumparatori",
    });
  }

  if (input.hasParking === false || input.hasParking === undefined) {
    recs.push({
      title: "Asigura loc de parcare",
      impactEurMin: Math.round(base * 0.02),
      impactEurMax: Math.round(base * 0.04),
      why: "Loc de parcare inclus adauga ~3% la valoare in Bucuresti",
    });
  }

  return recs.slice(0, 6);
}
