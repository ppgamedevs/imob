/**
 * Plausibility gate for notarial (fiscal grid) reference values.
 * Grid = EUR/m² minima; total = eurM2 × suprafață. Not market price.
 */

/** Only `neighborhood` may show numeric EUR/m² and total; all other methods are suppressed. */
export type NotarialMatchMethod =
  | "neighborhood"
  | "sector_avg"
  | "sector"
  | "city"
  | "city_fallback"
  | "fallback"
  | "none";

export type NotarialGateConfidence = "high" | "medium" | "low";

/** Shown when numeric notarial values are hidden (weak match or failed plausibility). */
export const NOTARIAL_NEUTRAL_COPY_RO =
  "Nu avem o potrivire suficient de precisă cu referința fiscală notarială pentru acest anunț.";

/**
 * Public price anchor title: replaces phrasing like „Valoare notarială”, „Preț notarial”,
 * „Grilă notarială” when that block positions price vs AVM/asking.
 */
export const NOTARIAL_PUBLIC_PRICE_ANCHOR_LABEL_RO = "Referință fiscală notarială";

/**
 * Explanatory subcopy for public report, PDF, methodology (not onorariu, not piață).
 */
export const NOTARIAL_PUBLIC_PRICE_ANCHOR_SUBCOPY_RO =
  "Reper fiscal folosit în contexte notariale. Nu este preț de piață și nu estimează onorariul notarului.";

/** @deprecated Use NOTARIAL_PUBLIC_PRICE_ANCHOR_SUBCOPY_RO (identical). */
export const NOTARIAL_FISCAL_CONTEXT_NOTE_RO = NOTARIAL_PUBLIC_PRICE_ANCHOR_SUBCOPY_RO;

const STRONG_MATCH: NotarialMatchMethod = "neighborhood";

export function isAllowedNotarialMatchMethodForDisplay(
  m: string | null | undefined,
): m is "neighborhood" {
  return m === STRONG_MATCH;
}

export type NotarialReferenceDiagnostics = {
  matched: boolean;
  source: "NotarialGrid";
  gridYear: number | null;
  gridZone: string | null;
  gridSubzone: string | null;
  propertyType: string;
  rawValue: number | null;
  rawCurrency: "EUR" | "unknown";
  rawUnit: "eur_m2" | "unknown";
  interpretedEurM2: number | null;
  areaM2Used: number | null;
  computedTotalEur: number | null;
  matchMethod: string;
  matchConfidence: NotarialGateConfidence;
  suppressReason: string | null;
  canShow: boolean;
  displayTotalEur: number | null;
  displayEurM2: number | null;
  confidence: NotarialGateConfidence;
};

export type ValidateNotarialReferenceInput = {
  propertyKind: "apartment" | "other";
  /** București / Ilfov — minimum €/m² plausibility */
  isBucharestIlfov: boolean;
  areaM2Used: number | null;
  interpretedEurM2: number;
  rawCurrency: "EUR" | "unknown";
  rawUnit: "eur_m2" | "unknown";
  computedTotalEur: number;
  matchMethod: string;
  gridYear: number;
  gridZone: string | null;
  gridSubzone: string | null;
  currentYear: number;
  askingPriceEur: number | null;
  avmMidEur: number | null;
};

export type ValidateNotarialReferenceResult = {
  canShow: boolean;
  suppressReason?: string;
  displayTotalEur?: number;
  displayEurM2?: number;
  confidence: NotarialGateConfidence;
  diagnostics: NotarialReferenceDiagnostics;
};

const ASKING_RATIO_MIN = 0.45;
const AVM_RATIO_MIN = 0.45;
const ASKING_RATIO_MAX = 1.5;
const AREA_MIN = 10;
const AREA_MAX = 250;
const BUCHAREST_LOW_EUR_M2 = 400;

