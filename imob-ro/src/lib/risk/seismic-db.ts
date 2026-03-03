/**
 * Database-backed seismic risk lookup using SeismicBuilding table.
 * Replaces the JSON-file approach with proper fuzzy address matching
 * and nearby buildings query.
 */
import { prisma } from "@/lib/db";
import { haversineM } from "@/lib/geo";
import type { SeismicResult } from "@/lib/types/pipeline";

import { addressMatchScore, normalizeAddress, parseAddress } from "./address-normalize";

export interface SeismicMatch {
  riskClass: string;
  confidence: number;
  method: "db-address-exact" | "db-geo" | "db-address-fuzzy" | "heuristic";
  matchedAddress: string | null;
  matchedId: string | null;
  distance: number | null;
  intervention: string | null;
  yearBuilt: number | null;
  source: string | null;
  sourceUrl: string | null;
  note: string | null;
}

export interface NearbyRiskBuilding {
  id: string;
  addressRaw: string;
  riskClass: string;
  distanceM: number;
  yearBuilt: number | null;
  intervention: string | null;
  lat: number | null;
  lng: number | null;
}

const NEARBY_RADIUS_M = 200;
const GEO_EXACT_RADIUS_M = 40;

export async function lookupSeismicFromDb(params: {
  lat?: number | null;
  lng?: number | null;
  addressRaw?: string | null;
  sector?: number | null;
  yearBuilt?: number | null;
}): Promise<SeismicMatch> {
  const { lat, lng, addressRaw, yearBuilt } = params;

  // Strategy 1: Exact address match via normalized text
  if (addressRaw) {
    const norm = normalizeAddress(addressRaw);
    const exactMatch = await prisma.seismicBuilding.findFirst({
      where: { addressNorm: norm },
      orderBy: { riskClass: "asc" },
    });

    if (exactMatch) {
      return {
        riskClass: exactMatch.riskClass,
        confidence: 1.0,
        method: "db-address-exact",
        matchedAddress: exactMatch.addressRaw,
        matchedId: exactMatch.id,
        distance: null,
        intervention: exactMatch.intervention,
        yearBuilt: exactMatch.yearBuilt,
        source: exactMatch.source,
        sourceUrl: exactMatch.sourceUrl,
        note: `Potrivire exacta: ${exactMatch.addressRaw}`,
      };
    }
  }

  // Strategy 2: Geo proximity match (within 40m = same building)
  if (lat != null && lng != null) {
    const candidates = await prisma.seismicBuilding.findMany({
      where: {
        lat: { gte: lat - 0.005, lte: lat + 0.005 },
        lng: { gte: lng - 0.005, lte: lng + 0.005 },
      },
    });

    let bestGeo: { building: typeof candidates[0]; dist: number } | null = null;
    for (const b of candidates) {
      if (b.lat == null || b.lng == null) continue;
      const d = haversineM(lat, lng, b.lat, b.lng);
      if (d <= GEO_EXACT_RADIUS_M && (!bestGeo || d < bestGeo.dist)) {
        bestGeo = { building: b, dist: d };
      }
    }

    if (bestGeo) {
      return {
        riskClass: bestGeo.building.riskClass,
        confidence: 0.95,
        method: "db-geo",
        matchedAddress: bestGeo.building.addressRaw,
        matchedId: bestGeo.building.id,
        distance: Math.round(bestGeo.dist),
        intervention: bestGeo.building.intervention,
        yearBuilt: bestGeo.building.yearBuilt,
        source: bestGeo.building.source,
        sourceUrl: bestGeo.building.sourceUrl,
        note: `Distanta: ${Math.round(bestGeo.dist)}m`,
      };
    }
  }

  // Strategy 3: Fuzzy address match
  if (addressRaw) {
    const parsed = parseAddress(addressRaw);
    if (parsed.streetName) {
      const candidates = await prisma.seismicBuilding.findMany({
        where: {
          OR: [
            { streetName: { contains: parsed.streetName, mode: "insensitive" } },
            { addressNorm: { contains: parsed.streetName, mode: "insensitive" } },
          ],
        },
        take: 50,
      });

      let bestFuzzy: { building: typeof candidates[0]; score: number } | null = null;
      for (const b of candidates) {
        const candidateParsed = parseAddress(b.addressRaw);
        const score = addressMatchScore(parsed, candidateParsed);
        if (score > 0.6 && (!bestFuzzy || score > bestFuzzy.score)) {
          bestFuzzy = { building: b, score };
        }
      }

      if (bestFuzzy) {
        const confLevel = bestFuzzy.score >= 0.9 ? 0.85 : bestFuzzy.score >= 0.75 ? 0.65 : 0.5;
        const matchType =
          bestFuzzy.score >= 0.9
            ? "strada + numar"
            : bestFuzzy.score >= 0.75
              ? "strada, fara numar exact"
              : "potrivire partiala";

        return {
          riskClass: bestFuzzy.building.riskClass,
          confidence: confLevel,
          method: "db-address-fuzzy",
          matchedAddress: bestFuzzy.building.addressRaw,
          matchedId: bestFuzzy.building.id,
          distance: null,
          intervention: bestFuzzy.building.intervention,
          yearBuilt: bestFuzzy.building.yearBuilt,
          source: bestFuzzy.building.source,
          sourceUrl: bestFuzzy.building.sourceUrl,
          note: `${matchType} (scor: ${Math.round(bestFuzzy.score * 100)}%)`,
        };
      }
    }
  }

  // Strategy 4: Heuristic by year
  return heuristicMatch(yearBuilt);
}

