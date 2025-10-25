// Agent workspace types

export type AgentSession = {
  agentId: string;
  email: string;
  orgId: string | null;
  orgName: string | null;
};

export type BulkAnalysisJobStatus = "queued" | "running" | "completed" | "failed";

export type BulkAnalysisItemStatus = "queued" | "running" | "done" | "failed" | "duplicate";

export type BulkJobWithItems = {
  id: string;
  total: number;
  queued: number;
  running: number;
  done: number;
  failed: number;
  status: BulkAnalysisJobStatus;
  createdAt: Date;
  items: {
    id: string;
    url: string;
    status: BulkAnalysisItemStatus;
    analysisId: string | null;
    error: string | null;
  }[];
};

export type PortfolioFilters = {
  signals?: ("underpriced" | "overpriced" | "fast_tts" | "risk" | "missing_fields")[];
  areas?: string[];
  priceMin?: number;
  priceMax?: number;
  rooms?: number[];
  search?: string;
};

export type PortfolioListing = {
  analysisId: string;
  title: string | null;
  photo: string | null;
  price: number | null;
  areaM2: number | null;
  eurM2: number | null;
  avmMid: number | null;
  priceBadge: string | null;
  deltaPercent: number | null;
  ttsBucket: string | null;
  yieldNet: number | null;
  riskClass: string | null;
  conditionScore: number | null;
  dupCount: number;
  updatedAt: Date;
  sourceUrl: string;
};

export type OrgBrand = {
  color?: string;
  logoUrl?: string;
  slug?: string;
};
