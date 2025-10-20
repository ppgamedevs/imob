export type AlertType = "PRICE_BELOW" | "UNDERPRICED" | "NEW_LISTINGS";

export type AlertParams = {
  thresholdEur?: number; // PRICE_BELOW
  underpricedPct?: number; // UNDERPRICED (e.g. 0.05 = 5%)
};
