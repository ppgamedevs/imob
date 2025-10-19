export type NormalizedFeatures = {
  city?: string;
  areaSlug?: string;
  type?: "apartment" | "house" | "studio" | "other";
  priceEur?: number;
  areaM2?: number;
  rooms?: number;
  level?: number | null; // -1 parter, 0 mezanin, 1..n
  floorsTotal?: number | null;
  yearBuilt?: number | null;
  distMetroM?: number | null;
  conditionScore?: number | null; // 0..1
  lat?: number;
  lng?: number;
};

export type ScoreResult = {
  avmLow?: number;
  avmHigh?: number;
  avmMid?: number;
  avmConf?: number;
  priceBadge?: "Underpriced" | "Fair" | "Overpriced";
  ttsBucket?: "<30" | "30-60" | "60-90" | "90+";
  estRent?: number;
  yieldGross?: number;
  yieldNet?: number;
  riskSeismic?: number | null; // keep numeric risk score if you compute one
  riskClass?: "RS1" | "RS2" | "none" | "unknown";
  riskSource?: string | null;
  condition?: "needs_renovation" | "decent" | "modern";
  conditionScore?: number | null;
  explain?: Record<string, unknown>;
};
