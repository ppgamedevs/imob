/**
 * Executive summary verdict engine.
 *
 * Produces a top-level RECOMANDAT / ATENTIE / EVITA verdict plus
 * structured deal-killers and short actionable reasons.
 */

// ---- Types ----

export type Verdict = "RECOMANDAT" | "ATENTIE" | "EVITA";

export type DealKillerSeverity = "critical" | "warning" | "info";

export interface DealKiller {
  type: string;
  text: string;
  severity: DealKillerSeverity;
}

export interface ExecutiveVerdict {
  verdict: Verdict;
  reasons: string[];
  dealKillers: DealKiller[];
  confidenceScore: number; // 0-100
  confidenceLabel: string;
}

export interface VerdictInput {
  // Price
  askingPrice: number | null;
  avmLow: number | null;
  avmMid: number | null;
  avmHigh: number | null;
  currency?: string;

  // Confidence
  confidenceLevel: string | null; // "high" | "medium" | "low"
  confidenceScore: number | null;
  compsCount: number;

  // Seismic
  seismicRiskClass: string | null; // "RsI" | "RsII" | "RsIII" | "RsIV" | "RS1" | "RS2" | ...
  seismicConfidence: number | null;
  seismicMethod: string | null;

  // LLM red flags
  llmRedFlags: string[] | null;
  llmCondition: string | null;
  sellerMotivation: string | null;

  // Transport / Vibe (optional)
  transitScore: number | null;
  vibeZoneTypeKey: string | null;

  // Building
  yearBuilt: number | null;
  hasPhotos: boolean;
}

// ---- Logic ----

function normalizeSeismic(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.toUpperCase().replace(/\s/g, "");
  if (s === "RSI" || s === "RS1") return "RsI";
  if (s === "RSII" || s === "RS2") return "RsII";
  if (s === "RSIII" || s === "RS3") return "RsIII";
  if (s === "RSIV" || s === "RS4") return "RsIV";
  return raw;
}

