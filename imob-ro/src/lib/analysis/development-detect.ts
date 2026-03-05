/**
 * Detect whether a listing is for an apartment under construction / in development.
 * Returns structured signals used by the score engine, verdict, and report UI.
 */

export interface DevelopmentSignals {
  isUnderConstruction: boolean;
  confidence: number;
  estimatedDelivery: string | null;
  hasVAT: boolean;
  vatRate: number | null;
  projectName: string | null;
  isRender: boolean;
  signals: string[];
}

const CURRENT_YEAR = new Date().getFullYear();

const CONSTRUCTION_PATTERNS = [
  /\bin\s+construc[tț]ie\b/i,
  /\bpredare\s+(?:Q[1-4]|trimestru|20\d{2})/i,
  /\bfinalizare\s+(?:Q[1-4]|trimestru|20\d{2})/i,
  /\btermen\s+(?:de\s+)?(?:predare|finalizare)/i,
  /\bstadiu(?:l)?\s+(?:de\s+)?construc/i,
  /\bbloc\s+nou\b/i,
  /\bansamblu\s+reziden[tț]ial\b/i,
  /\bcomplex\s+reziden[tț]ial\b/i,
  /\bproiect\s+(?:nou|reziden)/i,
  /\bse\s+pred[aă]\b/i,
  /\bnemobilat.*(?:predare|recep[tț])/i,
];

const VAT_PATTERNS = [
  { re: /\+\s*TVA/i, included: false },
  { re: /TVA\s+inclus/i, included: true },
  { re: /pre[tț]\s+f[aă]r[aă]\s+TVA/i, included: false },
  { re: /nu\s+include\s+TVA/i, included: false },
  { re: /pre[tț]\s+cu\s+TVA/i, included: true },
  { re: /TVA\s+5\s*%/i, included: false, rate: 5 },
  { re: /TVA\s+19\s*%/i, included: false, rate: 19 },
  { re: /TVA\s+9\s*%/i, included: false, rate: 9 },
];

const DELIVERY_PATTERNS = [
  /predare\s+(Q[1-4]\s+20\d{2})/i,
  /finalizare\s+(Q[1-4]\s+20\d{2})/i,
  /predare\s+(20\d{2})/i,
  /finalizare\s+(20\d{2})/i,
  /termen\s+(?:de\s+)?(?:predare|finalizare)\s*:?\s*(Q[1-4]\s+20\d{2}|20\d{2})/i,
  /gata\s+[iî]n\s+(20\d{2})/i,
];

const PROJECT_NAME_RE =
  /\b((?:\w+\s+){0,2}(?:Residence|Residences|Park|Garden|City|Plaza|Towers?|Heights?|Greenfield|Gran Via|Cortina|Cosmopolis|Horizon|West\s+Park|New\s+Point|Colina|Sema|One\s+\w+|Aviatiei\s+\w+|Ivory|Nusco|Sky|Upground|Belvedere|Premium|Luxuria)(?:\s+\w+)?)\b/i;

export function detectDevelopmentStatus(
  title: string | null | undefined,
  description: string | null | undefined,
  yearBuilt: number | null | undefined,
  sellerType: string | null | undefined,
  priceText: string | null | undefined,
): DevelopmentSignals {
  const result: DevelopmentSignals = {
    isUnderConstruction: false,
    confidence: 0,
    estimatedDelivery: null,
    hasVAT: false,
    vatRate: null,
    projectName: null,
    isRender: false,
    signals: [],
  };

  const combined = [title, description, priceText].filter(Boolean).join(" ");
  let score = 0;

  // Signal 1: Year built is in the future
  if (yearBuilt != null && yearBuilt > CURRENT_YEAR) {
    score += 40;
    result.signals.push(`An constructie ${yearBuilt} (in viitor)`);
    result.estimatedDelivery = String(yearBuilt);
  } else if (yearBuilt != null && yearBuilt === CURRENT_YEAR) {
    score += 15;
    result.signals.push(`An constructie ${yearBuilt} (anul curent)`);
  }

  // Signal 2: Construction-related text patterns
  for (const pattern of CONSTRUCTION_PATTERNS) {
    if (pattern.test(combined)) {
      score += 15;
      result.signals.push(`Text detectat: ${pattern.source.slice(0, 40)}`);
      break; // only count once
    }
  }

  // Signal 3: Developer seller type
  if (sellerType === "dezvoltator") {
    score += 10;
    result.signals.push("Tip vanzator: dezvoltator");
  }

  // Signal 4: "Comision 0%" common for developers
  if (/comision\s*0\s*%/i.test(combined)) {
    score += 8;
    result.signals.push("Comision 0%");
  }

  // VAT detection
  for (const vp of VAT_PATTERNS) {
    if (vp.re.test(combined)) {
      result.hasVAT = true;
      if ("rate" in vp && vp.rate) result.vatRate = vp.rate;
      if (!result.vatRate) result.vatRate = 19; // default
      score += 10;
      result.signals.push(`TVA detectat${result.vatRate ? ` (${result.vatRate}%)` : ""}`);
      break;
    }
  }

  // Delivery date extraction
  if (!result.estimatedDelivery) {
    for (const dp of DELIVERY_PATTERNS) {
      const m = combined.match(dp);
      if (m) {
        result.estimatedDelivery = m[1];
        break;
      }
    }
  }

  // Project name extraction
  const projMatch = (title ?? "").match(PROJECT_NAME_RE);
  if (projMatch) {
    result.projectName = projMatch[1].trim();
  }

  result.confidence = Math.min(score, 100);
  result.isUnderConstruction = score >= 30;

  // Photos are likely renders if under construction
  // Future year: almost certain renders. Current year: very likely renders.
  // High confidence under-construction with developer: also likely renders.
  if (result.isUnderConstruction) {
    if (yearBuilt != null && yearBuilt > CURRENT_YEAR) {
      result.isRender = true;
    } else if (yearBuilt != null && yearBuilt === CURRENT_YEAR && score >= 40) {
      result.isRender = true;
    } else if (score >= 50 && sellerType === "dezvoltator") {
      result.isRender = true;
    }
  }

  return result;
}

/**
 * Compute the VAT-inclusive price when +TVA is detected.
 */
export function computePriceWithVAT(
  priceEur: number,
  vatRate: number,
): { priceWithVAT: number; vatAmount: number } {
  const vatAmount = Math.round(priceEur * (vatRate / 100));
  return { priceWithVAT: priceEur + vatAmount, vatAmount };
}

/**
 * Check if the apartment might be eligible for reduced 5% VAT.
 * Romania: 5% for first-home purchases, price < 120,000 EUR (fara TVA), area < 120mp.
 */
export function checkReducedVATEligibility(
  priceEurWithoutVAT: number,
  areaM2: number | null | undefined,
): { eligible: boolean; reason: string } {
  if (priceEurWithoutVAT > 120_000) {
    return { eligible: false, reason: "Pretul depaseste plafonul de 120.000 EUR (fara TVA)" };
  }
  if (areaM2 != null && areaM2 > 120) {
    return { eligible: false, reason: "Suprafata depaseste 120 mp" };
  }
  return {
    eligible: true,
    reason: "Posibil TVA redus 5% daca este prima locuinta si suprafata < 120mp",
  };
}
