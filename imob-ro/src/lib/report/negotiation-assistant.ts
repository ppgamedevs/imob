/**
 * Deterministic copy for the buyer "negotiation assistant" — no LLM.
 * Complements `generateNegotiationPoints` with strategy, static questions, and a short WhatsApp template.
 */

import type { NegotiationPoint } from "@/lib/report/negotiation";

export type NegotiationStrategyKind = "overpriced" | "fair" | "low_confidence" | "risk_focus";

export type NegotiationStrategyBlock = {
  kind: NegotiationStrategyKind;
  titleRo: string;
  bodyRo: string;
};

export type NegotiationAssistantBundle = {
  strategy: NegotiationStrategyBlock;
  leverageBulletsRo: string[];
  practicalQuestionsRo: string[];
  suggestedMessageRo: string;
  /** When true, UI may show a numeric “opening range” from comps. */
  allowNumericOfferHint: boolean;
};

const CORE_QUESTIONS_RO: string[] = [
  "Care este anul construcției?",
  "Există cadastru și intabulare?",
  "Apartamentul are modificări interioare?",
  "Există datorii la întreținere?",
  "Care este motivul vânzării?",
  "Prețul este negociabil?",
  "Ce acte sunt disponibile înainte de antecontract?",
  "Când se poate face predarea?",
];

