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
  summary: string;
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
  seismicRiskClass: string | null;
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

  // Listing details for rich summary (all optional for backward compat)
  rooms?: number | null;
  areaM2?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  address?: string | null;
  title?: string | null;
  hasParking?: boolean | null;
  hasElevator?: boolean | null;
  heatingType?: string | null;
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

  // Overpricing — more aggressive thresholds
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
  } else if (overpricingPct != null && overpricingPct > 10) {
    killers.push({
      type: "price",
      text: `Pret peste estimare cu ${overpricingPct}%`,
      severity: "warning",
    });
    score -= Math.min(overpricingPct, 25);
  } else if (overpricingPct != null && overpricingPct > 5) {
    reasons.push(`Pret usor peste estimare (+${overpricingPct}%)`);
    score -= 5;
  }

  // No comps at all — hard to evaluate price
  if (input.compsCount === 0 && input.askingPrice) {
    killers.push({
      type: "data",
      text: "Date insuficiente pentru evaluarea pretului",
      severity: "warning",
    });
    score -= 10;
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
  else if (input.confidenceLevel === "low") confidenceScore = Math.min(confidenceScore, 45);

  // Graduated caps based on comps count — avoid always-35% issue
  if (input.compsCount === 0) confidenceScore = Math.min(confidenceScore, 20);
  else if (input.compsCount <= 2) confidenceScore = Math.min(confidenceScore, 45);
  else if (input.compsCount <= 5) confidenceScore = Math.min(confidenceScore, 65);
  else if (input.compsCount <= 8) confidenceScore = Math.min(confidenceScore, 80);
  if (input.compsCount >= 8) confidenceScore = Math.max(confidenceScore, 70);

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

  const summary = buildSummary(input, verdict, overpricingPct, killers);

  return {
    verdict,
    reasons: reasons.slice(0, 3),
    summary,
    dealKillers: killers,
    confidenceScore,
    confidenceLabel,
  };
}

// ---------------------------------------------------------------------------
// Rich narrative summary
// ---------------------------------------------------------------------------

function buildSummary(
  input: VerdictInput,
  verdict: Verdict,
  overpricingPct: number | null,
  killers: DealKiller[],
): string {
  const parts: string[] = [];
  const fmt = (n: number) => n.toLocaleString("ro-RO");
  const cur = input.currency || "EUR";

  // Part 1: describe the apartment
  const desc: string[] = [];
  if (input.rooms) desc.push(`${input.rooms} ${input.rooms === 1 ? "camera" : "camere"}`);
  if (input.areaM2) desc.push(`${input.areaM2} mp`);
  if (input.floor != null) {
    desc.push(
      input.totalFloors
        ? `etaj ${input.floor}/${input.totalFloors}`
        : `etaj ${input.floor}`,
    );
  }
  if (input.yearBuilt) desc.push(`constructie ${input.yearBuilt}`);

  const location = input.address || input.title || null;
  if (desc.length > 0) {
    parts.push(
      `Apartament ${desc.join(", ")}${location ? `, in zona ${location}` : ""}.`,
    );
  } else if (location) {
    parts.push(`Proprietate in zona ${location}.`);
  }

  // Part 2: price assessment
  if (input.askingPrice && input.avmMid && overpricingPct != null) {
    if (overpricingPct < -10) {
      parts.push(
        `Pretul de ${fmt(input.askingPrice)} ${cur} este sub valoarea estimata cu ${Math.abs(overpricingPct)}%, ceea ce il face atractiv.`,
      );
    } else if (overpricingPct <= 5) {
      parts.push(
        `Pretul de ${fmt(input.askingPrice)} ${cur} se incadreaza in intervalul corect fata de comparabile.`,
      );
    } else if (overpricingPct <= 20) {
      parts.push(
        `Pretul de ${fmt(input.askingPrice)} ${cur} este cu ${overpricingPct}% peste estimarea noastra — exista spatiu de negociere.`,
      );
    } else {
      parts.push(
        `Pretul de ${fmt(input.askingPrice)} ${cur} este semnificativ peste piata (+${overpricingPct}%).`,
      );
    }
  } else if (input.askingPrice && !input.avmMid) {
    parts.push(
      `Pretul cerut este ${fmt(input.askingPrice)} ${cur}, dar nu avem suficiente comparabile pentru a evalua corectitudinea.`,
    );
  }

  // Part 3: key features and risks
  const highlights: string[] = [];
  if (input.llmCondition === "nou") highlights.push("constructie noua");
  else if (input.llmCondition === "renovat") highlights.push("renovat recent");
  if (input.hasParking) highlights.push("loc de parcare");
  if (input.hasElevator) highlights.push("lift");
  if (input.heatingType && /central[aă]/i.test(input.heatingType))
    highlights.push("centrala proprie");

  if (highlights.length > 0) {
    parts.push(`Puncte forte: ${highlights.join(", ")}.`);
  }

  const riskCount = killers.filter(
    (k) => k.severity === "critical" || k.severity === "warning",
  ).length;
  if (verdict === "EVITA") {
    parts.push("Recomandam evitarea achizitiei fara consultarea unui specialist.");
  } else if (riskCount > 0) {
    parts.push(`Exista ${riskCount} ${riskCount === 1 ? "risc identificat" : "riscuri identificate"} care necesita atentie.`);
  }

  return parts.join(" ");
}
