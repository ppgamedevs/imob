/**
 * Heuristic "sellability" for showing the paid 49 RON (or config) full-report unlock.
 * Does not change technical report quality; gates commercial CTAs in preview only.
 */

export type SellabilityTier = "strong" | "okay" | "weak" | "do_not_sell";

export type ReportSellabilityInput = {
  /** Extracted/usable listing price (EUR or converted as used on report). */
  hasListingPrice: boolean;
  /** areaM2 present and &gt; 0 in listing/features. */
  hasListingArea: boolean;
  compCount: number;
  /**
   * True if we have a usable area/AVM anchor (e.g. bestRange mid or scoreSnapshot avmMid)
   * matching report page `hasAreaPriceBaselineForGate`.
   */
  hasAreaPriceBaseline: boolean;
  /** Pipeline / aggregate confidence, or null when unknown. */
  confidenceLevel: string | null | undefined;
};

export type ReportSellabilityResult = {
  sellability: SellabilityTier;
  /** Short Romanian explanations (for support / debugging / optional UI). */
  reasonsRo: string[];
  canShowPaywall: boolean;
  /** If true, do not push 49 RON; free preview is the only offer. */
  shouldOfferFreeOnly: boolean;
  /** If true, show refund- / expectation-friendly copy for paid (okay tier). */
  shouldShowRefundFriendlyCopy: boolean;
  /**
   * When `!canShowPaywall`, use this in preview instead of the paid CTA block.
   * do_not_sell: fixed product string; weak: different honest line.
   */
  paywallBlockMessageRo: string | null;
};

function effConfidence(level: string | null | undefined): "high" | "medium" | "low" {
  if (level === "high" || level === "medium" || level === "low") return level;
  return "low";
}

const MSG_NO_PAID: Record<"do_not_sell" | "weak", string> = {
  do_not_sell:
    "Nu avem suficiente date pentru un raport complet plătit pe acest anunț.",
  weak:
    "Pentru acest anunț, încrederea în date e prea scăzută ca să ți propunem un raport plătit; rămâi la varianta gratuită de mai sus.",
};

/**
 * @see imob Report sellability spec (docs / product)
 */
export function buildReportSellability(input: ReportSellabilityInput): ReportSellabilityResult {
  const reasonsRo: string[] = [];
  const { hasListingPrice, hasListingArea, compCount, hasAreaPriceBaseline, confidenceLevel } = input;
  const conf = effConfidence(confidenceLevel);

  if (!hasListingPrice) {
    reasonsRo.push("Lipsește un preț de listă utilizabil; nu putem ancora o ofertă plătită convingătoare.");
  }
  if (!hasListingArea) {
    reasonsRo.push("Lipsește suprafața utilă; estimările per mp și comparațiile rămân fragile.");
  }
  if (!hasListingPrice || !hasListingArea) {
    return {
      sellability: "do_not_sell",
      reasonsRo,
      canShowPaywall: false,
      shouldOfferFreeOnly: true,
      shouldShowRefundFriendlyCopy: false,
      paywallBlockMessageRo: MSG_NO_PAID.do_not_sell,
    };
  }

  if (compCount === 0 && !hasAreaPriceBaseline) {
    reasonsRo.push("Nu avem comparabile identificate pe anunț și nici un reper de preț pe zonă suficient de solid.");
    return {
      sellability: "do_not_sell",
      reasonsRo,
      canShowPaywall: false,
      shouldOfferFreeOnly: true,
      shouldShowRefundFriendlyCopy: false,
      paywallBlockMessageRo: MSG_NO_PAID.do_not_sell,
    };
  }

  if (conf === "low" && compCount === 0 && hasAreaPriceBaseline) {
    reasonsRo.push("Comparabilele lipsesc, deși există un reper de zonă; încrederea rămâne scăzută pentru un pachet plătit.");
    return {
      sellability: "weak",
      reasonsRo,
      canShowPaywall: false,
      shouldOfferFreeOnly: true,
      shouldShowRefundFriendlyCopy: true,
      paywallBlockMessageRo: MSG_NO_PAID.weak,
    };
  }

  if ((conf === "high" || conf === "medium") && compCount >= 3) {
    reasonsRo.push("Avem suficiente comparabile și o încredere cel puțin medie în semnale.");
    return {
      sellability: "strong",
      reasonsRo,
      canShowPaywall: true,
      shouldOfferFreeOnly: false,
      shouldShowRefundFriendlyCopy: false,
      paywallBlockMessageRo: null,
    };
  }

  if ((conf === "high" || conf === "medium") && compCount >= 1 && compCount < 3) {
    reasonsRo.push("Avem câteva comparabile și o bază rezonabilă; raportul plătit e oferit cu așteptări cinstite.");
    return {
      sellability: "okay",
      reasonsRo,
      canShowPaywall: true,
      shouldOfferFreeOnly: false,
      shouldShowRefundFriendlyCopy: true,
      paywallBlockMessageRo: null,
    };
  }

  if ((conf === "high" || conf === "medium") && compCount === 0 && hasAreaPriceBaseline) {
    reasonsRo.push("Comparabilele lipsesc, dar reperul de zonă și încrederea medie/înaltă susțin totuși un raport plătit — cu explicații oneste despre limitări.");
    return {
      sellability: "okay",
      reasonsRo,
      canShowPaywall: true,
      shouldOfferFreeOnly: false,
      shouldShowRefundFriendlyCopy: true,
      paywallBlockMessageRo: null,
    };
  }

  if (conf === "low" && compCount >= 1) {
    reasonsRo.push("Încrederea modelului e redusă; oferim previzualizare fără deblocare plătită.");
    return {
      sellability: "weak",
      reasonsRo,
      canShowPaywall: false,
      shouldOfferFreeOnly: true,
      shouldShowRefundFriendlyCopy: true,
      paywallBlockMessageRo: MSG_NO_PAID.weak,
    };
  }

  // Remaining: e.g. low with 0 comps and baseline — should be caught; fallback
  reasonsRo.push("Semnalele mixte sau incomplete nu justifică acum o ofertă de raport plătit pe acest anunț.");
  return {
    sellability: "do_not_sell",
    reasonsRo,
    canShowPaywall: false,
    shouldOfferFreeOnly: true,
    shouldShowRefundFriendlyCopy: false,
    paywallBlockMessageRo: MSG_NO_PAID.do_not_sell,
  };
}
