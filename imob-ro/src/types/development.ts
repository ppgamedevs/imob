// Step 11: Development types and DTOs

import type { Developer, Development, Unit } from "@prisma/client";

// ========================================
// DTOs
// ========================================

export interface DevelopmentFilters {
  areas?: string[]; // area slugs
  typologies?: string[]; // studio|1|2|3|4|penthouse|duplex
  minPrice?: number;
  maxPrice?: number;
  deliveryFrom?: string; // ISO date
  deliveryTo?: string;
  maxMetroDistance?: number; // meters
  seismicClass?: string[]; // A|B|C|Dw|D
  minYield?: number; // percentage
  stage?: string[]; // in_sales|reserved|sold
  page?: number;
  limit?: number;
  sort?: "relevance" | "price_asc" | "price_desc" | "eur_m2" | "yield" | "delivery";
}

export interface UnitStats {
  typology: string;
  count: number;
  minPrice: number;
  maxPrice: number;
  avgEurM2: number;
}

export interface ProjectDTO {
  development: Development;
  developer: Developer | null;
  unitStats: UnitStats[];
  minPrice: number;
  maxPrice: number;
  avgEurM2: number;
  totalUnits: number;
  availableUnits: number;
  medianYield?: number;
  seismicClass?: string;
  metroDistance?: number; // meters
}

export interface ProjectDetailDTO extends ProjectDTO {
  units: UnitWithMetrics[];
  amenities: string[];
  photos: string[];
  nearbyMetro?: {
    name: string;
    distanceM: number;
  };
}

export interface UnitWithMetrics extends Unit {
  // All metrics already in Unit model
  // eurM2, yieldNet, ttsBucket, riskClass, explain
  development?: { lat?: number | null; lng?: number | null };
}

export interface UnitFilters {
  typology?: string[];
  minArea?: number;
  maxArea?: number;
  minPrice?: number;
  maxPrice?: number;
  floor?: string[];
  stage?: string[];
  minYield?: number;
}

export interface LeadRequest {
  devId?: string;
  token?: string;
  developmentId: string;
  unitId?: string;
  name?: string;
  contact: string; // email or phone
  message?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
  };
}

export interface LeadResponse {
  ok: boolean;
  leadId?: string;
  error?: string;
}

export interface BulkUnitsRequest {
  devId: string;
  developmentId: string;
  token: string;
  format?: "csv" | "json";
  units: BulkUnitInput[];
}

export interface BulkUnitInput {
  label: string;
  typology: string;
  areaM2: number;
  priceEur: number;
  floor?: string;
  rooms?: number;
  orientation?: string;
  parkingAvail?: boolean;
  stage?: string;
  photos?: string[];
}

export interface BulkUnitsResponse {
  ok: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors?: string[];
}

// ========================================
// Eligibility helpers
// ========================================

export interface GreenMortgageEligibility {
  eligible: boolean;
  reason?: string; // "nZEB certified" | "EPC A/A+" | "Built after 2021"
}

export interface VATEligibility {
  eligible: boolean;
  rate: number; // 5 or 19
  reason?: string;
}

// ========================================
// Catalog helpers
// ========================================

export interface CatalogProject {
  slug: string;
  name: string;
  coverPhoto?: string;
  developerLogo?: string;
  developerName?: string;
  areaName?: string;
  unitMix: UnitStats[]; // by typology
  minPrice: number;
  deliveryQuarter?: string; // "Q4 2026"
  badges: string[]; // "Green mortgage", "Low seismic", etc.
  sponsored?: boolean;
}

// ========================================
// Analytics events
// ========================================

export type DevelopmentEventKind =
  | "dev_catalog_view"
  | "dev_catalog_filter"
  | "dev_card_click"
  | "dev_sponsored_impression"
  | "dev_sponsored_click"
  | "dev_project_view"
  | "dev_unit_filter"
  | "dev_unit_row_click"
  | "dev_lead_submit"
  | "dev_lead_blocked"
  | "dev_brochure_download";

export interface DevelopmentEvent {
  kind: DevelopmentEventKind;
  developmentId?: string;
  unitId?: string;
  filters?: DevelopmentFilters | UnitFilters;
  meta?: Record<string, unknown>;
}
