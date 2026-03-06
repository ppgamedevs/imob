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
  highlightedRisks: DealKiller[];
  confidenceScore: number; // 0-100
  confidenceLabel: string;
  headline: string;
  mustKnow: string;
  hiddenTruths: string[];
  nextChecks: string[];
  confidenceTone: string;
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
  riskOverallLevel?: "low" | "medium" | "high" | "unknown" | null;
  riskOverallScore?: number | null;
  riskDominantKey?: "seismic" | "flood" | "pollution" | "traffic" | null;
  riskDominantLabel?: string | null;
  riskDominantSummary?: string | null;
  riskRecommendedNextStep?: string | null;
  riskInsights?: string[] | null;

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
  photoCount?: number | null;

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

  // Enriched listing metadata (for better reviews)
  sellerType?: string | null;
  isUnderConstruction?: boolean;
  isNeverLivedIn?: boolean;
  hasPlusTVA?: boolean;
  isRender?: boolean;
  photosAreRenders?: boolean;
  estimatedDelivery?: string | null;
  apartmentScore?: number | null;
  scorePros?: string[] | null;
  scoreCons?: string[] | null;
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

function pushUnique(items: string[], value: string | null | undefined) {
  if (!value) return;
  if (!items.includes(value)) items.push(value);
}

function trimSentence(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.trim().replace(/\s+/g, " ");
}

function riskLabel(key: VerdictInput["riskDominantKey"], fallback?: string | null): string | null {
  if (fallback) return fallback;
  if (key === "seismic") return "Seismic";
  if (key === "flood") return "Inundatii";
  if (key === "pollution") return "Poluare";
  if (key === "traffic") return "Trafic";
  return null;
}

function killerPriority(killer: DealKiller): number {
  const severityBase =
    killer.severity === "critical" ? 300 : killer.severity === "warning" ? 200 : 100;
  const typeBonus =
    killer.type === "seismic"
      ? 90
      : killer.type === "price"
        ? 80
        : killer.type.startsWith("risk:")
          ? 70
          : killer.type === "data"
            ? 60
            : killer.type === "condition"
              ? 55
              : killer.type === "age"
                ? 50
                : killer.type === "redFlag"
                  ? 40
                  : 10;

  return severityBase + typeBonus;
}

