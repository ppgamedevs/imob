/**
 * Apartment Score engine - deterministic, transparent, reusable.
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
  yearBuilt?: number;
  condition?: "nou" | "renovat" | "locuibil" | "necesita_renovare" | "de_renovat";
  floor?: number;
  totalFloors?: number;
  hasElevator?: boolean;
  hasParking?: boolean;
  heatingType?: string;
  rooms?: number;
  areaM2?: number;
  sellerType?: string;

  isUnderConstruction?: boolean;
  isNeverLivedIn?: boolean;

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

  // No AVM data at all - low but not flatlined
  if (fairLikelyEur <= 0) {
    if (!input.listingPriceEur) return 40;
    // We have a price but no fair estimate - score based on area price reasonableness
    if (input.areaM2 && input.areaM2 > 0) {
      const eurM2 = input.listingPriceEur / input.areaM2;
      if (eurM2 > 4000) return 30;
      if (eurM2 > 3000) return 40;
      if (eurM2 > 2000) return 50;
      if (eurM2 > 1200) return 55;
      return 50;
    }
    return 40;
  }

  const deviation = (price - fairLikelyEur) / fairLikelyEur;
  const absDev = Math.abs(deviation);

  // Base score from price deviation
  let scoreBase: number;
  if (deviation < -0.08) {
    scoreBase = 98; // big bargain
  } else if (deviation < -0.03) {
    scoreBase = 90 + (0.08 - absDev) * 160; // 90-98
  } else if (absDev <= 0.03) {
    scoreBase = 85; // fair price
  } else if (absDev <= 0.08) {
    scoreBase = 85 - (absDev - 0.03) * 600; // 85→55
  } else if (absDev <= 0.15) {
    scoreBase = 55 - (absDev - 0.08) * 400; // 55→27
  } else {
    scoreBase = 27 - (absDev - 0.15) * 200; // keeps dropping
  }

  // Bonus for below-market prices
  if (price < fairLikelyEur) {
    scoreBase += clamp(absDev * 80, 0, 8);
  }

  // Extra penalty for being above range80 max
  if (price > input.range80.max && input.range80.max > 0) {
    const overPct = ((price - input.range80.max) / input.range80.max) * 100;
    scoreBase -= clamp(overPct * 1.5, 0, 15);
  }

  // Cap based on confidence - but with a wider range
  const cap = 50 + confidence * 0.5; // conf 0→cap 50, conf 50→cap 75, conf 100→cap 100
  return clamp(Math.round(Math.min(scoreBase, cap)), 0, 100);
}

// ---------------------------------------------------------------------------
// Sub-score: Risk / Safety (25 %)
// ---------------------------------------------------------------------------

export function computeRiskScore(input: ApartmentScoreInput): number {
  // Start at 70, not 100. Perfect safety must be earned, not assumed.
  let score = 70;

  // --- Building age ---
  if (input.yearBucket === "<1977") {
    score -= 18;
  } else if (input.yearBucket === "1978-1990") {
    score -= 8;
  } else if (input.yearBucket === "1991-2005") {
    score += 5;
  } else if (input.yearBucket === "2006+") {
    score += 12;
  }
  // No yearBucket → no change (uncertainty stays at base)

  // --- Under construction: different risk profile ---
  if (input.isUnderConstruction) {
    score += 8; // new builds meet current codes
    // But add development-specific risks
    if (input.yearBuilt && input.yearBuilt > new Date().getFullYear() + 2) {
      score -= 10; // delivery > 2 years away = higher risk exposure
    }
    if (input.sellerType !== "dezvoltator") {
      score -= 5; // intermediary for new build = less transparency
    }
  }

  // --- Elevator + floor ---
  if (input.hasElevator === false && input.floor != null && input.floor >= 4) {
    score -= 12;
  } else if (input.hasElevator === true) {
    score += 3;
  }

  // --- Seismic ---
  const seismic = input.geoIntel?.seismicRiskClass?.toUpperCase();
  if (seismic === "RS1" || seismic === "RSI") score -= 35;
  else if (seismic === "RS2" || seismic === "RSII") score -= 22;
  else if (seismic === "RS3" || seismic === "RSIII") score -= 8;

  // --- Condition ---
  if (input.condition === "nou") score += 8;
  else if (input.condition === "renovat") score += 5;
  else if (input.condition === "locuibil") score += 0;
  else if (input.condition === "necesita_renovare") score -= 6;
  else if (input.condition === "de_renovat") score -= 12;

  // --- Parking ---
  if (input.hasParking === true) score += 3;

  // --- Never lived in ---
  if (input.isNeverLivedIn) score += 3;

  // --- Heating ---
  if (input.heatingType) {
    const ht = input.heatingType.toLowerCase();
    if (/central[aă]/i.test(ht)) score += 3;
    else if (/radet|termoficare/i.test(ht)) score -= 2;
  }

  // --- Integrity signals ---
  if (input.integrity) {
    if ((input.integrity.duplicates ?? 0) > 2) score -= 5;
    if ((input.integrity.reposts ?? 0) > 1) score -= 4;
    if ((input.integrity.priceDrops ?? 0) > 2) score -= 3;
  }

  return clamp(Math.round(score), 0, 100);
}

// ---------------------------------------------------------------------------
// Sub-score: Liquidity (20 %)
// ---------------------------------------------------------------------------

export function computeLiquidityScore(input: ApartmentScoreInput): number {
  let score = 50; // default when no data (not 60)

  const liq = input.liquidity;
  if (liq?.daysMin != null && liq?.daysMax != null) {
    const avg = (liq.daysMin + liq.daysMax) / 2;
    if (avg <= 20) score = 92;
    else if (avg <= 35) score = 78;
    else if (avg <= 45) score = 68;
    else if (avg <= 60) score = 55;
    else if (avg <= 90) score = 42;
    else score = 28;
  } else if (liq?.label === "ridicata") {
    score = 82;
  } else if (liq?.label === "medie") {
    score = 58;
  } else if (liq?.label === "scazuta") {
    score = 32;
  }

  // Positive signals
  if (input.rooms != null) {
    if (input.rooms === 2) score += 5; // 2-room apartments sell fastest in Bucharest
    else if (input.rooms === 1) score += 3;
    else if (input.rooms === 3) score += 2;
  }

  if (input.areaM2 != null) {
    if (input.areaM2 >= 40 && input.areaM2 <= 80) score += 3; // sweet spot
    else if (input.areaM2 > 120) score -= 3; // large apartments sell slower
  }

  if (input.hasParking === true) score += 4;

  if (input.geoIntel?.metroWalkMin != null && input.geoIntel.metroWalkMin <= 10) {
    score += 5; // metro proximity boosts liquidity
  }

  // Under construction = lower liquidity (can't resell immediately)
  if (input.isUnderConstruction) score -= 8;

  // Integrity penalties
  if (input.integrity) {
    if ((input.integrity.priceDrops ?? 0) >= 3) score -= 8;
    else if ((input.integrity.priceDrops ?? 0) >= 1) score -= 3;
    if ((input.integrity.reposts ?? 0) >= 2) score -= 6;
  }

  return clamp(Math.round(score), 0, 100);
}

// ---------------------------------------------------------------------------
// Sub-score: Lifestyle Fit (15 %)
// ---------------------------------------------------------------------------

export function computeLifestyleScore(input: ApartmentScoreInput): number {
  let score = 45; // base when no geo data

  const geo = input.geoIntel;

  // --- Metro access (major factor) ---
  if (geo?.metroWalkMin != null) {
    if (geo.metroWalkMin <= 5) score += 20;
    else if (geo.metroWalkMin <= 10) score += 14;
    else if (geo.metroWalkMin <= 15) score += 7;
    else if (geo.metroWalkMin <= 25) score += 0;
    else score -= 8;
  }

  // --- Vibe scores ---
  const vibe = geo?.vibe;
  if (vibe) {
    const avg = (
      (vibe.convenience ?? 0) +
      (vibe.green ?? 0) +
      (vibe.family ?? 0) +
      (vibe.nightlife ?? 0)
    ) / 4;

    if (avg >= 70) score += 12;
    else if (avg >= 50) score += 7;
    else if (avg >= 30) score += 3;
    else score -= 3;

    // Specific bonuses
    if ((vibe.convenience ?? 0) >= 70) score += 4;
    if ((vibe.green ?? 0) >= 70) score += 3;
    if ((vibe.family ?? 0) >= 70) score += 3;
  }

  // --- Property-level lifestyle factors ---
  if (input.hasParking === true) score += 3;
  if (input.hasElevator === true) score += 2;

  if (input.condition === "nou" || input.condition === "renovat") score += 4;
  else if (input.condition === "de_renovat") score -= 5;

  // Balcony / area per room
  if (input.areaM2 && input.rooms && input.rooms > 0) {
    const mpPerRoom = input.areaM2 / input.rooms;
    if (mpPerRoom >= 25) score += 3;
    else if (mpPerRoom < 15) score -= 3;
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

  if (deviation < -0.08) signals.push({ text: "Pret semnificativ sub valoarea pietei", strength: 12 });
  else if (deviation < -0.03) signals.push({ text: "Pret sub valoarea probabila", strength: 10 });
  else if (deviation >= -0.03 && deviation <= 0.05)
    signals.push({ text: "Pret in intervalul corect", strength: 6 });

  if (input.isUnderConstruction) {
    signals.push({ text: "Constructie noua - normative actuale", strength: 7 });
    if (input.sellerType === "dezvoltator")
      signals.push({ text: "Direct de la dezvoltator", strength: 5 });
  } else {
    if (input.condition === "nou")
      signals.push({ text: "Constructie noua / finisaje noi", strength: 7 });
    if (input.condition === "renovat") signals.push({ text: "Renovat recent", strength: 5 });
  }

  if (input.geoIntel?.metroWalkMin != null && input.geoIntel.metroWalkMin <= 10)
    signals.push({ text: "Metrou la mai putin de 10 minute", strength: 6 });

  if (
    input.liquidity?.label === "ridicata" ||
    (input.liquidity?.daysMin != null && input.liquidity.daysMin <= 20)
  )
    signals.push({ text: "Cerere ridicata in zona", strength: 5 });

  if (input.yearBucket === "2006+" && !input.isUnderConstruction)
    signals.push({ text: "Constructie moderna (dupa 2006)", strength: 4 });

  if (input.hasElevator === true) signals.push({ text: "Bloc cu lift", strength: 3 });
  if (input.hasParking === true) signals.push({ text: "Loc de parcare inclus", strength: 4 });
  if (input.isNeverLivedIn) signals.push({ text: "Proprietate nelocuita", strength: 3 });

  if (input.heatingType && /central[aă]/i.test(input.heatingType))
    signals.push({ text: "Centrala termica proprie", strength: 3 });

  const vibe = input.geoIntel?.vibe;
  if (vibe) {
    if ((vibe.green ?? 0) >= 70) signals.push({ text: "Zona verde, cu parcuri", strength: 4 });
    if ((vibe.convenience ?? 0) >= 70)
      signals.push({ text: "Magazine si servicii in apropiere", strength: 3 });
    if ((vibe.family ?? 0) >= 70)
      signals.push({ text: "Zona potrivita pentru familii", strength: 3 });
  }

  if (input.confidence >= 75) signals.push({ text: "Estimare cu incredere ridicata", strength: 3 });

  if (input.areaM2 && input.rooms && input.rooms > 0) {
    const mpPerRoom = input.areaM2 / input.rooms;
    if (mpPerRoom >= 25) signals.push({ text: "Suprafata generoasa per camera", strength: 3 });
  }

  const result = signals
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3)
    .map((s) => s.text);
  while (result.length < 3) {
    const filler = [
      "Zona cu cerere constanta",
      "Fara probleme majore identificate",
      "Pret in limitele pietei",
    ];
    result.push(filler[result.length - signals.length] ?? filler[0]);
  }
  return result;
}

function generateCons(input: ApartmentScoreInput): string[] {
  const signals: Signal[] = [];
  const price = input.listingPriceEur ?? input.fairLikelyEur;
  const deviation =
    input.fairLikelyEur > 0 ? (price - input.fairLikelyEur) / input.fairLikelyEur : 0;

  if (deviation > 0.15) signals.push({ text: "Semnificativ supraevaluat fata de piata", strength: 12 });
  else if (deviation > 0.07) signals.push({ text: "Supraevaluat fata de comparabile", strength: 10 });

  if (input.isUnderConstruction) {
    signals.push({ text: "Apartament nefinalizat - risc de intarziere", strength: 7 });
    if (input.yearBuilt && input.yearBuilt > new Date().getFullYear() + 2)
      signals.push({ text: "Termen predare indepartat", strength: 6 });
  } else {
    if (input.yearBucket === "<1977")
      signals.push({ text: "Bloc vechi (inainte de 1977)", strength: 7 });
    else if (input.yearBucket === "1978-1990")
      signals.push({ text: "Constructie din perioada comunista", strength: 4 });
  }

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
  if (input.hasParking === false || input.hasParking === undefined)
    signals.push({ text: "Fara loc de parcare mentionat", strength: 3 });
  if (input.confidence < 30)
    signals.push({ text: "Date insuficiente pentru estimare precisa", strength: 5 });
  else if (input.confidence < 50)
    signals.push({ text: "Estimare cu incredere moderata", strength: 3 });

  if (input.heatingType && /radet|termoficare/i.test(input.heatingType))
    signals.push({ text: "Incalzire centralizata (RADET)", strength: 3 });

  const result = signals
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3)
    .map((s) => s.text);
  while (result.length < 3) {
    const filler = [
      "Verifica starea reala la vizionare",
      "Compara cu alte anunturi din zona",
      "Analizeaza costurile totale de achizitie",
    ];
    result.push(filler[result.length - signals.length] ?? filler[0]);
  }
  return result;
}

function generateActions(input: ApartmentScoreInput): string[] {
  const actions: Signal[] = [];
  const price = input.listingPriceEur ?? input.fairLikelyEur;
  const deviation =
    input.fairLikelyEur > 0 ? (price - input.fairLikelyEur) / input.fairLikelyEur : 0;

  if (deviation > 0.05)
    actions.push({ text: "Negociaza folosind comparabilele din zona", strength: 9 });

  if (input.isUnderConstruction) {
    actions.push({ text: "Verifica autorizatia de construire si stadiul lucrarilor", strength: 9 });
    actions.push({ text: "Solicita clauzele de penalizare pentru intarziere", strength: 7 });
    actions.push({ text: "Verifica reputatia dezvoltatorului", strength: 6 });
  } else {
    if (input.condition === "de_renovat" || input.condition === "necesita_renovare")
      actions.push({ text: "Estimeaza bugetul de renovare inainte de oferta", strength: 7 });
  }

  if (input.confidence < 50)
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
  actions.push({ text: "Solicita extras CF actualizat", strength: 2 });
  actions.push({ text: "Cere ultimele facturi de utilitati", strength: 1 });

  return actions
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3)
    .map((s) => s.text);
}

// ---------------------------------------------------------------------------
// Main - computeApartmentScore
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
