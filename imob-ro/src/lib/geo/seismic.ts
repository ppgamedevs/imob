/**
 * Public seismic-risk API for the report and map layers.
 * Wraps the DB-backed lookup in seismic-db with a clean return shape.
 */
import { findNearbyRiskBuildings, lookupSeismicFromDb } from "@/lib/risk/seismic-db";
import type { NearbyRiskBuilding } from "@/lib/risk/seismic-db";

export interface SeismicStatus {
  inList: boolean;
  riskClass: string;
  distanceMeters: number | null;
  matchConfidence: number; // 0-100
  source: string | null;
  sourceUrl: string | null;
  matchedAddress: string | null;
  method: string | null;
  intervention: string | null;
  note: string | null;
}

export interface SeismicNearby {
  total: number;
  rsI: number;
  rsII: number;
  buildings: NearbyRiskBuilding[];
}

/**
 * Single-call seismic check for a property.
 * Returns whether it appears on the AMCCRS list + nearby buildings.
 */
export async function getSeismicStatus(params: {
  addressNormalized?: string | null;
  addressRaw?: string | null;
  lat?: number | null;
  lng?: number | null;
  sector?: number | null;
  yearBuilt?: number | null;
}): Promise<{ status: SeismicStatus; nearby: SeismicNearby }> {
  const match = await lookupSeismicFromDb({
    lat: params.lat,
    lng: params.lng,
    addressRaw: params.addressRaw ?? params.addressNormalized,
    sector: params.sector,
    yearBuilt: params.yearBuilt,
  });

  const inList =
    match.method !== "heuristic" &&
    match.riskClass !== "Unknown" &&
    match.riskClass !== "None";

  const status: SeismicStatus = {
    inList,
    riskClass: match.riskClass,
    distanceMeters: match.distance,
    matchConfidence: Math.round(match.confidence * 100),
    source: match.source,
    sourceUrl: match.sourceUrl,
    matchedAddress: match.matchedAddress,
    method: match.method,
    intervention: match.intervention,
    note: match.note,
  };

  let nearby: SeismicNearby = { total: 0, rsI: 0, rsII: 0, buildings: [] };

  if (params.lat != null && params.lng != null) {
    const buildings = await findNearbyRiskBuildings(params.lat, params.lng, 1000);
    nearby = {
      total: buildings.length,
      rsI: buildings.filter((b) => b.riskClass === "RsI").length,
      rsII: buildings.filter((b) => b.riskClass === "RsII").length,
      buildings,
    };
  }

  return { status, nearby };
}

/**
 * Load seismic buildings within a radius for map layer display.
 * Default 1 km radius, capped at 2 km.
 */
export async function getSeismicBuildingsForMap(
  lat: number,
  lng: number,
  radiusM = 1000,
): Promise<NearbyRiskBuilding[]> {
  const clamped = Math.min(radiusM, 2000);
  return findNearbyRiskBuildings(lat, lng, clamped);
}

export type { NearbyRiskBuilding };
