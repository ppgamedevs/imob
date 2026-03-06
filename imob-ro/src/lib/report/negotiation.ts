/**
 * Deterministic negotiation point generator.
 *
 * Produces structured, evidence-backed negotiation arguments from
 * pricing, integrity, seismic, vibe and transport data.  No LLM needed.
 */

// ---- Types ----

export interface NegotiationPoint {
  id: string;
  title: string;
  claim: string;
  evidence: string;
  suggestedSellerQuestion: string;
}

export interface NegotiationInput {
  // Pricing
  askingPrice: number | null;
  fairMin: number | null;
  fairMax: number | null;
  fairMid: number | null;
  medianEurM2: number | null;
  compsUsed: number;
  currency: string;

  // Listing
  areaM2: number | null;
  rooms: number | null;
  yearBuilt: number | null;
  floor: number | null;
  hasParking: boolean | null;
  hasElevator: boolean | null;
  condition: string | null; // "nou" | "renovat" | "locuibil" | "necesita_renovare" | "de_renovat"

  // Integrity / History
  priceDrops: number;
  maxDropAmount: number;
  totalSnapshots: number;
  duplicateCount: number;
  wasRemoved: boolean;

  // Seismic
  seismicRiskClass: string | null;
  seismicNearbyCount: number;
  seismicNearbyClosestM: number | null;

  // Vibe
  nightlifeScore: number | null;
  zoneTypeKey: string | null;

  // Transport
  transitScore: number | null;
  nearestMetroName: string | null;
  nearestMetroMinutes: number | null;
}

// ---- Generator ----

