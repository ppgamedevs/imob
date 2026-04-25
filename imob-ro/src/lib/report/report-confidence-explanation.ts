/**
 * User-facing "data confidence" for reports. Builds on `computeConfidence` and applies
 * extra caps (comps, geocoding, missing listing fields). Not a statistical guarantee.
 */

import { computeConfidence } from "@/lib/scoring/confidence";
import type { ConfidenceLevel } from "@/lib/types/pipeline";
import type { NormalizedFeatures } from "@/lib/types/pipeline";

export type ReportConfidenceExplanationInput = {
  features: NormalizedFeatures;
  compCount: number;
  /** Comparables freshness; omit if unknown (treated as recent enough). */
  oldestCompDays?: number | null;
  /** If present, final level is the stricter of computed vs pipeline. */
  pipelineConfidenceLevel?: ConfidenceLevel | null;
  hasListingPrice: boolean;
  hasListingArea: boolean;
  hasListingRooms: boolean;
  hasFloor: boolean;
  hasYearBuilt: boolean;
};

export type ReportConfidenceExplanation = {
  level: ConfidenceLevel;
  labelRo: "Încredere ridicată" | "Încredere medie" | "Încredere redusă";
  shortExplanationRo: string;
  bulletReasonsRo: string[];
  missingDataRo: string[];
  /** When true, buyer-facing lines should avoid a firm "merită" recommendation. */
  shouldSuppressStrongVerdict: boolean;
};

const LABELS: Record<ConfidenceLevel, ReportConfidenceExplanation["labelRo"]> = {
  high: "Încredere ridicată",
  medium: "Încredere medie",
  low: "Încredere redusă",
};

function minLevel(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  const o = { low: 0, medium: 1, high: 2 };
  return o[a] < o[b] ? a : b;
}

/**
 * Produces a consistent confidence story for the report UI, PDF, and preview.
 * Does not claim statistical certainty; explains limits from data quality.
 */
export function buildReportConfidenceExplanation(
  input: ReportConfidenceExplanationInput,
): ReportConfidenceExplanation {
  const { features, compCount, oldestCompDays } = input;
  const base = computeConfidence(
    features,
    compCount,
    oldestCompDays == null ? undefined : oldestCompDays,
  );
  const geo = base.factors.geocodingQuality;
  let level: ConfidenceLevel = base.level;

  if (compCount < 3) {
    if (level === "high") level = "medium";
  }
  if (compCount < 1) {
    level = "low";
  }

  if (geo === "none") {
    if (level === "high") level = "medium";
    if (compCount < 2 && level === "medium") level = "low";
  } else if (geo === "area") {
    if (level === "high") level = "medium";
  }

  if (input.pipelineConfidenceLevel) {
    level = minLevel(level, input.pipelineConfidenceLevel);
  }

  const missingDataRo: string[] = [];
  if (!input.hasYearBuilt) {
    missingDataRo.push("Anul construcției lipsește sau e nesigur în fișă (risc, cost, negociere mai greu de ancorat).");
  }
  if (!input.hasFloor) {
    missingDataRo.push("Etajul nu e clar în date (influențează confort și comparabile).");
  }
  if (geo === "none") {
    missingDataRo.push("Fără coordonate GPS, localizarea e aproximativă (hărți, risc, comparabile).");
  } else if (geo === "area") {
    missingDataRo.push("Avem doar zonă, nu punct exact pe hartă (distanțe și comparabile pot varia).");
  }
  if (!input.hasListingPrice) {
    missingDataRo.push("Prețul listat nu e disponibil sau nu l-am putut folosi concludent.");
  }
  if (!input.hasListingArea) {
    missingDataRo.push("Suprafață utilă lipsă sau neclară (EUR/mp fiind mai instabil).");
  }
  if (!input.hasListingRooms) {
    missingDataRo.push("Număr de camere neclar (potrivirea comparabilelor e mai slabă).");
  }

  const shouldSuppressStrongVerdict =
    level === "low" ||
    compCount < 2 ||
    !input.hasListingPrice ||
    !input.hasListingArea ||
    !input.hasListingRooms;

  const bulletReasonsRo: string[] = [];

  if (compCount >= 8) {
    bulletReasonsRo.push(`Avem multe comparabile în zonă (${compCount}), ceea ce stabilizează reperul de preț.`);
  } else if (compCount >= 3) {
    bulletReasonsRo.push(`${compCount} comparabile: estimarea e utilizabilă, cu marjă normală.`);
  } else if (compCount >= 1) {
    bulletReasonsRo.push(
      `Puține comparabile (${compCount}): concluziile de preț sunt mai fragile, nu sunt certitudine de piață.`,
    );
  } else {
    bulletReasonsRo.push("Lipsesc comparabile apropiate: intervalul de preț e mai nesigur decât de obicei.");
  }

  if (base.factors.recency) {
    bulletReasonsRo.push("Comparabile relative recente, fără semnal explicit că au expirat.");
  } else {
    bulletReasonsRo.push("Unele comparabile pot fi vechi: piața de referință poate fi mișcată de atunci.");
  }

  if (geo === "exact") {
    bulletReasonsRo.push("Localizare pe hartă: putem apropia riscurile de zonă și distanțele.");
  } else if (geo === "area") {
    bulletReasonsRo.push("Localizare la nivel de zonă, nu adresă: distanțele și străzile pot diferi de realitate.");
  } else {
    bulletReasonsRo.push("Fără coordonate sau zonă de model solid: așază concluziile pe un reper mai larg.");
  }

  {
    const c = base.factors.featureCompleteness;
    bulletReasonsRo.push(
      c >= 3
        ? "Fișa are câmpurile de bază (suprafață, camere, etaj/an) în mare parte acoperite."
        : c >= 1
          ? "Fișa e parțial completă: lipsesc câmpuri care ajută la potrivirea cu piața."
          : "Fișa e slab completată: concluziile stau pe mai multe presupuneri implicite.",
    );
  }

  const shortExplanationRo =
    level === "high"
      ? "Rezultatul e susținut de suficiente comparabile și o localizare utilizabilă. Totuși e o estimare de model, nu o certitudine statistică despre acest imobil."
      : level === "medium"
        ? "Datele permit o direcție rezonabilă, dar rămâne loc de marjă: verifică tot ce contează la fața locului."
        : "Puncte slabe la comparabile, localizare sau fișă: tratează cifrele ca orientare, nu ca probabilitate de tranzacție.";

  return {
    level,
    labelRo: LABELS[level],
    shortExplanationRo,
    bulletReasonsRo: bulletReasonsRo.slice(0, 6),
    missingDataRo,
    shouldSuppressStrongVerdict,
  };
}
