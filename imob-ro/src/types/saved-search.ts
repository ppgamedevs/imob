/**
 * Day 29: Saved Search Types
 * Complete query schema for saved searches with all filter options
 */

export type SavedQuery = {
  // Location filters
  areas?: string[];
  city?: "București";

  // Price filters
  priceMin?: number;
  priceMax?: number;
  eurM2Min?: number;
  eurM2Max?: number;

  // Property filters
  m2Min?: number;
  m2Max?: number;
  rooms?: number[];
  yearMin?: number;
  yearMax?: number;

  // Smart filters
  metroMaxM?: number;
  underpriced?: boolean;
  tts?: "fast" | "normal" | "slow";
  keywords?: string[]; // title/description search

  // Sorting
  sort?: "new" | "price_asc" | "price_desc" | "eurm2_asc" | "eurm2_desc" | "yield_desc";

  // Affordability
  budget?: {
    cash?: number;
    mortgage?: {
      downPct?: number;
      maxRate?: number;
    };
  };

  // Advanced
  dedup?: boolean; // default true
  limit?: number; // default 50, max 200
};

export type SavedSearchWithCount = {
  id: string;
  name: string | null;
  query: SavedQuery;
  lastRunAt: Date | null;
  createdAt: Date;
  newCount?: number; // new results since last run
};
