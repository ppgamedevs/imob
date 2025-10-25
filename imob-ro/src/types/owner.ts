/**
 * Owner Experience v2 - Type Definitions
 * Self-serve valuation, Pre-Market Score, ROI Quick Fixes
 */

export type OwnerRoiItem = {
  id: string;
  label: string;
  cost: [number, number]; // [low, high] in EUR
  impact: {
    type: "avm" | "tts"; // affects price or time-to-sell
    pct: number; // percentage improvement
  };
  selected?: boolean;
  note?: string; // explanation for the owner
};

export type PreMarketScore = {
  score: number; // 0-100
  breakdown: Record<string, number>; // component scores
};

export type OwnerDashboardData = {
  analysisId: string;
  draft: {
    id: string;
    status: string;
    addressNote?: string;
    contactName?: string;
    contactEmail?: string;
    shareToken: string;
    roiToggles: Record<string, boolean>;
  };
  listing: {
    title?: string;
    price?: number;
    areaM2?: number;
    rooms?: number;
    floor?: number;
    yearBuilt?: number;
    address?: string;
    lat?: number;
    lng?: number;
    photos?: string[];
  };
  scores: {
    avmLow?: number;
    avmMid?: number;
    avmHigh?: number;
    avmConf?: number;
    priceBadge?: string;
    ttsBucket?: string;
    yieldGross?: number;
    yieldNet?: number;
    riskSeismic?: number;
    riskClass?: string;
    condition?: string;
    conditionScore?: number;
    explain?: any;
  };
  roiItems: OwnerRoiItem[];
  preMarketScore: PreMarketScore;
};