function heuristicMatch(yearBuilt?: number | null): SeismicMatch {
  let riskClass = "Unknown";
  let note = "Nu apare in lista publica AMCCRS";

  if (yearBuilt) {
    if (yearBuilt < 1940) {
      riskClass = "RsI";
      note = `Cladire din ${yearBuilt} (pre-1940) - risc potential ridicat`;
    } else if (yearBuilt < 1963) {
      riskClass = "RsII";
      note = `Cladire din ${yearBuilt} (1940-1962) - verificati expertiza tehnica`;
    } else if (yearBuilt < 1978) {
      riskClass = "RsIII";
      note = `Cladire din ${yearBuilt} (1963-1977) - risc moderat estimat`;
    } else if (yearBuilt < 1990) {
      riskClass = "RsIV";
      note = `Cladire din ${yearBuilt} (1978-1989)`;
    } else {
      riskClass = "None";
      note = `Cladire din ${yearBuilt} (post-1990)`;
    }
  }

  return {
    riskClass,
    confidence: yearBuilt ? 0.3 : 0.1,
    method: "heuristic",
    matchedAddress: null,
    matchedId: null,
    distance: null,
    intervention: null,
    yearBuilt: yearBuilt ?? null,
    source: null,
    sourceUrl: null,
    note,
  };
}

/**
 * Find risk buildings within a radius of the given coordinates.
 */
export async function findNearbyRiskBuildings(
  lat: number,
  lng: number,
  radiusM = NEARBY_RADIUS_M,
): Promise<NearbyRiskBuilding[]> {
  const degBuffer = radiusM / 111_000 + 0.001;

  const candidates = await prisma.seismicBuilding.findMany({
    where: {
      lat: { gte: lat - degBuffer, lte: lat + degBuffer },
      lng: { gte: lng - degBuffer, lte: lng + degBuffer },
      riskClass: { in: ["RsI", "RsII", "RsIII"] },
    },
  });

  const nearby: NearbyRiskBuilding[] = [];
  for (const b of candidates) {
    if (b.lat == null || b.lng == null) continue;
    const d = haversineM(lat, lng, b.lat, b.lng);
    if (d <= radiusM) {
      nearby.push({
        id: b.id,
        addressRaw: b.addressRaw,
        riskClass: b.riskClass,
        distanceM: Math.round(d),
        yearBuilt: b.yearBuilt,
        intervention: b.intervention,
        lat: b.lat,
        lng: b.lng,
      });
    }
  }

  nearby.sort((a, b) => a.distanceM - b.distanceM);
  return nearby;
}
