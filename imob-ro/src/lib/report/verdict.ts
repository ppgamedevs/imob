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
// Rich narrative summary - written like a human property review
// ---------------------------------------------------------------------------

function inferPropType(input: VerdictInput): string {
  const t = (input.title ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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
  const t = input.title.replace(/\|.*/g, "").replace(/^(proprietar|vand|vanzare|inchiriez)\s+/gi, "").trim();
  const m = t.match(/(?:zona|in|langa|aproape\s+de)\s+(.{3,40}?)(?:\s*[,.\-|]|$)/i);
  return m ? m[1].trim() : null;
}

function buildSummary(
  input: VerdictInput,
  verdict: Verdict,
  overpricingPct: number | null,
  killers: DealKiller[],
): string {
  const fmt = (n: number) => n.toLocaleString("ro-RO");
  const cur = input.currency || "EUR";
  const propType = inferPropType(input);
  const location = inferLocation(input);
  const areaStr = input.areaM2 ? `${input.areaM2} mp` : null;
  const isHouse = /casa|vila|duplex/.test(propType);

  // Gather all the things we know
  const positives: string[] = [];
  const negatives: string[] = [];
  const caveats: string[] = [];

  // Price assessment
  if (overpricingPct != null) {
    if (overpricingPct < -10) positives.push(`pretul este cu ${Math.abs(overpricingPct)}% sub media zonei - oportunitate de pret`);
    else if (overpricingPct <= 5) positives.push("pretul este aliniat cu piata din zona");
    else if (overpricingPct <= 15) negatives.push(`pretul este cu ${overpricingPct}% peste media zonei - exista loc de negociere`);
    else negatives.push(`pretul este cu ${overpricingPct}% peste piata - semnificativ supraevaluat`);
  } else if (input.askingPrice && !input.avmMid) {
    caveats.push("nu avem suficiente date in zona pentru a valida pretul");
  }

  // Construction & condition
  if (input.isUnderConstruction) {
    positives.push("constructie noua, la normativele actuale");
    if (input.yearBuilt && input.yearBuilt >= new Date().getFullYear())
      caveats.push("imobilul nu este inca finalizat - exista riscul intarzierilor");
    if (input.estimatedDelivery)
      caveats.push(`predare estimata: ${input.estimatedDelivery}`);
    if (input.isRender || input.photosAreRenders)
      negatives.push("fotografiile din anunt sunt randari 3D, nu poze reale - vizitati proprietatea pentru a vedea stadiul real al constructiei");
  } else if (input.llmCondition === "nou") {
    positives.push("constructie noua");
  } else if (input.llmCondition === "renovat") {
    positives.push("recent renovat");
  } else if (input.llmCondition === "de_renovat") {
    negatives.push("necesita renovare completa - bugetati suplimentar");
  } else if (input.llmCondition === "necesita_renovare") {
    negatives.push("necesita lucrari de renovare");
  }

  // Render warning for non-construction listings too
  if (!input.isUnderConstruction && input.photosAreRenders) {
    caveats.push("fotografiile par a fi randari 3D, nu poze reale - verificati starea reala la vizionare");
  }

  if (input.isNeverLivedIn) positives.push("proprietate nelocuita - finisaje in stare originala");
  if (input.hasParking) positives.push("loc de parcare inclus");
  if (input.heatingType && /central[aă]/i.test(input.heatingType)) positives.push("centrala termica proprie");
  if (input.hasElevator) positives.push("bloc cu lift");
  if (input.sellerType === "dezvoltator") positives.push("achizitie directa de la dezvoltator");
  if (input.transitScore != null && input.transitScore >= 70) positives.push("acces foarte bun la transport public");

  // Negatives
  if (input.yearBuilt && input.yearBuilt < 1978 && !input.isUnderConstruction)
    negatives.push("cladire veche (inainte de 1977) - verificati expertiza tehnica");
  if (!isHouse && input.floor != null && input.floor >= 4 && !input.hasElevator)
    negatives.push("etaj inalt fara lift");
  if (!input.hasPhotos) negatives.push("fara fotografii in anunt - nu se poate verifica starea reala");
  if (input.hasPlusTVA) caveats.push("pretul nu include TVA - costul real este mai mare");

  // Seismic
  const seismic = normalizeSeismic(input.seismicRiskClass);
  if (seismic === "RsI") negatives.push("risc seismic major (bulina rosie)");
  else if (seismic === "RsII") negatives.push("risc seismic semnificativ");

  // Build the review
  const parts: string[] = [];

  // Opening - state what it is and our recommendation
  const propDesc = [propType, areaStr].filter(Boolean).join(" de ");
  const locationStr = location ? ` din ${location}` : "";

  if (verdict === "RECOMANDAT") {
    if (positives.length >= 3)
      parts.push(`Recomandam aceasta ${propDesc}${locationStr}. Este o proprietate cu mai multe puncte forte si fara riscuri majore.`);
    else
      parts.push(`Aceasta ${propDesc}${locationStr} este o optiune buna, fara probleme semnificative identificate.`);
  } else if (verdict === "ATENTIE") {
    if (negatives.length > 0)
      parts.push(`Aceasta ${propDesc}${locationStr} are potential, dar exista aspecte care necesita atentie inainte de decizie.`);
    else
      parts.push(`Aceasta ${propDesc}${locationStr} pare in regula, dar nu avem suficiente informatii pentru o recomandare ferma.`);
  } else {
    parts.push(`Nu recomandam aceasta ${propDesc}${locationStr} in forma actuala. Am identificat riscuri importante care trebuie clarificate.`);
  }

  // Price sentence
  if (input.askingPrice) {
    const priceStr = `${fmt(input.askingPrice)} ${cur}`;
    if (overpricingPct != null && overpricingPct < -5)
      parts.push(`La pretul de ${priceStr}, proprietatea este sub valoarea de piata - un avantaj clar pentru cumparator.`);
    else if (overpricingPct != null && overpricingPct <= 5)
      parts.push(`Pretul de ${priceStr} este corect raportat la zona si caracteristici.`);
    else if (overpricingPct != null && overpricingPct > 5)
      parts.push(`Pretul de ${priceStr} este peste media zonei. Negociati sau comparati cu alte oferte similare.`);
    else if (!input.avmMid)
      parts.push(`Pretul cerut este ${priceStr}, dar nu avem suficiente comparabile in zona pentru a confirma daca este corect.`);
  }

  // Top 2-3 positives woven naturally
  if (positives.length > 0) {
    const topPos = positives.slice(0, 3);
    if (topPos.length === 1) parts.push(`Punct forte: ${topPos[0]}.`);
    else parts.push(`Puncte forte: ${topPos.join(", ")}.`);
  }

  // Negatives & caveats
  const concerns = [...negatives.slice(0, 2), ...caveats.slice(0, 2)];
  if (concerns.length > 0) {
    if (verdict === "EVITA")
      parts.push(`Probleme: ${concerns.join("; ")}.`);
    else
      parts.push(`De verificat: ${concerns.join("; ")}.`);
  }

  return parts.join(" ");
}

/**
 * Build structured quick-take bullet points for the UI.
 * Each bullet is short (max ~60 chars) and actionable.
 */
export function buildQuickTake(input: VerdictInput, verdict: Verdict): string[] {
  const bullets: string[] = [];
  const fmt = (n: number) => n.toLocaleString("ro-RO");
  const cur = input.currency || "EUR";

  const overpricingPct = input.askingPrice && input.avmMid
    ? Math.round(((input.askingPrice - input.avmMid) / input.avmMid) * 100)
    : null;

  // Price bullet
  if (overpricingPct != null) {
    if (overpricingPct < -5) bullets.push(`Pret bun - ${Math.abs(overpricingPct)}% sub media zonei`);
    else if (overpricingPct <= 5) bullets.push("Pret corect pentru zona");
    else if (overpricingPct <= 15) bullets.push(`Pret cu ${overpricingPct}% peste zona - negociabil`);
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
    if (input.estimatedDelivery)
      bullets.push(`Predare estimata: ${input.estimatedDelivery}`);
  } else if (input.llmCondition === "nou") bullets.push("Constructie noua");
  else if (input.llmCondition === "renovat") bullets.push("Recent renovat");
  else if (input.llmCondition === "de_renovat") bullets.push("Necesita renovare completa");
  else if (input.llmCondition === "necesita_renovare") bullets.push("Necesita lucrari de renovare");

  if (!input.isUnderConstruction && input.photosAreRenders)
    bullets.push("Pozele par a fi randari 3D - verificati la vizionare");

  if (input.isNeverLivedIn) bullets.push("Proprietate nelocuita - stare originala");

  // Amenities
  if (input.hasParking) bullets.push("Loc de parcare inclus");
  if (input.heatingType && /central[aă]/i.test(input.heatingType)) bullets.push("Centrala termica proprie");
  if (input.transitScore != null && input.transitScore >= 70) bullets.push("Transport public la indemana");

  // Risks
  const seismic = normalizeSeismic(input.seismicRiskClass);
  if (seismic === "RsI") bullets.push("Risc seismic major (bulina rosie)");
  else if (seismic === "RsII") bullets.push("Risc seismic semnificativ");

  if (input.yearBuilt && input.yearBuilt < 1978 && !input.isUnderConstruction)
    bullets.push(`Cladire din ${input.yearBuilt} - verificati structura`);

  if (!input.hasPhotos) bullets.push("Fara fotografii - verificati la vizionare");
  if (input.hasPlusTVA) bullets.push("Pret + TVA - costul real e mai mare");

  if (input.sellerType === "dezvoltator") bullets.push("Direct de la dezvoltator");

  return bullets.slice(0, 6);
}
