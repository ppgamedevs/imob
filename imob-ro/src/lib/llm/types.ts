export interface LlmTextExtraction {
  condition: "nou" | "renovat" | "locuibil" | "necesita_renovare" | "de_renovat" | null;
  conditionDetails: string | null;
  renovationYear: number | null;
  hasParking: boolean | null;
  hasStorage: boolean | null;
  hasElevator: boolean | null;
  heatingType: string | null;
  buildingType: string | null;
  orientation: string | null;
  balconyM2: number | null;
  usableAreaM2: number | null;
  redFlags: string[];
  positives: string[];
  sellerMotivation: "normal" | "urgent" | "foarte_urgent" | null;
  summary: string;
  fieldConfidence: {
    condition: number;
    renovationYear: number;
    balconyM2: number;
    heatingType: number;
    usableAreaM2: number;
    sellerMotivation: number;
  };
  evidence: Array<{ field: string; quote: string }>;
}

export interface LlmVisionExtraction {
  condition: "nou" | "renovat" | "locuibil" | "necesita_renovare" | "de_renovat";
  visibleIssues: string[];
  furnishing: "gol" | "partial_mobilat" | "complet_mobilat";
  brightness: 0 | 1 | 2 | 3;
  layoutQuality: "bun" | "mediu" | "slab" | null;
  isRender: boolean;
  renderConfidence: number;
  confidence: number;
  evidence: string;
}

export interface LlmTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