export function computeExecutiveVerdict(input: VerdictInput): ExecutiveVerdict {
  const killers: DealKiller[] = [];
  const reasons: string[] = [];
  let score = 50; // start neutral

  const seismic = normalizeSeismic(input.seismicRiskClass);

  // ---- Deal killers ----

  // Seismic risk
  if (seismic === "RsI") {
    killers.push({
      type: "seismic",
      text: "Risc seismic major (RsI) — bulina rosie",
      severity: "critical",
    });
    score -= 40;
  } else if (seismic === "RsII") {
    killers.push({
      type: "seismic",
      text: "Risc seismic semnificativ (RsII)",
      severity: "warning",
    });
    score -= 20;
  } else if (seismic === "RsIII") {
    killers.push({
      type: "seismic",
      text: "Degradari structurale moderate (RsIII)",
      severity: "info",
    });
    score -= 8;
  }

  // Major overpricing
  const overpricingPct =
    input.askingPrice && input.avmMid
      ? Math.round(((input.askingPrice - input.avmMid) / input.avmMid) * 100)
      : null;

  if (overpricingPct != null && overpricingPct > 20) {
    killers.push({
      type: "price",
      text: `Supraevaluat cu ${overpricingPct}% fata de estimare`,
      severity: overpricingPct > 35 ? "critical" : "warning",
    });
    score -= Math.min(overpricingPct, 40);
  }

  // LLM red flags
  if (input.llmRedFlags && input.llmRedFlags.length > 0) {
    for (const flag of input.llmRedFlags.slice(0, 3)) {
      killers.push({ type: "redFlag", text: flag, severity: "warning" });
      score -= 5;
    }
  }

  // Condition issues
  if (input.llmCondition === "de_renovat" || input.llmCondition === "necesita_renovare") {
    killers.push({
      type: "condition",
      text: input.llmCondition === "de_renovat"
        ? "Necesita renovare completa"
        : "Necesita lucrari de renovare",
      severity: input.llmCondition === "de_renovat" ? "warning" : "info",
    });
    score -= input.llmCondition === "de_renovat" ? 12 : 5;
  }

  // No photos = hard to evaluate
  if (!input.hasPhotos) {
    killers.push({
      type: "data",
      text: "Fara fotografii — nu se poate verifica starea",
      severity: "warning",
    });
    score -= 8;
  }

  // Very old building without seismic classification
  if (input.yearBuilt && input.yearBuilt < 1945 && !seismic) {
    killers.push({
      type: "age",
      text: `Cladire din ${input.yearBuilt} — verificati expertiza tehnica`,
      severity: "info",
    });
    score -= 5;
  }

  // ---- Positive signals ----

  if (overpricingPct != null && overpricingPct < -10) {
    reasons.push(`Pret sub estimare cu ${Math.abs(overpricingPct)}%`);
    score += Math.min(Math.abs(overpricingPct), 25);
  } else if (overpricingPct != null && overpricingPct >= -10 && overpricingPct <= 5) {
    reasons.push("Pret in intervalul corect");
    score += 10;
  }

  if (input.transitScore != null && input.transitScore >= 60) {
    reasons.push("Acces bun la transport public");
    score += 5;
  }

  if (input.llmCondition === "nou" || input.llmCondition === "renovat") {
    reasons.push(input.llmCondition === "nou" ? "Constructie noua" : "Recent renovat");
    score += 8;
  }

  if (input.sellerMotivation === "urgent" || input.sellerMotivation === "foarte_urgent") {
    reasons.push("Vanzator motivat — potential de negociere");
    score += 5;
  }

  if (input.compsCount >= 7) {
    reasons.push("Estimare sustinuta de multe comparabile");
    score += 3;
  }

  if (seismic === "RsIV" || (!seismic && input.yearBuilt && input.yearBuilt >= 1990)) {
    reasons.push("Fara probleme seismice identificate");
    score += 3;
  }

  if (input.vibeZoneTypeKey === "residential" || input.vibeZoneTypeKey === "mixed") {
    reasons.push("Zona bine dotata cu facilitati");
    score += 3;
  }

  // ---- Confidence ----

  let confidenceScore = input.confidenceScore ?? 50;
  if (input.confidenceLevel === "high") confidenceScore = Math.max(confidenceScore, 80);
  else if (input.confidenceLevel === "medium") confidenceScore = Math.max(confidenceScore, 55);
  else if (input.confidenceLevel === "low") confidenceScore = Math.min(confidenceScore, 40);

  if (input.compsCount < 3) confidenceScore = Math.min(confidenceScore, 35);
  else if (input.compsCount >= 8) confidenceScore = Math.max(confidenceScore, 70);

  confidenceScore = Math.max(10, Math.min(100, confidenceScore));

  const confidenceLabel =
    confidenceScore >= 75 ? "Ridicata"
    : confidenceScore >= 50 ? "Medie"
    : "Scazuta";

  // ---- Final verdict ----

  score = Math.max(0, Math.min(100, score));

  const hasCritical = killers.some((k) => k.severity === "critical");
  const hasWarnings = killers.filter((k) => k.severity === "warning").length;

  let verdict: Verdict;
  if (hasCritical || score < 25) {
    verdict = "EVITA";
  } else if (hasWarnings >= 2 || score < 45) {
    verdict = "ATENTIE";
  } else {
    verdict = "RECOMANDAT";
  }

  // Ensure we always have at least 1 reason
  if (reasons.length === 0) {
    if (verdict === "EVITA") reasons.push("Riscuri semnificative identificate");
    else if (verdict === "ATENTIE") reasons.push("Necesita verificari suplimentare");
    else reasons.push("Nu au fost identificate probleme majore");
  }

  return {
    verdict,
    reasons: reasons.slice(0, 3),
    dealKillers: killers,
    confidenceScore,
    confidenceLabel,
  };
}
