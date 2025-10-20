export type ExplainAVM = {
  baselineEurM2?: number;
  adjustments?: Record<string, number>;
  askingVsMid?: number | null;
};
export type ExplainTTS = {
  priceDelta?: number;
  demandScore?: number;
  seasonality?: number;
  scoreDays?: number;
};
export type ExplainRent = {
  eurM2?: number;
  baseEurM2?: number;
  adjustments?: { rooms?: number; condition?: number; metro?: number; size?: number };
};
export type ExplainYield = { inputs?: Record<string, any>; annual?: Record<string, any> };
export type ScoreExplain = {
  avm?: ExplainAVM;
  tts?: ExplainTTS;
  rent?: ExplainRent;
  yield?: ExplainYield;
  seismic?: { riskClass?: string; confidence?: number; method?: string; note?: string };
};