function baseDiagnostics(
  partial: Partial<NotarialReferenceDiagnostics> & {
    matchMethod: string;
    suppressReason: string | null;
    canShow: boolean;
    confidence: NotarialGateConfidence;
  },
): NotarialReferenceDiagnostics {
  return {
    matched: partial.matched ?? false,
    source: "NotarialGrid",
    gridYear: partial.gridYear ?? null,
    gridZone: partial.gridZone ?? null,
    gridSubzone: partial.gridSubzone ?? null,
    propertyType: partial.propertyType ?? "apartment",
    rawValue: partial.rawValue ?? null,
    rawCurrency: partial.rawCurrency ?? "unknown",
    rawUnit: partial.rawUnit ?? "unknown",
    interpretedEurM2: partial.interpretedEurM2 ?? null,
    areaM2Used: partial.areaM2Used ?? null,
    computedTotalEur: partial.computedTotalEur ?? null,
    matchMethod: partial.matchMethod,
    matchConfidence: partial.matchConfidence ?? "low",
    suppressReason: partial.suppressReason,
    canShow: partial.canShow,
    displayTotalEur: partial.displayTotalEur ?? null,
    displayEurM2: partial.displayEurM2 ?? null,
    confidence: partial.confidence,
  };
}

/**
 * Enforces fiscal-reference sanity: no sector-median display, plausibility vs asking/AVM, area, currency, grid age.
 */
export function validateNotarialReference(
  input: ValidateNotarialReferenceInput,
): ValidateNotarialReferenceResult {
  const {
    propertyKind,
    isBucharestIlfov,
    areaM2Used,
    interpretedEurM2,
    rawCurrency,
    rawUnit,
    computedTotalEur,
    matchMethod,
    gridYear,
    gridZone,
    gridSubzone,
    currentYear,
    askingPriceEur,
    avmMidEur,
  } = input;

  const fail = (
    reason: string,
    conf: NotarialGateConfidence = "low",
  ): ValidateNotarialReferenceResult => ({
    canShow: false,
    suppressReason: reason,
    confidence: conf,
    diagnostics: baseDiagnostics({
      matched: true,
      gridYear,
      gridZone,
      gridSubzone,
      propertyType: propertyKind === "apartment" ? "apartment" : "other",
      rawValue: interpretedEurM2,
      rawCurrency,
      rawUnit,
      interpretedEurM2,
      areaM2Used,
      computedTotalEur,
      matchMethod,
      matchConfidence: conf,
      suppressReason: reason,
      canShow: false,
      confidence: conf,
    }),
  });

  if (propertyKind !== "apartment") {
    return {
      canShow: false,
      suppressReason: "not_apartment_type",
      confidence: "low",
      diagnostics: baseDiagnostics({
        matched: false,
        matchMethod: "none",
        gridYear: null,
        gridZone: null,
        gridSubzone: null,
        propertyType: propertyKind,
        rawValue: null,
        rawCurrency: "unknown",
        rawUnit: "unknown",
        interpretedEurM2: null,
        areaM2Used,
        computedTotalEur: null,
        matchConfidence: "low",
        suppressReason: "not_apartment_type",
        canShow: false,
        confidence: "low",
      }),
    };
  }

  if (areaM2Used == null || !Number.isFinite(areaM2Used)) {
    return {
      canShow: false,
      suppressReason: "missing_area",
      confidence: "low",
      diagnostics: baseDiagnostics({
        matched: true,
        gridYear,
        gridZone,
        gridSubzone,
        propertyType: "apartment",
        rawValue: interpretedEurM2,
        rawCurrency,
        rawUnit,
        interpretedEurM2,
        areaM2Used: null,
        computedTotalEur,
        matchMethod,
        matchConfidence: "low",
        suppressReason: "missing_area",
        canShow: false,
        confidence: "low",
      }),
    };
  }

  if (areaM2Used < AREA_MIN || areaM2Used > AREA_MAX) {
    return fail("area_out_of_range");
  }

  if (rawUnit !== "eur_m2" || rawCurrency !== "EUR") {
    return fail("unknown_currency_or_unit");
  }

  if (!Number.isFinite(interpretedEurM2) || interpretedEurM2 <= 0) {
    return fail("invalid_eur_per_m2");
  }

  if (matchMethod === "none") {
    return fail("no_match", "low");
  }

  if (!isAllowedNotarialMatchMethodForDisplay(matchMethod)) {
    if (matchMethod === "sector_avg") {
      return fail("sector_fallback_unreliable", "low");
    }
    return fail("weak_notarial_match", "low");
  }

  if (isBucharestIlfov && interpretedEurM2 < BUCHAREST_LOW_EUR_M2) {
    return fail("bucharest_min_eur_m2", "low");
  }

  if (gridYear < currentYear - 1 || gridYear > currentYear) {
    return fail("stale_grid_year", "low");
  }

  if (askingPriceEur != null && askingPriceEur > 0) {
    if (computedTotalEur < askingPriceEur * ASKING_RATIO_MIN) {
      return fail("notarial_too_low_vs_asking", "low");
    }
    if (computedTotalEur > askingPriceEur * ASKING_RATIO_MAX) {
      return fail("notarial_too_high_vs_asking", "low");
    }
  }

  if (avmMidEur != null && avmMidEur > 0) {
    if (computedTotalEur < avmMidEur * AVM_RATIO_MIN) {
      return fail("notarial_too_low_vs_avm", "low");
    }
  }

  const matchConfidence: NotarialGateConfidence = gridYear === currentYear ? "high" : "medium";
  return {
    canShow: true,
    displayTotalEur: Math.round(computedTotalEur),
    displayEurM2: Math.round(interpretedEurM2 * 10) / 10,
    confidence: matchConfidence,
    diagnostics: baseDiagnostics({
      matched: true,
      gridYear,
      gridZone,
      gridSubzone,
      propertyType: "apartment",
      rawValue: interpretedEurM2,
      rawCurrency: "EUR",
      rawUnit: "eur_m2",
      interpretedEurM2,
      areaM2Used,
      computedTotalEur,
      matchMethod,
      matchConfidence,
      suppressReason: null,
      canShow: true,
      displayTotalEur: Math.round(computedTotalEur),
      displayEurM2: Math.round(interpretedEurM2 * 10) / 10,
      confidence: matchConfidence,
    }),
  };
}

