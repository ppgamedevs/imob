/**
 * Listing vs single-point estimate (e.g. AVM mid): badge label + copy for report UI.
 * delta = (estimatedPrice - listedPrice) / listedPrice  (per product spec)
 */

export type PriceVerdictTone = "green" | "yellow" | "red";

export interface PriceVerdictPill {
  /** (estimated - listed) / listed */
  delta: number;
  label: string;
  /** Short sentence under the pill */
  explanation: string;
  tone: PriceVerdictTone;
  /** |listed - estimated| / estimated * 100 — for human-readable copy */
  absPctVsEstimate: number;
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

/**
 * @param listedPrice — listing price (EUR or same unit as estimate)
 * @param estimatedPrice — model mid / fair estimate
 */
export function computePriceVerdictPill(
  listedPrice: number,
  estimatedPrice: number,
): PriceVerdictPill | null {
  if (!(listedPrice > 0) || !(estimatedPrice > 0)) return null;

  const delta = (estimatedPrice - listedPrice) / listedPrice;
  const absPctVsEstimate = clampPct(
    (Math.abs(listedPrice - estimatedPrice) / estimatedPrice) * 100,
  );

  let label: string;
  let tone: PriceVerdictTone;

  // Bands on delta = (est - listed) / listed
  if (delta >= -0.05 && delta <= 0.05) {
    label = "Preț corect";
    tone = "yellow";
  } else if (delta >= -0.15 && delta < -0.05) {
    label = "Ușor supraevaluat";
    tone = "yellow";
  } else if (delta < -0.15) {
    label = "Supraevaluat";
    tone = "red";
  } else if (delta > 0.05 && delta <= 0.15) {
    label = "Ușor subevaluat";
    tone = "green";
  } else {
    label = "Subevaluat";
    tone = "green";
  }

  let explanation: string;
  if (delta >= -0.05 && delta <= 0.05) {
    explanation =
      absPctVsEstimate <= 1
        ? "Prețul din anunț este aliniat cu estimarea noastră."
        : `Prețul din anunț este aproape de estimarea noastră (diferență ~${absPctVsEstimate}%).`;
  } else if (listedPrice > estimatedPrice) {
    explanation = `Prețul din anunț este cu ~${absPctVsEstimate}% peste estimarea noastră.`;
  } else {
    explanation = `Prețul din anunț este cu ~${absPctVsEstimate}% sub estimarea noastră.`;
  }

  return { delta, label, explanation, tone, absPctVsEstimate };
}

export function formatDeltaAsPercent(delta: number): string {
  const pct = Math.round(delta * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}