export function generateNegotiationPoints(
  input: NegotiationInput,
): NegotiationPoint[] {
  const pts: NegotiationPoint[] = [];
  const cur = input.currency || "EUR";
  const fmt = (n: number) => n.toLocaleString("ro-RO");

  // 1 - Overpricing vs fair range
  if (
    input.askingPrice != null &&
    input.fairMax != null &&
    input.fairMid != null &&
    input.fairMax > 0
  ) {
    const overPct = Math.round(
      ((input.askingPrice - input.fairMax) / input.fairMax) * 100,
    );
    if (overPct > 7) {
      const diff = input.askingPrice - input.fairMid;
      pts.push({
        id: "overpriced",
        title: "Pret peste intervalul corect",
        claim: `Pretul cerut depaseste cu ${overPct}% limita superioara a intervalului de piata bazat pe ${input.compsUsed} comparabile din zona.`,
        evidence: `Interval corect: ${fmt(input.fairMin!)}–${fmt(input.fairMax)} ${cur}. Pret cerut: ${fmt(input.askingPrice)} ${cur}. Diferenta: ${fmt(diff)} ${cur}.`,
        suggestedSellerQuestion:
          "Am analizat preturile din zona pe baza a " +
          input.compsUsed +
          " proprietati similare. Media este " +
          fmt(input.fairMid) +
          " " +
          cur +
          ". Ce justifica diferenta de " +
          fmt(diff) +
          " " +
          cur +
          "?",
      });
    } else if (overPct > 0) {
      pts.push({
        id: "slightly_over",
        title: "Pret usor peste piata",
        claim: `Pretul cerut este la limita superioara a intervalului - exista spatiu de negociere de ${fmt(input.askingPrice - input.fairMid)} ${cur}.`,
        evidence: `Interval estimat: ${fmt(input.fairMin!)}–${fmt(input.fairMax)} ${cur}. Mediana: ${fmt(input.fairMid)} ${cur} (${input.compsUsed} comparabile).`,
        suggestedSellerQuestion:
          "Pretul este aproape de limita superioara a pietei. Ati fi deschis la o oferta de " +
          fmt(input.fairMid) +
          " " +
          cur +
          "?",
      });
    }
  }

  // 2 - Price drops signal seller flexibility
  if (input.priceDrops > 0) {
    pts.push({
      id: "price_drops",
      title: "Vanzator flexibil la pret",
      claim: `Pretul a fost scazut de ${input.priceDrops} ${input.priceDrops === 1 ? "data" : "ori"}, ceea ce indica disponibilitate de negociere.`,
      evidence: `${input.priceDrops} scaderi de pret inregistrate. Scadere maxima: ${fmt(input.maxDropAmount)} ${cur}. Total observatii: ${input.totalSnapshots}.`,
      suggestedSellerQuestion:
        "Am observat ca pretul a fost ajustat in trecut. Care este cel mai mic pret la care ati fi dispus sa vindeti?",
    });
  }

  // 3 - Duplicates / reposting
  if (input.duplicateCount > 0) {
    pts.push({
      id: "duplicates",
      title: "Anunt publicat pe mai multe platforme",
      claim: `Proprietatea apare pe ${input.duplicateCount + 1} platforme - proprietarul cauta activ un cumparator, ceea ce sugereaza ca vanzarea nu merge usor.`,
      evidence: `${input.duplicateCount} anunturi duplicate detectate pe alte surse.`,
      suggestedSellerQuestion:
        "Proprietatea este listata pe mai multe site-uri. De cand este pe piata si cate oferte ati primit?",
    });
  }

  // 4 - Removed and re-posted
  if (input.wasRemoved) {
    pts.push({
      id: "reposted",
      title: "Anunt repostat",
      claim:
        "Anuntul a fost sters si republicat - de obicei o strategie de a parea nou dupa ce nu a atras interes la pretul initial.",
      evidence:
        "Istoric: anuntul a trecut prin cel putin o pauza (sters/repostat) in ultimele 90 de zile.",
      suggestedSellerQuestion:
        "Am observat ca anuntul a fost republicat. A existat o oferta anterioara care nu s-a finalizat? Ce s-a intamplat?",
    });
  }

  // 5 - Seismic risk on building (only for confirmed RS1-RS3)
  const _seis = input.seismicRiskClass?.toLowerCase() ?? "";
  const isConfirmedSeismic =
    input.seismicRiskClass &&
    !["rsiv", "rs4", "unknown", "none", ""].includes(_seis);
  if (isConfirmedSeismic) {
    const classLabel = (input.seismicRiskClass ?? "").replace("Rs", "RS");
    pts.push({
      id: "seismic_direct",
      title: "Risc seismic pe cladire",
      claim: `Cladirea este clasificata ${classLabel} - un factor major de risc care afecteaza valoarea si asigurabilitatea.`,
      evidence: `Clasificare seismica: ${classLabel}. Sursa: lista AMCCRS.`,
      suggestedSellerQuestion:
        "Cladirea apare in lista AMCCRS cu clasificare " +
        classLabel +
        ". Exista expertiza tehnica recenta sau proiect de consolidare?",
    });
  }

  // 6 - Seismic risk nearby
  if (
    input.seismicNearbyCount > 0 &&
    input.seismicNearbyClosestM != null &&
    !pts.find((p) => p.id === "seismic_direct")
  ) {
    pts.push({
      id: "seismic_nearby",
      title: "Cladiri cu risc seismic in zona",
      claim: `In apropiere exista ${input.seismicNearbyCount} cladiri cu risc seismic - poate afecta percepția asupra sigurantei zonei.`,
      evidence: `${input.seismicNearbyCount} imobile AMCCRS in raza de 500m. Cel mai apropiat: ${input.seismicNearbyClosestM}m.`,
      suggestedSellerQuestion:
        "Stiti daca exista cladiri cu risc seismic in imediata vecinatate? Puteti confirma ca cladirea nu este afectata?",
    });
  }

  // 7 - Nightlife zone (for buyers wanting quiet)
  if (input.nightlifeScore != null && input.nightlifeScore >= 60) {
    pts.push({
      id: "nightlife_noise",
      title: "Zona cu viata de noapte activa",
      claim:
        "Zona are scor ridicat de viata de noapte - poate fi un dezavantaj daca cautati liniste, dar si un avantaj pentru investitii de inchiriere.",
      evidence: `Scor viata de noapte: ${input.nightlifeScore}/100. Sursa: analiza POI din zona.`,
      suggestedSellerQuestion:
        "Cum este nivelul de zgomot seara si in weekend? Exista reclamatii din partea vecinilor?",
    });
  }

  // 8 - Poor transit access
  if (input.transitScore != null && input.transitScore < 30) {
    pts.push({
      id: "low_transit",
      title: "Acces limitat la transport public",
      claim:
        "Zona are acces redus la transport public - afecteaza pretul si atractivitatea, mai ales fara masina.",
      evidence:
        `Scor transport: ${input.transitScore}/100.` +
        (input.nearestMetroName
          ? ` Cea mai apropiata statie de metrou: ${input.nearestMetroName} (${input.nearestMetroMinutes} min pe jos).`
          : " Nicio statie de metrou in raza de 2km."),
      suggestedSellerQuestion:
        "Care sunt optiunile de transport public din zona? Cum ajungeti in centru?",
    });
  }

  // 9 - Good transit (positive leverage for fair price)
  if (
    input.transitScore != null &&
    input.transitScore >= 70 &&
    input.askingPrice != null &&
    input.fairMid != null &&
    input.askingPrice <= input.fairMid
  ) {
    pts.push({
      id: "good_transit_fair",
      title: "Transport excelent la pret corect",
      claim:
        "Combinatia de acces bun la transport si pret in intervalul corect face proprietatea competitiva - actionati rapid.",
      evidence:
        `Scor transport: ${input.transitScore}/100.` +
        (input.nearestMetroName
          ? ` Metrou: ${input.nearestMetroName} la ${input.nearestMetroMinutes} min pe jos.`
          : ""),
      suggestedSellerQuestion:
        "Sunt mai multi cumparatori interesati? Acceptati o oferta ferma rapida?",
    });
  }

  // 10 - Old building
  if (input.yearBuilt && input.yearBuilt < 1980) {
    const age = new Date().getFullYear() - input.yearBuilt;
    pts.push({
      id: "old_building",
      title: "Cladire veche - costuri ascunse",
      claim: `Constructie din ${input.yearBuilt} (${age} ani) - instalatiile si structura pot necesita investitii suplimentare.`,
      evidence: `An constructie: ${input.yearBuilt}. Varsta: ${age} ani.`,
      suggestedSellerQuestion:
        "Cand au fost inlocuite ultima data instalatiile (electrica, sanitara, termica)? Exista expertiza de rezistenta?",
    });
  }

  // 11 - Renovation needed
  if (
    input.condition === "necesita_renovare" ||
    input.condition === "de_renovat"
  ) {
    const isFull = input.condition === "de_renovat";
    pts.push({
      id: "renovation",
      title: isFull ? "Necesita renovare completa" : "Necesita lucrari",
      claim: isFull
        ? "Proprietatea necesita renovare completa - costul renovarii trebuie dedus din pretul oferit."
        : "Sunt necesare lucrari de imbunatatire - un argument valid pentru reducerea pretului.",
      evidence: `Stare proprietate: ${isFull ? "de renovat" : "necesita renovare"}. Sursa: analiza text anunt.`,
      suggestedSellerQuestion: isFull
        ? "Avand in vedere ca apartamentul necesita renovare completa, pretul include vreo estimare a costurilor de reamenajare?"
        : "Ce lucrari concrete sunt necesare si care ar fi costul estimat?",
    });
  }

  // 12 - Ground floor / basement
  if (input.floor != null && input.floor <= 0) {
    pts.push({
      id: "ground_floor",
      title: input.floor < 0 ? "Demisol" : "Parter",
      claim:
        "Apartamentele la parter/demisol se vand de obicei cu 5–10% sub media etajelor superioare.",
      evidence: `Etaj: ${input.floor < 0 ? "demisol" : "parter"}. Diferenta tipica: -5% pana la -10% fata de etajele 1-4.`,
      suggestedSellerQuestion:
        "Exista probleme de umiditate sau zgomot de la strada? Cum este lumina naturala pe parcursul zilei?",
    });
  }

  // 13 - No parking
  if (input.hasParking === false) {
    pts.push({
      id: "no_parking",
      title: "Fara loc de parcare",
      claim:
        "Lipsa parcarii reduce valoarea cu 2.000–5.000 EUR in zonele cu trafic intens din Bucuresti.",
      evidence: "Nu este mentionat loc de parcare in anunt.",
      suggestedSellerQuestion:
        "Exista posibilitatea de a inchiria un loc de parcare in zona? Cat costa?",
    });
  }

  // 14 - High floor without elevator
  if (
    input.floor != null &&
    input.floor >= 5 &&
    input.hasElevator === false
  ) {
    pts.push({
      id: "no_elevator",
      title: "Etaj inalt fara lift",
      claim: `Etajul ${input.floor} fara lift reduce considerabil cererea si pretul - un argument clar de negociere.`,
      evidence: `Etaj: ${input.floor}. Lift: absent.`,
      suggestedSellerQuestion:
        "Exista planuri pentru instalarea unui lift in bloc? Cat costa intretinerea lunara?",
    });
  }

  // 15 - Zone with limited amenities
  if (input.zoneTypeKey === "limited") {
    pts.push({
      id: "limited_zone",
      title: "Zona cu putine facilitati",
      claim:
        "Zona are acces limitat la magazine, scoli, parcuri - un factor care reduce atractivitatea pe termen lung.",
      evidence: `Tip zona: facilitati limitate. Sursa: analiza puncte de interes din proximitate.`,
      suggestedSellerQuestion:
        "Care sunt cele mai aproape magazine si scoli? Cum faceti cumparaturile zilnice?",
    });
  }

  return pts.slice(0, 8);
}

