/**
 * Buyer-facing seismic states — no “proxy / în curs / necunoscut” chips.
 */

export type BuyerSeismicState = "official_list" | "not_on_public_list" | "insufficient";

export interface BuyerSeismicView {
  state: BuyerSeismicState;
  /** One human line under the headline */
  meaningLine: string;
  /** “Ce înseamnă pentru tine” */
  forYouLine: string;
  /** Optional next step */
  nextStep?: string;
  /** True when listing text mentions seismic but we didn’t official-match */
  titleMentionConflict?: boolean;
}

const OFFICIAL_METHODS = new Set(["db-address-exact", "db-geo", "db-address-fuzzy"]);

function formatOfficialClass(rc: string): string {
  const u = rc.toUpperCase();
  if (u === "RSI" || u === "RS1") return "Rs I";
  if (u === "RSII" || u === "RS2") return "Rs II";
  if (u === "RSIII" || u === "RS3") return "Rs III";
  if (u === "RSIV" || u === "RS4") return "Rs IV";
  return rc;
}

/**
 * Map pipeline `seismic` explain JSON → 3-state buyer UI.
 */
export function mapSeismicExplainToBuyerView(
  explain: Record<string, unknown> | null | undefined,
  titleMentionsRisk: boolean,
): BuyerSeismicView {
  if (!explain || typeof explain !== "object") {
    return {
      state: "insufficient",
      meaningLine: "Nu am putut încărca verificarea seismică pentru acest raport.",
      forYouLine: "Verifică anul clădirii, documentele și eventualele expertize tehnice.",
      nextStep: "Pas următor: cere documentația tehnică și istoricul clădirii.",
    };
  }

  const method = String(explain.method ?? "");
  const riskClassRaw = explain.riskClass != null ? String(explain.riskClass) : "";
  const rcu = riskClassRaw.toUpperCase();

  const isOfficial = OFFICIAL_METHODS.has(method);

  if (
    isOfficial &&
    riskClassRaw &&
    rcu !== "NONE" &&
    rcu !== "UNKNOWN" &&
    !rcu.includes("UNKNOWN")
  ) {
    return {
      state: "official_list",
      meaningLine: `Imobilul apare în lista publică AMCCRS cu clasă ${formatOfficialClass(riskClassRaw)}.`,
      forYouLine:
        "Este un semnal din lista publică de risc structural, nu un aviz de construcție. Are sens să ceri expertiză tehnică înainte de cumpărare.",
      nextStep: "Pas următor: consultă expert tehnic atestat și documentele din dosarul clădirii.",
      titleMentionConflict: false,
    };
  }

  if (method === "heuristic" && (rcu === "NONE" || rcu === "UNKNOWN")) {
    return {
      state: "not_on_public_list",
      meaningLine: "Nu apare în evidența publică AMCCRS pentru adresa verificată automat.",
      forYouLine: "Absența din lista publică nu este o confirmare de siguranță.",
      nextStep: "Pas următor: verifică documentele tehnice și anul clădirii.",
      titleMentionConflict: titleMentionsRisk,
    };
  }

  if (method === "heuristic" && rcu !== "NONE" && rcu !== "UNKNOWN") {
    return {
      state: "insufficient",
      meaningLine:
        "Nu am putut potrivi adresa în lista publică AMCCRS; am folosit doar anul construcției ca reper orientativ.",
      forYouLine:
        "Acest reper nu înlocuiește verificarea în listă / la dosar și poate diferi de clasificarea finală.",
      nextStep: "Pas următor: verifică în registrul public și cu un expert dacă imobilul apare la adresă.",
      titleMentionConflict: titleMentionsRisk,
    };
  }

  return {
    state: "insufficient",
    meaningLine: "Date insuficiente pentru verificare automată în lista publică.",
    forYouLine: "Fără potrivire clară, nu putem afirma nici siguranță, nici pericol.",
    nextStep: "Pas următor: verifică anul clădirii, documentele și eventualele expertize.",
    titleMentionConflict: titleMentionsRisk,
  };
}