/** Exported for admin QA (e.g. report quality table). */
export function isBucharestIlfovFromFeatures(features: Record<string, unknown>): boolean {
  const city = (features.city as string | undefined)?.toLowerCase() ?? "";
  const slug = (features.areaSlug as string | undefined)?.toLowerCase() ?? "";
  const addr = (features.addressRaw as string | undefined) ?? "";
  const t = `${city} ${slug} ${addr}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (t.includes("bucuresti") || t.includes("bucharest")) return true;
  if (
    t.includes("ilfov") ||
    t.includes("voluntari") ||
    t.includes("chitila") ||
    t.includes("otopeni")
  ) {
    return true;
  }
  if (/(^|\s)sector(\s+|-)?[1-6](\b|\s|\.)/.test(t)) return true;
  return false;
}

/**
 * Resolves notarial line for report UI / PDF: never surfaces suppressed legacy numbers.
 */
export function resolveNotarialDisplayForReport(opts: {
  scoreSnapshot: {
    notarialTotal: number | null;
    notarialEurM2: number | null;
    notarialZone: string | null;
    notarialYear: number | null;
    explain: unknown;
  } | null;
  askingPriceEur: number | null;
  avmMidEur: number | null;
  features: Record<string, unknown>;
}): {
  canShow: boolean;
  notarialTotal: number | null;
  notarialEurM2: number | null;
  notarialZone: string | null;
  notarialYear: number | null;
  confidence: NotarialGateConfidence | null;
  showNeutralNote: boolean;
  notarialImplausible: boolean;
  notarialMatchLowConfidence: boolean;
  /** Same as `explain.notarial.suppressReason` when validation ran. */
  suppressReason: string | null;
} {
  const { scoreSnapshot, askingPriceEur, avmMidEur, features } = opts;
  const ex = (scoreSnapshot?.explain as Record<string, unknown> | null)?.notarial as
    | Record<string, unknown>
    | undefined;

  if (!scoreSnapshot && !ex) {
    return {
      canShow: false,
      notarialTotal: null,
      notarialEurM2: null,
      notarialZone: null,
      notarialYear: null,
      confidence: null,
      showNeutralNote: false,
      notarialImplausible: false,
      notarialMatchLowConfidence: false,
      suppressReason: null,
    };
  }

  const area =
    typeof features.areaM2 === "number"
      ? features.areaM2
      : typeof features.area_m2 === "number"
        ? features.area_m2
        : null;
  const eurM2 =
    typeof ex?.interpretedEurM2 === "number"
      ? (ex.interpretedEurM2 as number)
      : (scoreSnapshot?.notarialEurM2 ??
        (typeof ex?.eurPerM2 === "number" ? (ex.eurPerM2 as number) : null));
  const total =
    typeof ex?.computedTotalEur === "number"
      ? (ex.computedTotalEur as number)
      : (scoreSnapshot?.notarialTotal ??
        (typeof ex?.totalValue === "number" ? (ex.totalValue as number) : null));
  const gridYear =
    typeof ex?.gridYear === "number"
      ? (ex.gridYear as number)
      : (scoreSnapshot?.notarialYear ?? new Date().getFullYear());
  const zone: string | null =
    (typeof ex?.gridZone === "string" ? (ex.gridZone as string) : null) ??
    scoreSnapshot?.notarialZone ??
    null;
  const method = String(ex?.matchMethod ?? "none");
  const matched = ex?.matched === true;

  if (eurM2 == null || total == null) {
    return {
      canShow: false,
      notarialTotal: null,
      notarialEurM2: null,
      notarialZone: null,
      notarialYear: null,
      confidence: null,
      showNeutralNote: matched,
      notarialImplausible: false,
      notarialMatchLowConfidence: false,
      suppressReason:
        typeof ex?.suppressReason === "string"
          ? (ex.suppressReason as string)
          : matched
            ? "missing_computed_notarial"
            : "no_notarial_data",
    };
  }

  const prop = (features as { propertyType?: string }).propertyType;
  const propertyKind: "apartment" | "other" =
    prop === "apartment" || !prop || prop === "unknown" ? "apartment" : "other";

  const v = validateNotarialReference({
    propertyKind,
    isBucharestIlfov: isBucharestIlfovFromFeatures(features),
    areaM2Used: area,
    interpretedEurM2: eurM2,
    rawCurrency: "EUR",
    rawUnit: "eur_m2",
    computedTotalEur: total,
    matchMethod: method,
    gridYear,
    gridZone: zone,
    gridSubzone: (typeof ex?.gridSubzone === "string" ? (ex.gridSubzone as string) : null) ?? zone,
    currentYear: new Date().getFullYear(),
    askingPriceEur,
    avmMidEur,
  });

  const implausible = !v.canShow && (v.suppressReason?.includes("too_") ?? false);
  return {
    canShow: v.canShow,
    notarialTotal: v.displayTotalEur ?? null,
    notarialEurM2: v.displayEurM2 ?? null,
    notarialZone: v.canShow ? zone : null,
    notarialYear: v.canShow ? gridYear : null,
    confidence: v.canShow ? v.confidence : null,
    showNeutralNote: !v.canShow,
    notarialImplausible: implausible,
    notarialMatchLowConfidence:
      v.diagnostics?.matchConfidence === "low" || (v.confidence === "low" && v.canShow),
    suppressReason: v.suppressReason ?? v.diagnostics?.suppressReason ?? null,
  };
}

export function notarialQaFlagsFromExplain(explain: unknown): {
  notarialSuppressed: boolean;
  notarialImplausible: boolean;
  notarialMatchLowConfidence: boolean;
} {
  const n = (explain as Record<string, unknown> | null)?.notarial as
    | Record<string, unknown>
    | undefined;
  if (!n) {
    return {
      notarialSuppressed: false,
      notarialImplausible: false,
      notarialMatchLowConfidence: false,
    };
  }
  const suppressReason = String(n.suppressReason ?? "");
  return {
    notarialSuppressed: n.canShow === false && n.matched === true,
    notarialImplausible:
      /too_low|too_high|area_out|bucharest_min|bucharest_low|stale_grid|implausible|weak_notarial|sector_fallback/i.test(
        suppressReason,
      ),
    notarialMatchLowConfidence: n.confidence === "low" || n.matchConfidence === "low",
  };
}