function trimTitle(t: string | null | undefined, max = 60): string | null {
  if (!t) return null;
  const s = t.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function isSeismicHighConcern(riskClass: string | null | undefined): boolean {
  if (!riskClass) return false;
  const u = riskClass.toUpperCase().replace(/\s/g, "");
  if (u === "RSIV" || u === "RS4") return false;
  if (u.includes("NONE") || u === "") return false;
  return (
    u.includes("RS1") ||
    u.includes("RS2") ||
    u.includes("RS3") ||
    u.includes("RSI") ||
    u.includes("RSII") ||
    u.includes("RSIII")
  );
}

function strategyBlock(
  kind: NegotiationStrategyKind,
  allowNumericHint: boolean,
): NegotiationStrategyBlock {
  const legal =
    " Acesta este un ajutor practic, nu consultanță juridică — la semnare, validează actele cu un specialist.";

  switch (kind) {
    case "low_confidence":
      return {
        kind,
        titleRo: "Strategie: întrebări înainte de ofertă",
        bodyRo:
          "Comparabilele sau reperul de preț sunt limitate. Cere acte, starea reală și răspunsuri scrise " +
          "înainte de a propune o sumă fermă. Nu te ancora doar de cifrele din raport; tratează-le ca simulare." +
          legal,
      };
    case "risk_focus":
      return {
        kind,
        titleRo: "Strategie: verificare tehnică și acte",
        bodyRo:
          "Semnalele de risc (seismic, vechime, structură) cer lămuriri și, unde e cazul, expertiză. " +
          "Negociază doar după documente, nu după replici din anunț. " +
          (allowNumericHint
            ? "Chiar și cu reper de piață, oferta numerică ține-o condiționată de concluzia verificărilor."
            : "Evită să fixezi o sumă țintă până nu ai baza de date completă pe comparabile și pe clădire.") +
          legal,
      };
    case "overpriced":
      return {
        kind,
        titleRo: "Strategie: discuție pornită de la piață",
        bodyRo: allowNumericHint
          ? "Raportul plasează prețul cerut peste reperul de piață. Poți motiva o deschidere sub interval folosind anunțuri comparabile, fără a te grăbi spre o ofertă fermă înainte de vizionare. " +
            "Nu oferi o țintă exactă fără să asumi riscurile de informație rămase."
          : "Poziția de preț pare tensionată, dar baza e subțire: cere justificare pentru preț și documente, " +
            "fără a propune o sumă concretă până nu ai rețea solidă de comparabile." + legal,
      };
    case "fair":
    default:
      return {
        kind: "fair",
        titleRo: "Strategie: documente, apoi ajustări mici",
        bodyRo:
          "Dacă prețul e plauzibil față de reper, pune pe prim-plan acte, starea reală și eventualele costuri. " +
          "Ajustările mici văd după constatări, nu doar din email." +
          legal,
      };
  }
}

function buildLeverageBulletsRo(input: {
  overpricingPct: number | null;
  canShowStrongPricePosition: boolean;
  hasYearBuilt: boolean;
  seismicHigh: boolean;
  isRender: boolean;
  isUnderConstruction: boolean;
}): string[] {
  const out: string[] = [];

  if (input.canShowStrongPricePosition && input.overpricingPct != null && input.overpricingPct > 5) {
    out.push(
      "Prețul pe m² pare peste comparabilele disponibile. Folosește asta ca argument la discuție, nu ca promisiune de ofertă.",
    );
  } else if (!input.canShowStrongPricePosition) {
    out.push(
      "Comparabilele sunt limitate: pune pe prim-plan întrebări despre starea reală și acte, nu doar cifrele din anunț.",
    );
  }

  if (!input.hasYearBuilt) {
    out.push("Anul construcției lipsește din anunț; cere clarificare înainte de vizionare.");
  }

  if (input.seismicHigh) {
    out.push(
      "Dacă apartamentul are risc seismic sau e într-o clădire veche, cere documente și, unde e cazul, verificare tehnică.",
    );
  }

  if (input.isRender) {
    out.push("Dacă anunțul folosește randări 3D, cere fotografii reale și stadiul lucrării.");
  }

  if (input.isUnderConstruction) {
    out.push(
      "Dacă proiectul e în execuție, cere termenul de predare, clauze pentru întârzieri și stadiul real, nu doar planșe.",
    );
  }

  return out.slice(0, 6);
}

/**
 * Un singur paragraf, stil mesaj scurt (WhatsApp / e-mail) — fără LLM.
 * La semnale puternice (3D, șantier, seismic), se adaugă o propoziție scurtă.
 */
function buildSuggestedMessageRo(input: {
  title: string | null;
  hasYearBuilt: boolean;
  seismicHigh: boolean;
  isRender: boolean;
  isUnderConstruction: boolean;
}): string {
  const t = trimTitle(input.title);
  const first = t
    ? `Bună ziua, am văzut anunțul «${t}».`
    : "Bună ziua, am văzut anunțul pentru apartament.";
  let msg =
    first +
    " Înainte să programăm o vizionare, îmi puteți confirma anul construcției, situația actelor și dacă prețul este negociabil?";

  if (!input.hasYearBuilt) {
    msg += " (Anul construcției nu apare clar în anunț — aș dori o confirmare scrisă.)";
  }

  if (input.isRender) {
    msg += " Dacă imaginile din anunț sunt randări 3D, aș dori și fotografii reale, plus stadiul lucrărilor acolo unde e șantier.";
  } else if (input.isUnderConstruction) {
    msg += " Aș dori o confirmare a stadiului șantierului și a termenului de predare.";
  }

  if (input.seismicHigh) {
    msg +=
      " Aș dori totodată lămuriri asupra riscului seismic al clădirii (clasă) și, dacă e cazul, a documentației disponibile.";
  }

  return msg;
}

function pickStrategy(
  hasSub: boolean,
  conf: string | null | undefined,
  compsCount: number,
  overpricingPct: number | null,
  canStrong: boolean,
  seismicHigh: boolean,
): NegotiationStrategyKind {
  if (!hasSub || conf === "low" || compsCount < 2) {
    return "low_confidence";
  }
  if (seismicHigh) {
    return "risk_focus";
  }
  if (overpricingPct != null && overpricingPct > 7 && canStrong) {
    return "overpriced";
  }
  if (overpricingPct != null && overpricingPct > 7) {
    return "low_confidence";
  }
  return "fair";
}

function mergePracticalQuestions(points: NegotiationPoint[]): string[] {
  const seen = new Set<string>();
  for (const c of CORE_QUESTIONS_RO) seen.add(c.toLowerCase().slice(0, 64));

  const merged: string[] = [...CORE_QUESTIONS_RO];
  for (const p of points) {
    if (!p.suggestedSellerQuestion) continue;
    const s = p.suggestedSellerQuestion.trim();
    if (!s || merged.length >= 14) break;
    const k = s.toLowerCase().slice(0, 64);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(s);
  }
  return merged;
}

/**
 * Build the full bundle for the report UI. Call after `generateNegotiationPoints`.
 */
export function buildNegotiationAssistant(input: {
  title: string | null;
  overpricingPct: number | null;
  confidenceLevel: string | null | undefined;
  compsCount: number;
  canShowStrongPricePosition: boolean;
  canShowSubstantiveNegotiation: boolean;
  hasYearBuilt: boolean;
  seismicRiskClass: string | null;
  isRender: boolean;
  isUnderConstruction: boolean;
  points: NegotiationPoint[];
}): NegotiationAssistantBundle {
  const seismicHigh = isSeismicHighConcern(input.seismicRiskClass);
  const hasSub = input.canShowSubstantiveNegotiation;

  const allowNumericOfferHint =
    hasSub && input.confidenceLevel === "high" && input.canShowStrongPricePosition && input.compsCount >= 3;

  const kind = pickStrategy(
    hasSub,
    input.confidenceLevel,
    input.compsCount,
    input.overpricingPct,
    input.canShowStrongPricePosition,
    seismicHigh,
  );

  const strategy = strategyBlock(kind, allowNumericOfferHint);

  let leverage = buildLeverageBulletsRo({
    overpricingPct: input.overpricingPct,
    canShowStrongPricePosition: input.canShowStrongPricePosition,
    hasYearBuilt: input.hasYearBuilt,
    seismicHigh,
    isRender: input.isRender,
    isUnderConstruction: input.isUnderConstruction,
  });

  for (const p of input.points) {
    if (leverage.length >= 6) break;
    const c = p.claim?.trim();
    if (!c) continue;
    const short = c.length > 200 ? `${c.slice(0, 197)}…` : c;
    if (!leverage.some((l) => l.slice(0, 40) === short.slice(0, 40))) {
      leverage.push(short);
    }
  }

  const practicalQuestionsRo = mergePracticalQuestions(input.points);

  const suggestedMessageRo = buildSuggestedMessageRo({
    title: input.title,
    hasYearBuilt: input.hasYearBuilt,
    seismicHigh,
    isRender: input.isRender,
    isUnderConstruction: input.isUnderConstruction,
  });

  return {
    strategy,
    leverageBulletsRo: leverage,
    practicalQuestionsRo,
    suggestedMessageRo,
    allowNumericOfferHint,
  };
}
