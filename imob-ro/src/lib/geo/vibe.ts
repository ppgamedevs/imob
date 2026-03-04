/**
 * Neighborhood Vibe Index: computes scores from pre-imported GeoPOI data.
 *
 * Four dimensions:
 *   nightlifeScore  — bars, restaurants, nightclubs
 *   familyScore     — schools, kindergartens, playgrounds, parks
 *   convenienceScore — supermarkets, pharmacies, gyms
 *   greenScore      — parks, playgrounds (weighted by proximity)
 */
import { prisma } from "@/lib/db";
import { haversineM } from "@/lib/geo";

// ---- Types ----

export interface VibeScores {
  nightlifeScore: number;
  familyScore: number;
  convenienceScore: number;
  greenScore: number;
  zoneType: string;
  zoneTypeKey: "nightlife" | "residential" | "mixed" | "green" | "limited";
}

export interface NearbyPOI {
  id: string;
  name: string | null;
  category: string;
  distanceM: number;
  lat: number;
  lng: number;
}

export interface VibeResult {
  scores: VibeScores;
  topNearby: Record<string, NearbyPOI[]>;
  totalPOIs: number;
}

// ---- Constants ----

const INNER_RADIUS_M = 300;
const OUTER_RADIUS_M = 800;

type Cat =
  | "BAR"
  | "RESTAURANT"
  | "NIGHTCLUB"
  | "PARK"
  | "SCHOOL"
  | "KINDERGARTEN"
  | "PLAYGROUND"
  | "SUPERMARKET"
  | "PHARMACY"
  | "GYM";

const NIGHTLIFE_CATS: Cat[] = ["BAR", "RESTAURANT", "NIGHTCLUB"];
const FAMILY_CATS: Cat[] = ["SCHOOL", "KINDERGARTEN", "PLAYGROUND", "PARK"];
const CONVENIENCE_CATS: Cat[] = ["SUPERMARKET", "PHARMACY", "GYM"];
const GREEN_CATS: Cat[] = ["PARK", "PLAYGROUND"];

// Maximum expected counts for normalization (based on Bucharest density)
const NIGHTLIFE_MAX_INNER = 8;
const NIGHTLIFE_MAX_OUTER = 25;
const FAMILY_MAX_INNER = 3;
const FAMILY_MAX_OUTER = 10;
const CONVENIENCE_MAX_INNER = 4;
const CONVENIENCE_MAX_OUTER = 12;
const GREEN_MAX_INNER = 2;
const GREEN_MAX_OUTER = 5;

// ---- Score computation ----

