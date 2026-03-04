/**
 * Confidence scoring and input-completeness helpers.
 * Pure functions — no DB or side effects.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConfidenceInput {
  lat?: number | null;
  lng?: number | null;
  yearBuilt?: number | null;
  floor?: number | null;
  hasElevator?: boolean | null;
  hasParking?: boolean | null;
  heatingType?: string | null;
  layoutType?: string | null;
  balconyM2?: number | null;
  totalFloors?: number | null;
  isThermoRehab?: boolean | null;
}

// ---------------------------------------------------------------------------
// Confidence score (0–100)
// ---------------------------------------------------------------------------

export function computeConfidence(
  compsUsed: number,
  dispersion: number,
  tightRatio: number,
  completeness: number,
): number {
  let score = 0;

  // Sample size (0–40)
  if (compsUsed >= 15) score += 40;
  else if (compsUsed >= 8) score += 30;
  else if (compsUsed >= 5) score += 20;
  else if (compsUsed >= 3) score += 12;
  else score += compsUsed * 3;

  // Low dispersion (0–25)
  if (dispersion < 0.08) score += 25;
  else if (dispersion < 0.15) score += 18;
  else if (dispersion < 0.25) score += 10;
  else if (dispersion < 0.35) score += 4;

  // Tight match ratio (0–20)
  score += Math.round(tightRatio * 20);

  // Input completeness (0–15)
  score += Math.round(completeness * 15);

  return Math.min(100, Math.max(0, score));
}

// ---------------------------------------------------------------------------
// Confidence explanation (Romanian)
// ---------------------------------------------------------------------------

export function computeConfidenceWhy(
  compsUsed: number,
  dispersion: number,
  tightRatio: number,
  completeness: number,
): string[] {
  const reasons: string[] = [];

  if (compsUsed >= 15) reasons.push(`${compsUsed} comparabile gasite — esantion solid`);
  else if (compsUsed >= 8) reasons.push(`${compsUsed} comparabile — esantion bun`);
  else if (compsUsed >= 3) reasons.push(`Doar ${compsUsed} comparabile — esantion limitat`);
  else if (compsUsed > 0) reasons.push(`Foarte putine comparabile (${compsUsed}) — interval larg`);
  else reasons.push("Nicio comparabila gasita — estimare bazata pe medii de zona");

  if (dispersion < 0.1) reasons.push("Preturi consistente in zona — dispersie mica");
  else if (dispersion < 0.2) reasons.push("Dispersie moderata a preturilor");
  else if (dispersion >= 0.3) reasons.push("Preturi variate in zona — interval mai larg");

  if (tightRatio >= 0.7) reasons.push("Majoritatea comparabilelor sunt foarte similare");
  else if (tightRatio < 0.3 && compsUsed > 0)
    reasons.push("Putine comparabile in raza stransa — s-a extins cautarea");

  if (completeness >= 0.8) reasons.push("Detalii complete furnizate — ajustari precise");
  else if (completeness < 0.4) reasons.push("Detalii putine completate — precizie redusa");

  return reasons;
}

// ---------------------------------------------------------------------------
// Input completeness (0–1)
// ---------------------------------------------------------------------------

export function inputCompleteness(input: ConfidenceInput): number {
  const fields = [
    input.lat != null && input.lng != null,
    input.yearBuilt != null,
    input.floor != null,
    input.hasElevator != null,
    input.hasParking != null,
    input.heatingType != null && input.heatingType !== "unknown",
    input.layoutType != null && input.layoutType !== "unknown",
    input.balconyM2 != null,
    input.totalFloors != null,
    input.isThermoRehab != null,
  ];
  return fields.filter(Boolean).length / fields.length;
}