function sortAndDedupeKillers(killers: DealKiller[]): DealKiller[] {
  const seen = new Set<string>();

  return [...killers]
    .sort((a, b) => killerPriority(b) - killerPriority(a))
    .filter((killer) => {
      const key = `${killer.type}:${killer.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function computeExecutiveVerdict(input: VerdictInput): ExecutiveVerdict {
  const killers: DealKiller[] = [];
  const reasons: string[] = [];
  let score = 50; // start neutral

  const seismic = normalizeSeismic(input.seismicRiskClass);
  const dominantRiskLabel = riskLabel(input.riskDominantKey, input.riskDominantLabel);

  // ---- Deal killers ----

  // Seismic risk
  if (seismic === "RsI") {
    killers.push({
      type: "seismic",
      text: "Risc seismic major (RsI) - bulina rosie",
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

  if (
    input.riskDominantKey &&
    input.riskDominantKey !== "seismic" &&
    dominantRiskLabel &&
    input.riskOverallLevel &&
    input.riskOverallLevel !== "unknown"
  ) {
    killers.push({
      type: `risk:${input.riskDominantKey}`,
      text:
        input.riskOverallLevel === "high"
          ? `${dominantRiskLabel}: semnal de risc contextual ridicat`
          : `${dominantRiskLabel}: semnal contextual care merita verificat`,
      severity: input.riskOverallLevel === "high" ? "warning" : "info",
    });
    score -= input.riskOverallLevel === "high" ? 10 : 4;
  }

  // Overpricing - more aggressive thresholds
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

  // No comps at all - hard to evaluate price
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
    for (const flag of input.llmRedFlags.slice(0, 2)) {
      killers.push({ type: "redFlag", text: flag, severity: "warning" });
      score -= 5;
    }
  }

  // Condition issues
  if (input.llmCondition === "de_renovat" || input.llmCondition === "necesita_renovare") {
    killers.push({
      type: "condition",
      text:
        input.llmCondition === "de_renovat"
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
      text: "Fara fotografii - nu se poate verifica starea",
      severity: "warning",
    });
    score -= 8;
  } else if (input.photoCount != null && input.photoCount <= 2) {
    killers.push({
      type: "data",
      text: "Foarte putine fotografii - verificati starea reala la vizionare",
      severity: "info",
    });
    score -= 3;
  }

  // Very old building without seismic classification
  if (input.yearBuilt && input.yearBuilt < 1945 && !seismic) {
    killers.push({
      type: "age",
      text: `Cladire din ${input.yearBuilt} - verificati expertiza tehnica`,
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
    reasons.push("Vanzator motivat - potential de negociere");
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

  // Graduated caps based on comps count - avoid always-35% issue
  if (input.compsCount === 0) confidenceScore = Math.min(confidenceScore, 20);
  else if (input.compsCount <= 2) confidenceScore = Math.min(confidenceScore, 45);
  else if (input.compsCount <= 5) confidenceScore = Math.min(confidenceScore, 65);
  else if (input.compsCount <= 8) confidenceScore = Math.min(confidenceScore, 80);
  if (input.compsCount >= 8) confidenceScore = Math.max(confidenceScore, 70);

  confidenceScore = Math.max(10, Math.min(100, confidenceScore));

  const confidenceLabel =
    confidenceScore >= 75 ? "Ridicata" : confidenceScore >= 50 ? "Medie" : "Scazuta";

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
  const sortedKillers = sortAndDedupeKillers(killers);
  const highlightedRisks = sortedKillers.slice(0, 3);
  const headline = buildHeadline(input, verdict, overpricingPct);
  const mustKnow = buildMustKnow(
    input,
    verdict,
    overpricingPct,
    seismic,
    dominantRiskLabel,
    confidenceScore,
  );
  const hiddenTruths = buildHiddenTruths(
    input,
    overpricingPct,
    seismic,
    dominantRiskLabel,
    highlightedRisks,
  );
  const nextChecks = buildNextChecks(
    input,
    overpricingPct,
    seismic,
    dominantRiskLabel,
    confidenceScore,
  );
  const confidenceTone = buildConfidenceTone(confidenceScore);
  const summary = buildSummary(headline, mustKnow, hiddenTruths, confidenceTone);

  return {
    verdict,
    reasons: reasons.slice(0, 3),
    summary,
    dealKillers: sortedKillers,
    highlightedRisks,
    confidenceScore,
    confidenceLabel,
    headline,
    mustKnow,
    hiddenTruths,
    nextChecks,
    confidenceTone,
  };
}

// ---------------------------------------------------------------------------
// Rich narrative summary - written like a human property review
// ---------------------------------------------------------------------------

function buildHeadline(
  input: VerdictInput,
  verdict: Verdict,
  overpricingPct: number | null,
): string {
  const propType = inferPropType(input);
  const location = inferLocation(input);
  const areaStr = input.areaM2 ? `${input.areaM2} mp` : null;
  const subject = [propType, areaStr].filter(Boolean).join(" de ");
  const locationStr = location ? ` din ${location}` : "";

  if (verdict === "EVITA") {
    if (overpricingPct != null && overpricingPct > 20) {
      return `Pentru aceasta ${subject}${locationStr}, riscul principal este sa platesti prea mult pentru un pachet care are deja semnale de atentie.`;
    }
    return `Pentru aceasta ${subject}${locationStr}, concluzia noastra este sa nu mergi mai departe pana nu clarifici riscurile majore identificate.`;
  }

  if (verdict === "ATENTIE") {
    return `Aceasta ${subject}${locationStr} merita analizata doar daca verifici punctual lucrurile care te pot costa bani, confort sau flexibilitate dupa achizitie.`;
  }

  return `Aceasta ${subject}${locationStr} merita sa ramana pe short-list, dar avantajul real pentru cumparator apare doar daca datele se confirma in teren si in acte.`;
}

function buildMustKnow(
  input: VerdictInput,
  verdict: Verdict,
  overpricingPct: number | null,
  seismic: string | null,
  dominantRiskLabel: string | null,
  confidenceScore: number,
): string {
  if (seismic === "RsI" || seismic === "RsII") {
    return "Principalul lucru pe care trebuie sa-l clarifici este riscul structural: fara validarea documentelor tehnice, recomandarea nu se poate imbunatati.";
  }

  if (
    dominantRiskLabel &&
    input.riskDominantKey &&
    input.riskDominantKey !== "seismic" &&
    input.riskDominantSummary &&
    (input.riskOverallLevel === "high" || input.riskOverallLevel === "medium")
  ) {
    return `Principalul lucru pe care trebuie sa-l clarifici este ${dominantRiskLabel.toLowerCase()}: ${trimSentence(input.riskDominantSummary)}.`;
  }

  if (overpricingPct != null && overpricingPct > 10) {
    return `Principalul risc pentru cumparator este de pret: exista sanse reale sa intri prea sus in negociere, la aproximativ ${overpricingPct}% peste reperul nostru de piata.`;
  }

  if (!input.avmMid || input.compsCount < 3) {
    return "Principalul risc este de informatie: pretul nu poate fi validat ferm din suficiente comparabile, deci orice oferta trebuie ancorata foarte prudent.";
  }

  if (input.photosAreRenders || !input.hasPhotos) {
    return "Principalul lucru de clarificat este starea reala a proprietatii: anuntul nu o demonstreaza suficient prin imagini credibile.";
  }

  if (verdict === "RECOMANDAT") {
    return confidenceScore >= 70
      ? "Principalul avantaj pentru cumparator este ca nu vedem un semnal major ascuns peste ceea ce sugereaza pretul si datele disponibile."
      : "Concluzia este favorabila, dar merita sa tratezi recomandarea ca pe un short-list cu verificari, nu ca pe un verdict orb.";
  }

  return "Principalul lucru pe care trebuie sa-l faci este sa validezi motivele de mai jos inainte de orice oferta sau rezervare.";
}

function buildHiddenTruths(
  input: VerdictInput,
  overpricingPct: number | null,
  seismic: string | null,
  dominantRiskLabel: string | null,
  highlightedRisks: DealKiller[],
): string[] {
  const truths: string[] = [];

  if (overpricingPct != null && overpricingPct > 10) {
    pushUnique(
      truths,
      `Exista risc real sa platesti peste piata: pretul cerut este cu aproximativ ${overpricingPct}% peste reperul nostru curent.`,
    );
  }

  if (
    dominantRiskLabel &&
    input.riskDominantKey &&
    input.riskDominantKey !== "seismic" &&
    input.riskDominantSummary
  ) {
    pushUnique(
      truths,
      `Anuntul nu scoate asta in fata, dar semnalul contextual dominant este ${dominantRiskLabel.toLowerCase()}: ${trimSentence(input.riskDominantSummary)}.`,
    );
  }

  if (input.riskInsights && input.riskInsights.length > 0) {
    pushUnique(truths, trimSentence(input.riskInsights[0]));
  }

  if (input.hasPlusTVA) {
    pushUnique(
      truths,
      "Pretul din anunt nu este costul final. Daca se aplica TVA, suma reala platita este mai mare decat prima impresie din listare.",
    );
  }

  if (input.photosAreRenders) {
    pushUnique(
      truths,
      "Imaginile nu confirma starea reala a proprietatii. Pot arata mai bine decat ce vei gasi la vizionare.",
    );
  } else if (!input.hasPhotos) {
    pushUnique(
      truths,
      "Lipsa fotografiilor te lasa fara una dintre cele mai importante validari initiale ale starii reale.",
    );
  }

  if (!input.avmMid || input.compsCount < 3) {
    pushUnique(
      truths,
      "Pretul nu este suficient de bine sustinut de comparabile, deci negocierea trebuie purtata conservator.",
    );
  }

  if (input.yearBuilt && input.yearBuilt < 1978 && !seismic) {
    pushUnique(
      truths,
      `Vechimea cladirii (${input.yearBuilt}) cere verificare structurala chiar daca anuntul nu semnaleaza explicit asta.`,
    );
  }

  for (const killer of highlightedRisks) {
    if (truths.length >= 3) break;
    if (killer.type === "redFlag") {
      pushUnique(truths, `Semnal din descriere care merita luat literal: ${killer.text}.`);
    }
  }

  if (truths.length === 0) {
    pushUnique(
      truths,
      "Avantajul aici nu este doar in listing, ci in faptul ca datele disponibile nu indica momentan un cost ascuns peste medie.",
    );
  }

  return truths.slice(0, 3);
}

function buildNextChecks(
  input: VerdictInput,
  overpricingPct: number | null,
  seismic: string | null,
  dominantRiskLabel: string | null,
  confidenceScore: number,
): string[] {
  const checks: string[] = [];

  pushUnique(checks, input.riskRecommendedNextStep);

  if (seismic === "RsI" || seismic === "RsII") {
    pushUnique(
      checks,
      "Cere expertiza tehnica, documentele de consolidare si confirmarea exacta a adresei in registrele oficiale.",
    );
  } else if (input.yearBuilt && input.yearBuilt < 1978 && !input.isUnderConstruction) {
    pushUnique(
      checks,
      `Verifica istoricul structural al cladirii, mai ales pentru anul ${input.yearBuilt}, inainte de orice avans.`,
    );
  }

  if (overpricingPct != null && overpricingPct > 5) {
    pushUnique(
      checks,
      `Intra la negociere cu reperele de pret din raport; diferenta actuala este de aproximativ ${overpricingPct}% fata de referinta noastra.`,
    );
  }

  if (input.photosAreRenders || !input.hasPhotos) {
    pushUnique(
      checks,
      "Nu lua o decizie fara vizionare fizica si confirmare foto/video a starii reale a proprietatii.",
    );
  }

  if (input.hasPlusTVA) {
    pushUnique(
      checks,
      "Calculeaza costul final cu TVA si verifica daca bugetul tau ramane valid dupa taxele de achizitie.",
    );
  }

  if ((!input.avmMid || input.compsCount < 3) && confidenceScore < 70) {
    pushUnique(
      checks,
      "Compara cel putin 2-3 oferte similare din zona inainte sa folosesti pretul listat ca reper final.",
    );
  }

  return checks.slice(0, 3);
}

function buildConfidenceTone(confidenceScore: number): string {
  if (confidenceScore >= 75) {
    return "Concluzia de mai sus este bine sustinuta de datele disponibile, dar merita confirmata punctual in acte si la vizionare.";
  }
  if (confidenceScore >= 50) {
    return "Concluzia este utila pentru filtrare, dar exista suficiente necunoscute cat sa justifici verificari ferme inainte de orice oferta.";
  }
  return "Foloseste verdictul ca filtru de risc, nu ca verdict final. In acest caz, valoarea reala vine din verificarile pe care le faci dupa ce ai citit raportul.";
}

function inferPropType(input: VerdictInput): string {
  const t = (input.title ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/\bvila\b|\bvile\b/.test(t)) return input.rooms ? `vila cu ${input.rooms} camere` : "vila";
  if (/\bcasa\b|\bcase\b/.test(t)) return input.rooms ? `casa cu ${input.rooms} camere` : "casa";
  if (/\bpenthouse\b/.test(t)) return "penthouse";
  if (/\bduplex\b/.test(t)) return input.rooms ? `duplex cu ${input.rooms} camere` : "duplex";
  if (/\bmansarda\b/.test(t)) return "mansarda";
  if (/\bgarsonier[aă]?\b/.test(t) || input.rooms === 1) return "garsoniera";
  if (input.rooms) return `apartament cu ${input.rooms} camere`;
  return "proprietate";
}

function inferLocation(input: VerdictInput): string | null {
  if (input.address) return input.address;
  if (!input.title) return null;
  const t = input.title
    .replace(/\|.*/g, "")
    .replace(/^(proprietar|vand|vanzare|inchiriez)\s+/gi, "")
    .trim();
  const m = t.match(/(?:zona|in|langa|aproape\s+de)\s+(.{3,40}?)(?:\s*[,.\-|]|$)/i);
  return m ? m[1].trim() : null;
}

function buildSummary(
  headline: string,
  mustKnow: string,
  hiddenTruths: string[],
  confidenceTone: string,
): string {
  return [headline, mustKnow, hiddenTruths[0], confidenceTone].filter(Boolean).join(" ");
}

/**
 * Build structured quick-take bullet points for the UI.
 * Each bullet is short (max ~60 chars) and actionable.
 */
export function buildQuickTake(input: VerdictInput, verdict: Verdict): string[] {
  const bullets: string[] = [];

  const overpricingPct =
    input.askingPrice && input.avmMid
      ? Math.round(((input.askingPrice - input.avmMid) / input.avmMid) * 100)
      : null;

  // Price bullet
  if (overpricingPct != null) {
    if (overpricingPct < -5)
      bullets.push(`Pret bun - ${Math.abs(overpricingPct)}% sub media zonei`);
    else if (overpricingPct <= 5) bullets.push("Pret corect pentru zona");
    else if (overpricingPct <= 15)
      bullets.push(`Pret cu ${overpricingPct}% peste zona - negociabil`);
    else bullets.push(`Supraevaluat cu ${overpricingPct}% fata de piata`);
  } else if (input.askingPrice && !input.avmMid) {
    bullets.push("Pretul nu poate fi validat - date insuficiente");
  }

  // Condition
  if (input.isUnderConstruction) {
    bullets.push("Constructie noua, la normative actuale");
    if (input.yearBuilt && input.yearBuilt >= new Date().getFullYear())
      bullets.push("Apartament neterminat - verificati stadiul constructiei");
    if (input.isRender || input.photosAreRenders)
      bullets.push("Pozele sunt randari 3D - vizitati pentru stadiul real");
    if (input.estimatedDelivery) bullets.push(`Predare estimata: ${input.estimatedDelivery}`);
  } else if (input.llmCondition === "nou") bullets.push("Constructie noua");
  else if (input.llmCondition === "renovat") bullets.push("Recent renovat");
  else if (input.llmCondition === "de_renovat") bullets.push("Necesita renovare completa");
  else if (input.llmCondition === "necesita_renovare") bullets.push("Necesita lucrari de renovare");

  if (!input.isUnderConstruction && input.photosAreRenders)
    bullets.push("Pozele par a fi randari 3D - verificati la vizionare");

  if (input.isNeverLivedIn) bullets.push("Proprietate nelocuita - stare originala");

  // Amenities
  if (input.hasParking) bullets.push("Loc de parcare inclus");
  if (input.heatingType && /central[aă]/i.test(input.heatingType))
    bullets.push("Centrala termica proprie");
  if (input.transitScore != null && input.transitScore >= 70)
    bullets.push("Transport public la indemana");

  // Risks
  const seismic = normalizeSeismic(input.seismicRiskClass);
  if (seismic === "RsI") bullets.push("Risc seismic major (bulina rosie)");
  else if (seismic === "RsII") bullets.push("Risc seismic semnificativ");
  else if (
    input.riskDominantLabel &&
    input.riskDominantKey &&
    input.riskDominantKey !== "seismic" &&
    (input.riskOverallLevel === "high" || input.riskOverallLevel === "medium")
  ) {
    bullets.push(`${input.riskDominantLabel} - semnal contextual de verificat`);
  }

  if (input.yearBuilt && input.yearBuilt < 1978 && !input.isUnderConstruction)
    bullets.push(`Cladire din ${input.yearBuilt} - verificati structura`);

  if (!input.hasPhotos) bullets.push("Fara fotografii - verificati la vizionare");
  if (input.hasPlusTVA) bullets.push("Pret + TVA - costul real e mai mare");

  if (input.sellerType === "dezvoltator") bullets.push("Direct de la dezvoltator");
  if (verdict === "EVITA" && bullets.length < 6)
    bullets.push("Raportul cere prudenta maxima inainte de oferta");
  if (verdict === "RECOMANDAT" && bullets.length < 6)
    bullets.push("Merita pastrat pe short-list cu verificari standard");

  return bullets.slice(0, 4);
}