function clampScore(raw: number): number {
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function computeDimensionScore(
  innerCount: number,
  outerCount: number,
  maxInner: number,
  maxOuter: number,
): number {
  const innerScore = Math.min(innerCount / maxInner, 1) * 70;
  const outerScore = Math.min(outerCount / maxOuter, 1) * 30;
  return clampScore(innerScore + outerScore);
}

function deriveZoneType(scores: Omit<VibeScores, "zoneType" | "zoneTypeKey">): {
  zoneType: string;
  zoneTypeKey: VibeScores["zoneTypeKey"];
} {
  const { nightlifeScore, familyScore, convenienceScore, greenScore } = scores;

  if (nightlifeScore >= 60 && nightlifeScore > familyScore) {
    return {
      zoneType: "Zona cu baruri si restaurante",
      zoneTypeKey: "nightlife",
    };
  }

  if (
    familyScore >= 50 &&
    greenScore >= 40 &&
    nightlifeScore < 40
  ) {
    return {
      zoneType: "Zona rezidentiala",
      zoneTypeKey: "residential",
    };
  }

  if (greenScore >= 60 && greenScore > nightlifeScore) {
    return {
      zoneType: "Zona verde",
      zoneTypeKey: "green",
    };
  }

  const avg = (nightlifeScore + familyScore + convenienceScore + greenScore) / 4;
  if (avg < 20) {
    return {
      zoneType: "Zona cu facilitati limitate",
      zoneTypeKey: "limited",
    };
  }

  return {
    zoneType: "Zona mixta",
    zoneTypeKey: "mixed",
  };
}

// ---- Main API ----

export async function computeVibeScores(
  lat: number,
  lng: number,
): Promise<VibeResult> {
  const degBuffer = OUTER_RADIUS_M / 111_000 + 0.002;

  const pois = await prisma.geoPOI.findMany({
    where: {
      lat: { gte: lat - degBuffer, lte: lat + degBuffer },
      lng: { gte: lng - degBuffer, lte: lng + degBuffer },
    },
  });

  // Compute distances and bucket into inner/outer
  const categorized: {
    poi: (typeof pois)[0];
    distanceM: number;
    isInner: boolean;
  }[] = [];

  for (const poi of pois) {
    const d = haversineM(lat, lng, poi.lat, poi.lng);
    if (d <= OUTER_RADIUS_M) {
      categorized.push({
        poi,
        distanceM: Math.round(d),
        isInner: d <= INNER_RADIUS_M,
      });
    }
  }

  // Count by dimension and radius
  const count = (cats: Cat[], inner: boolean) =>
    categorized.filter(
      (c) =>
        cats.includes(c.poi.category as Cat) &&
        (inner ? c.isInner : true),
    ).length;

  const nightlifeInner = count(NIGHTLIFE_CATS, true);
  const nightlifeOuter = count(NIGHTLIFE_CATS, false);
  const familyInner = count(FAMILY_CATS, true);
  const familyOuter = count(FAMILY_CATS, false);
  const convenienceInner = count(CONVENIENCE_CATS, true);
  const convenienceOuter = count(CONVENIENCE_CATS, false);
  const greenInner = count(GREEN_CATS, true);
  const greenOuter = count(GREEN_CATS, false);

  const nightlifeScore = computeDimensionScore(
    nightlifeInner,
    nightlifeOuter,
    NIGHTLIFE_MAX_INNER,
    NIGHTLIFE_MAX_OUTER,
  );
  const familyScore = computeDimensionScore(
    familyInner,
    familyOuter,
    FAMILY_MAX_INNER,
    FAMILY_MAX_OUTER,
  );
  const convenienceScore = computeDimensionScore(
    convenienceInner,
    convenienceOuter,
    CONVENIENCE_MAX_INNER,
    CONVENIENCE_MAX_OUTER,
  );
  const greenScore = computeDimensionScore(
    greenInner,
    greenOuter,
    GREEN_MAX_INNER,
    GREEN_MAX_OUTER,
  );

  const partial = { nightlifeScore, familyScore, convenienceScore, greenScore };
  const { zoneType, zoneTypeKey } = deriveZoneType(partial);

  // Build top nearby POIs per category group
  const sorted = [...categorized].sort((a, b) => a.distanceM - b.distanceM);

  const topNearby: Record<string, NearbyPOI[]> = {
    nightlife: [],
    family: [],
    convenience: [],
    green: [],
  };

  for (const item of sorted) {
    const cat = item.poi.category as Cat;
    const entry: NearbyPOI = {
      id: item.poi.id,
      name: item.poi.name,
      category: cat,
      distanceM: item.distanceM,
      lat: item.poi.lat,
      lng: item.poi.lng,
    };

    if (NIGHTLIFE_CATS.includes(cat) && topNearby.nightlife.length < 5) {
      topNearby.nightlife.push(entry);
    }
    if (FAMILY_CATS.includes(cat) && topNearby.family.length < 5) {
      topNearby.family.push(entry);
    }
    if (CONVENIENCE_CATS.includes(cat) && topNearby.convenience.length < 5) {
      topNearby.convenience.push(entry);
    }
    if (GREEN_CATS.includes(cat) && topNearby.green.length < 5) {
      topNearby.green.push(entry);
    }
  }

  return {
    scores: { ...partial, zoneType, zoneTypeKey },
    topNearby,
    totalPOIs: categorized.length,
  };
}

/**
 * Load POIs for map layer display.
 * Returns categorized POIs within the given radius.
 */
export async function getPOIsForMap(
  lat: number,
  lng: number,
  categories: Cat[],
  radiusM = 1000,
): Promise<NearbyPOI[]> {
  const degBuffer = radiusM / 111_000 + 0.002;

  const pois = await prisma.geoPOI.findMany({
    where: {
      lat: { gte: lat - degBuffer, lte: lat + degBuffer },
      lng: { gte: lng - degBuffer, lte: lng + degBuffer },
      category: { in: categories },
    },
  });

  const results: NearbyPOI[] = [];
  for (const poi of pois) {
    const d = haversineM(lat, lng, poi.lat, poi.lng);
    if (d <= radiusM) {
      results.push({
        id: poi.id,
        name: poi.name,
        category: poi.category,
        distanceM: Math.round(d),
        lat: poi.lat,
        lng: poi.lng,
      });
    }
  }

  results.sort((a, b) => a.distanceM - b.distanceM);
  return results;
}
