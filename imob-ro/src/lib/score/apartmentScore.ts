/**
 * Apartment Score engine — deterministic, transparent, reusable.
 *
 * Produces a 0–100 composite score from 4 weighted sub-scores:
 *   Value (40%) · Risk (25%) · Liquidity (20%) · Lifestyle (15%)
 *
 * Also generates structured pros / cons / actions.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScoreLabel = "Excelent" | "Bun" | "OK" | "Atentie" | "Evita";

export interface ApartmentScore {
  score: number;
  label: ScoreLabel;
  subscores: {
    value: number;
    risk: number;
    liquidity: number;
    lifestyle: number;
  };
  pros: string[];
  cons: string[];
  actions: string[];
  confidence: number;
}

export interface ApartmentScoreInput {
  listingPriceEur?: number;
  fairLikelyEur: number;
  range80: { min: number; max: number };
  range95: { min: number; max: number };
  confidence: number;

  yearBucket?: "<1977" | "1978-1990" | "1991-2005" | "2006+";
  condition?: "nou" | "renovat" | "locuibil" | "necesita_renovare" | "de_renovat";
  floor?: number;
  totalFloors?: number;
  hasElevator?: boolean;

  liquidity?: {
    daysMin?: number;
    daysMax?: number;
    label?: string;
  };

  integrity?: {
    priceDrops?: number;
    reposts?: number;
    duplicates?: number;
  };

  geoIntel?: {
    seismicRiskClass?: string;
    metroWalkMin?: number;
    vibe?: {
      nightlife?: number;
      family?: number;
      convenience?: number;
      green?: number;
    };
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function labelFromScore(score: number): ScoreLabel {
  if (score >= 90) return "Excelent";
  if (score >= 75) return "Bun";
  if (score >= 60) return "OK";
  if (score >= 40) return "Atentie";
  return "Evita";
}

// ---------------------------------------------------------------------------
// Sub-score: Value (40 %)
// ---------------------------------------------------------------------------

export function computeValueScore(input: ApartmentScoreInput): number {
  const { fairLikelyEur, confidence } = input;
  const price = input.listingPriceEur ?? fairLikelyEur;

  if (fairLikelyEur <= 0) return 55;

  const deviation = (price - fairLikelyEur) / fairLikelyEur;
  const absDev = Math.abs(deviation);

  let scoreBase: number;
  if (absDev <= 0.03) {
    scoreBase = 95;
  } else if (absDev <= 0.08) {
    scoreBase = 95 - (absDev - 0.03) * 400;
  } else {
    scoreBase = 75 - (absDev - 0.08) * 500;
  }

  if (price < fairLikelyEur) {
    scoreBase += clamp(absDev * 100, 0, 10);
  }

  if (price > input.range80.max) {
    const overPct = ((price - input.range80.max) / input.range80.max) * 100;
    scoreBase -= clamp(overPct * 2, 0, 20);
  }

  const cap = 60 + confidence * 0.4;
  return clamp(Math.round(Math.min(scoreBase, cap)), 0, 100);
}

// ---------------------------------------------------------------------------
// Sub-score: Risk (25 %)
// ---------------------------------------------------------------------------

export function computeRiskScore(input: ApartmentScoreInput): number {
  let score = 100;

  if (input.yearBucket === "<1977") score -= 20;

  if (input.hasElevator === false && input.floor != null && input.floor >= 4) {
    score -= 15;
  }

  const seismic = input.geoIntel?.seismicRiskClass?.toUpperCase();
  if (seismic === "RS1" || seismic === "RSI") score -= 40;
  else if (seismic === "RS2" || seismic === "RSII") score -= 25;
  else if (seismic === "RS3" || seismic === "RSIII") score -= 10;

  if (input.condition === "de_renovat") score -= 8;
  else if (input.condition === "necesita_renovare") score -= 4;

  if (input.integrity) {
    if ((input.integrity.duplicates ?? 0) > 2) score -= 5;
    if ((input.integrity.reposts ?? 0) > 1) score -= 3;
  }

  return clamp(Math.round(score), 0, 100);
}

// ---------------------------------------------------------------------------
// Sub-score: Liquidity (20 %)
// ---------------------------------------------------------------------------

export function computeLiquidityScore(input: ApartmentScoreInput): number {
  let score = 60;

  const liq = input.liquidity;
  if (liq?.daysMin != null && liq?.daysMax != null) {
    const avg = (liq.daysMin + liq.daysMax) / 2;
    if (avg <= 20) score = 95;
    else if (avg <= 35) score = 80;
    else if (avg <= 45) score = 70;
    else if (avg <= 60) score = 60;
    else if (avg <= 90) score = 45;
    else score = 30;
  } else if (liq?.label === "ridicata") {
    score = 85;
  } else if (liq?.label === "medie") {
    score = 60;
  } else if (liq?.label === "scazuta") {
    score = 35;
  }

  if (input.integrity) {
    if ((input.integrity.priceDrops ?? 0) >= 3) score -= 10;
    else if ((input.integrity.priceDrops ?? 0) >= 1) score -= 5;
    if ((input.integrity.reposts ?? 0) >= 2) score -= 8;
  }

  return clamp(Math.round(score), 0, 100);
}

// ---------------------------------------------------------------------------
// Sub-score: Lifestyle Fit (15 %)
// ---------------------------------------------------------------------------

export function computeLifestyleScore(input: ApartmentScoreInput): number {
  const geo = input.geoIntel;
  if (!geo) return 50;

  let score = 50;

  if (geo.metroWalkMin != null) {
    if (geo.metroWalkMin <= 10) score += 15;
    else if (geo.metroWalkMin <= 15) score += 8;
    else if (geo.metroWalkMin > 25) score -= 5;
  }

  const vibe = geo.vibe;
  if (vibe) {
    if ((vibe.convenience ?? 0) >= 60) score += 8;
    if ((vibe.green ?? 0) >= 60) score += 7;
    if ((vibe.family ?? 0) >= 60) score += 7;
    if ((vibe.nightlife ?? 0) >= 60) score += 5;
  }

  return clamp(Math.round(score), 0, 100);
}

// ---------------------------------------------------------------------------
// Pros / Cons / Actions generation
// ---------------------------------------------------------------------------

interface Signal {
  text: string;
  strength: number;
}

function generatePros(input: ApartmentScoreInput): string[] {
  const signals: Signal[] = [];
  const price = input.listingPriceEur ?? input.fairLikelyEur;
  const deviation =
    input.fairLikelyEur > 0 ? (price - input.fairLikelyEur) / input.fairLikelyEur : 0;

  if (deviation < -0.03) signals.push({ text: "Pret sub valoarea probabila", strength: 10 });
  if (deviation >= -0.03 && deviation <= 0.05)
    signals.push({ text: "Pret in intervalul corect", strength: 6 });

  if (input.condition === "nou")
    signals.push({ text: "Constructie noua / finisaje noi", strength: 7 });
  if (input.condition === "renovat") signals.push({ text: "Renovat recent", strength: 5 });

  if (input.geoIntel?.metroWalkMin != null && input.geoIntel.metroWalkMin <= 10)
    signals.push({ text: "Metrou la mai putin de 10 minute", strength: 6 });

  if (
    input.liquidity?.label === "ridicata" ||
    (input.liquidity?.daysMin != null && input.liquidity.daysMin <= 20)
  )
    signals.push({ text: "Cerere ridicata in zona", strength: 5 });

  if (input.yearBucket === "2006+")
    signals.push({ text: "Constructie moderna (dupa 2006)", strength: 4 });

  if (input.hasElevator === true) signals.push({ text: "Bloc cu lift", strength: 3 });

  const vibe = input.geoIntel?.vibe;
  if (vibe) {
    if ((vibe.green ?? 0) >= 70) signals.push({ text: "Zona verde, cu parcuri", strength: 4 });
    if ((vibe.convenience ?? 0) >= 70)
      signals.push({ text: "Magazine si servicii in apropiere", strength: 3 });
    if ((vibe.family ?? 0) >= 70)
      signals.push({ text: "Zona potrivita pentru familii", strength: 3 });
  }

  if (input.confidence >= 75) signals.push({ text: "Estimare cu incredere ridicata", strength: 3 });

  const generic: string[] = [
    "Zona cu cerere constanta",
    "Pret in limitele pietei",
    "Fara probleme majore identificate",
  ];
  const result = signals
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3)
    .map((s) => s.text);
  while (result.length < 3) result.push(generic[result.length]!);
  return result;
}

function generateCons(input: ApartmentScoreInput): string[] {
  const signals: Signal[] = [];
  const price = input.listingPriceEur ?? input.fairLikelyEur;
  const deviation =
    input.fairLikelyEur > 0 ? (price - input.fairLikelyEur) / input.fairLikelyEur : 0;

  if (deviation > 0.07) signals.push({ text: "Supraevaluat fata de comparabile", strength: 10 });

  if (input.yearBucket === "<1977")
    signals.push({ text: "Bloc vechi (inainte de 1977)", strength: 7 });

  if (input.hasElevator === false && input.floor != null && input.floor >= 4)
    signals.push({ text: "Etaj inalt fara lift", strength: 7 });

  const seismic = input.geoIntel?.seismicRiskClass?.toUpperCase();
  if (seismic === "RS1" || seismic === "RSI")
    signals.push({ text: "Risc seismic major (bulina rosie)", strength: 10 });
  else if (seismic === "RS2" || seismic === "RSII")
    signals.push({ text: "Risc seismic semnificativ", strength: 8 });

  if (input.condition === "de_renovat")
    signals.push({ text: "Necesita renovare completa", strength: 6 });
  else if (input.condition === "necesita_renovare")
    signals.push({ text: "Necesita lucrari de renovare", strength: 4 });

  if (input.integrity?.reposts != null && input.integrity.reposts >= 2)
    signals.push({ text: "Anunt repostat de mai multe ori", strength: 5 });

  if (input.integrity?.priceDrops != null && input.integrity.priceDrops >= 2)
    signals.push({ text: "Reduceri multiple de pret", strength: 4 });

  if (input.liquidity?.label === "scazuta")
    signals.push({ text: "Lichiditate scazuta in zona", strength: 5 });

  if (input.geoIntel?.metroWalkMin != null && input.geoIntel.metroWalkMin > 20)
    signals.push({ text: "Departe de metrou", strength: 4 });

  if (input.confidence < 40)
    signals.push({ text: "Date insuficiente pentru estimare precisa", strength: 3 });

  const generic: string[] = [
    "Verifica starea reala la vizionare",
    "Compara cu alte anunturi din zona",
    "Analizeaza costurile totale de achizitie",
  ];
  const result = signals
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3)
    .map((s) => s.text);
  while (result.length < 3) result.push(generic[result.length]!);
  return result;
}

function generateActions(input: ApartmentScoreInput): string[] {
  const actions: Signal[] = [];
  const price = input.listingPriceEur ?? input.fairLikelyEur;
  const deviation =
    input.fairLikelyEur > 0 ? (price - input.fairLikelyEur) / input.fairLikelyEur : 0;

  if (deviation > 0.05)
    actions.push({ text: "Negociaza folosind comparabilele din zona", strength: 9 });

  if (input.condition === "de_renovat" || input.condition === "necesita_renovare")
    actions.push({ text: "Estimeaza bugetul de renovare inainte de oferta", strength: 7 });

  if (input.confidence < 60)
    actions.push({ text: "Completeaza mai multe detalii pentru estimare precisa", strength: 6 });

  if (
    input.geoIntel?.seismicRiskClass &&
    ["RS1", "RS2", "RSI", "RSII"].includes(input.geoIntel.seismicRiskClass.toUpperCase())
  )
    actions.push({ text: "Solicita expertiza tehnica inainte de achizitie", strength: 10 });

  if (input.integrity?.duplicates != null && input.integrity.duplicates > 0)
    actions.push({ text: "Verifica daca anuntul e repostat pe mai multe site-uri", strength: 5 });

  if (input.yearBucket === "<1977")
    actions.push({ text: "Verifica expertiza seismica si starea structurala", strength: 6 });

  if (!input.listingPriceEur)
    actions.push({ text: "Compara cu preturile anunturilor din zona", strength: 4 });

  actions.push({ text: "Viziteaza apartamentul inainte de decizie", strength: 3 });
  actions.push({ text: "Compara cu alte anunturi din zona", strength: 2 });
  actions.push({ text: "Solicita detalii suplimentare de la vanzator", strength: 1 });

  return actions
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3)
    .map((s) => s.text);
}

// ---------------------------------------------------------------------------
// Main — computeApartmentScore
// ---------------------------------------------------------------------------

const W_VALUE = 0.4;
const W_RISK = 0.25;
const W_LIQUIDITY = 0.2;
const W_LIFESTYLE = 0.15;

export function computeApartmentScore(input: ApartmentScoreInput): ApartmentScore {
  const value = computeValueScore(input);
  const risk = computeRiskScore(input);
  const liquidity = computeLiquidityScore(input);
  const lifestyle = computeLifestyleScore(input);

  const raw = value * W_VALUE + risk * W_RISK + liquidity * W_LIQUIDITY + lifestyle * W_LIFESTYLE;

  const score = clamp(Math.round(raw), 0, 100);

  return {
    score,
    label: labelFromScore(score),
    subscores: { value, risk, liquidity, lifestyle },
    pros: generatePros(input),
    cons: generateCons(input),
    actions: generateActions(input),
    confidence: input.confidence,
  };
}