/**
 * Builds a compact WhatsApp-friendly message from negotiation points.
 */
export function buildWhatsAppDraft(
  points: NegotiationPoint[],
  title: string | null,
  askingPrice: number | null,
  fairMid: number | null,
  currency: string,
): string {
  const fmt = (n: number) => n.toLocaleString("ro-RO");
  const lines: string[] = [];

  lines.push("Buna ziua,");
  lines.push("");

  if (title) {
    lines.push(`Sunt interesat de proprietatea: ${title}`);
    lines.push("");
  }

  // Key negotiation claims (concise, not just questions)
  const topPoints = points.slice(0, 3);
  if (topPoints.length > 0) {
    lines.push("Am analizat proprietatea si am cateva observatii:");
    for (let i = 0; i < topPoints.length; i++) {
      lines.push(`${i + 1}. ${topPoints[i].claim}`);
    }
    lines.push("");
  }

  // Key questions for the seller
  const questions = points
    .slice(0, 3)
    .map((p) => p.suggestedSellerQuestion)
    .filter(Boolean);
  if (questions.length > 0) {
    lines.push("As dori sa clarificam:");
    for (let i = 0; i < questions.length; i++) {
      lines.push(`- ${questions[i]}`);
    }
    lines.push("");
  }

  if (askingPrice != null && fairMid != null && askingPrice > fairMid) {
    const diff = Math.round(((askingPrice - fairMid) / fairMid) * 100);
    lines.push(
      `Conform analizei de piata, valoarea estimata este in jurul a ${fmt(fairMid)} ${currency}${diff > 5 ? ` (cu ~${diff}% sub pretul cerut)` : ""}. Sunt deschis la o discutie.`,
    );
    lines.push("");
  }

  lines.push("Multumesc si astept un raspuns.");

  return lines.join("\n");
}
