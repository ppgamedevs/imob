/**
 * Intel Scoring Engine.
 *
 * Computes four unique scores from POI data:
 *   1. Daily Convenience (0-100)
 *   2. Family Score (0-100)
 *   3. Nightlife / Noise Risk (0-100)
 *   4. Walkability Proxy (0-100)
 *
 * Each score includes supporting evidence and red flags.
 */
import type { OverpassPoi } from "./overpass";
import type { PoiDataQuality } from "@/lib/geo/poi/types";
import { POI_CATEGORY_KEYS, type PoiCategoryKey } from "./poiCategories";

// ---- Types ----

export interface IntelScore {
  value: number;
  label: string;
  labelRo: string;
}

/** How complete OSM POI coverage is for this radius (not “how bad the neighborhood is”). */
export type ZoneDataQualityLevel = "scazuta" | "medie" | "ridicata";

export interface ZoneDataQuality {
  level: ZoneDataQualityLevel;
  totalPois: number;
  categoriesWithData: number;
  emptyCategoryCount: number;
  /** Sparse OSM → soften scores, never treat gaps as “lipsuri reale”. */
  lowDataMode: boolean;
  /** From batched POI pipeline evaluator (optional). */
  confidence?: "low" | "medium" | "high";
  dataQualityReasons?: string[];
}

export interface UncertainScores {
  convenience: boolean;
  family: boolean;
  walkability: boolean;
  /** Low OSM coverage → do not present nightlife risk as factual. */
  nightlifeRisk: boolean;
}

export interface IntelResult {
  scores: {
    convenience: IntelScore;
    family: IntelScore;
    nightlifeRisk: IntelScore;
    walkability: IntelScore;
  };
  evidence: {
    convenience: string[];
    family: string[];
    nightlifeRisk: string[];
    walkability: string[];
  };
  /** Deprecated: kept empty. Do not surface “0 X in OSM” as product conclusions. */
  redFlags: string[];
  zoneDataQuality: ZoneDataQuality;
  categoryCounts: Record<PoiCategoryKey, number>;
  /** When true, show “Estimare incerta” for that dimension (low OSM coverage). */
  uncertainScores: UncertainScores;
}

// ---- Helpers ----

function clamp(val: number): number {
  return Math.max(0, Math.min(100, Math.round(val)));
}

function countWithin(pois: OverpassPoi[], maxDistM: number): number {
  return pois.filter((p) => p.distanceM <= maxDistM).length;
}

function closestDist(pois: OverpassPoi[]): number | null {
  if (pois.length === 0) return null;
  return pois[0].distanceM; // already sorted by distance
}

function closestName(pois: OverpassPoi[]): string | null {
  if (pois.length === 0) return null;
  return pois[0].name ?? pois[0].subType ?? null;
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Excelent";
  if (score >= 60) return "Bun";
  if (score >= 40) return "Acceptabil";
  if (score >= 20) return "Slab";
  return "Foarte slab";
}

function fmtDist(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

// ---- Score Computation ----

function computeConvenience(
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
): { score: number; evidence: string[] } {
  const shops = poisByCategory.supermarket ?? [];
  const transport = poisByCategory.transport ?? [];
  const medical = poisByCategory.medical ?? [];

  const evidence: string[] = [];
  let raw = 0;

  // Supermarkets within 400m (up to 30 pts)
  const shopsNear = countWithin(shops, 400);
  const shopsMiddle = countWithin(shops, 800);
  raw += Math.min(shopsNear * 10, 30);

  if (shopsNear > 0) {
    const nearest = closestDist(shops)!;
    const name = closestName(shops);
    evidence.push(
      `${shopsNear} magazine < 400m${name ? ` (cel mai aproape: ${name}, ${fmtDist(nearest)})` : ""}`,
    );
  } else if (shopsMiddle > 0) {
    evidence.push(`${shopsMiddle} magazine < 800m`);
  }

  // Pharmacy within 500m/800m (up to 15 pts)
  const pharmacies = shops.filter((p) => p.subType === "pharmacy");
  const pharmacyNear = countWithin(pharmacies, 500);
  const pharmacyMid = countWithin(pharmacies, 800);
  raw += pharmacyNear > 0 ? 15 : pharmacyMid > 0 ? 8 : 0;
  if (pharmacyNear > 0) {
    evidence.push(`Farmacie la ${fmtDist(closestDist(pharmacies)!)}`);
  } else if (pharmacyMid > 0) {
    evidence.push(`Farmacie la ${fmtDist(closestDist(pharmacies)!)} (sub 800m)`);
  }

  // Transport within 400m/800m (up to 35 pts)
  const transNear = countWithin(transport, 400);
  const transMid = countWithin(transport, 800);
  raw += Math.min(transNear * 7, 25);
  raw += Math.min(transMid * 2, 10);

  const metroStops = transport.filter(
    (p) => p.subType === "subway" || p.tags?.station === "subway",
  );
  if (metroStops.length > 0) {
    const metroMin = Math.round(metroStops[0].distanceM / 80);
    evidence.push(
      `Metrou la ${fmtDist(metroStops[0].distanceM)} (~${metroMin} min)`,
    );
  }
  if (transNear > 0) {
    evidence.push(`${transNear} statii transport < 400m`);
  }

  // Medical within 1km (up to 20 pts)
  const medNear = countWithin(medical, 1000);
  raw += Math.min(medNear * 5, 20);
  if (medNear > 0) {
    const name = closestName(medical);
    evidence.push(
      `${medNear} unitati medicale < 1 km${name ? ` (${name})` : ""}`,
    );
  }

  return { score: clamp(raw), evidence: evidence.slice(0, 5) };
}

function computeFamily(
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
): { score: number; evidence: string[] } {
  const schools = poisByCategory.school ?? [];
  const parks = poisByCategory.park ?? [];
  const restaurants = poisByCategory.restaurant ?? [];

  const evidence: string[] = [];
  let raw = 0;

  // Schools within 1km (up to 30 pts)
  const schoolsNear = countWithin(schools, 1000);
  raw += Math.min(schoolsNear * 8, 30);

  const kindergartens = schools.filter(
    (p) => p.subType === "kindergarten",
  );
  const schoolsOnly = schools.filter(
    (p) => p.subType === "school",
  );

  if (schoolsOnly.length > 0) {
    evidence.push(
      `${countWithin(schoolsOnly, 1000)} scoli < 1 km (cea mai aproape: ${fmtDist(closestDist(schoolsOnly)!)})`,
    );
  }
  if (kindergartens.length > 0) {
    evidence.push(
      `${countWithin(kindergartens, 800)} gradinite < 800m`,
    );
  }

  // Parks within 800m (up to 30 pts)
  const parksNear = countWithin(parks, 800);
  raw += Math.min(parksNear * 10, 30);
  if (parksNear > 0) {
    const name = closestName(parks);
    evidence.push(
      `${parksNear} parcuri/locuri de joaca < 800m${name ? ` (${name})` : ""}`,
    );
  }

  // Low nightlife penalty (up to 20 bonus pts)
  const barsNear = countWithin(
    restaurants.filter(
      (p) =>
        p.subType === "bar" ||
        p.subType === "nightclub" ||
        p.subType === "pub",
    ),
    500,
  );
  if (barsNear <= 1) {
    raw += 20;
    evidence.push("Zona linistita (putine baruri/cluburi)");
  } else if (barsNear <= 3) {
    raw += 10;
  } else {
    raw -= 5;
    evidence.push(`${barsNear} baruri/cluburi < 500m (zona zgomotoasa)`);
  }

  // Playground bonus
  const playgrounds = parks.filter(
    (p) => p.subType === "playground",
  );
  if (playgrounds.length > 0) {
    raw += 10;
    evidence.push(
      `Loc de joaca la ${fmtDist(closestDist(playgrounds)!)}`,
    );
  }

  return { score: clamp(raw), evidence: evidence.slice(0, 5) };
}

function computeNightlifeRisk(
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
  lowDataMode: boolean,
): { score: number; evidence: string[] } {
  if (lowDataMode) {
    return {
      score: 40,
      evidence: [
        "Date insuficiente pentru evaluarea zgomotului nocturn — nu interpreta acest scor ca verdict despre zona.",
      ],
    };
  }

  const restaurants = poisByCategory.restaurant ?? [];
  const evidence: string[] = [];
  let raw = 0;

  const bars = restaurants.filter(
    (p) => p.subType === "bar" || p.subType === "pub",
  );
  const clubs = restaurants.filter((p) => p.subType === "nightclub");
  const cafes = restaurants.filter((p) => p.subType === "cafe");
  const restOnly = restaurants.filter((p) => p.subType === "restaurant");

  // Bars within 500m (major factor)
  const barsNear = countWithin(bars, 500);
  const barsMid = countWithin(bars, 800);
  raw += barsNear * 12;
  raw += (barsMid - barsNear) * 5;

  if (barsNear > 0) {
    evidence.push(`${barsNear} baruri < 500m`);
  }

  // Clubs within 800m (big noise factor)
  const clubsNear = countWithin(clubs, 800);
  raw += clubsNear * 15;
  if (clubsNear > 0) {
    evidence.push(`${clubsNear} cluburi < 800m`);
  }

  // Restaurants density (moderate factor)
  const restNear = countWithin(restOnly, 500);
  raw += Math.min(restNear * 3, 15);
  if (restNear >= 3) {
    evidence.push(`${restNear} restaurante < 500m`);
  }

  // Cafes (mild factor)
  const cafesNear = countWithin(cafes, 500);
  raw += Math.min(cafesNear * 2, 10);
  if (cafesNear >= 2) {
    evidence.push(`${cafesNear} cafenele < 500m`);
  }

  if (raw < 10) {
    evidence.push("Zona linistita, risc redus de zgomot nocturn");
  } else if (raw >= 60) {
    evidence.push("Indicii de activitate nocturna in datele disponibile (verifica la fata locului)");
  }

  return { score: clamp(raw), evidence: evidence.slice(0, 5) };
}

function computeWalkability(
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
): { score: number; evidence: string[] } {
  const evidence: string[] = [];
  let raw = 0;

  // Category variety within 1km
  const categoriesPresent: string[] = [];
  let totalPois1km = 0;

  for (const [key, pois] of Object.entries(poisByCategory)) {
    const count = countWithin(pois, 1000);
    if (count > 0) {
      categoriesPresent.push(key);
      totalPois1km += count;
    }
  }

  // Variety bonus (up to 40 pts for 7+ categories)
  raw += Math.min(categoriesPresent.length * 6, 40);
  evidence.push(`${categoriesPresent.length}/8 categorii de POI < 1 km`);

  // Density bonus (up to 30 pts)
  raw += Math.min(totalPois1km * 0.8, 30);
  evidence.push(`${totalPois1km} puncte de interes totale < 1 km`);

  // Transport proximity bonus (up to 20 pts)
  const transport = poisByCategory.transport ?? [];
  const transNear = countWithin(transport, 500);
  raw += Math.min(transNear * 5, 20);
  if (transNear > 0) {
    evidence.push(`${transNear} statii transport < 500m`);
  }

  // Park proximity bonus (up to 10 pts)
  const parks = poisByCategory.park ?? [];
  if (parks.length > 0 && parks[0].distanceM <= 500) {
    raw += 10;
    evidence.push(`Parc la ${fmtDist(parks[0].distanceM)}`);
  }

  return { score: clamp(raw), evidence: evidence.slice(0, 5) };
}

// ---- Zone data quality (OSM coverage) ----

function computeCategoryCounts(
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
): Record<PoiCategoryKey, number> {
  return Object.fromEntries(
    POI_CATEGORY_KEYS.map((k) => [k, poisByCategory[k]?.length ?? 0]),
  ) as Record<PoiCategoryKey, number>;
}

export function computeZoneDataQuality(
  categoryCounts: Record<PoiCategoryKey, number>,
): ZoneDataQuality {
  const totalPois = POI_CATEGORY_KEYS.reduce((s, k) => s + categoryCounts[k], 0);
  const categoriesWithData = POI_CATEGORY_KEYS.filter((k) => categoryCounts[k] > 0).length;
  const emptyCategoryCount = POI_CATEGORY_KEYS.length - categoriesWithData;

  const lowDataMode =
    totalPois < 10 ||
    emptyCategoryCount >= 5 ||
    (totalPois < 22 && emptyCategoryCount >= 4) ||
    (totalPois < 16 && emptyCategoryCount >= 3);

  let level: ZoneDataQualityLevel;
  if (lowDataMode || totalPois < 14) {
    level = "scazuta";
  } else if (totalPois >= 48 && emptyCategoryCount <= 1) {
    level = "ridicata";
  } else if (totalPois >= 32 && emptyCategoryCount <= 2) {
    level = "ridicata";
  } else {
    level = "medie";
  }

  return {
    level,
    totalPois,
    categoriesWithData,
    emptyCategoryCount,
    lowDataMode,
  };
}

function mergeZoneDataQualityWithPipeline(
  base: ZoneDataQuality,
  pipeline: PoiDataQuality | undefined,
): ZoneDataQuality {
  if (!pipeline) return base;
  const lowDataMode = base.lowDataMode || pipeline.lowDataMode;
  let level = base.level;
  if (lowDataMode && level === "ridicata") {
    level = "medie";
  }
  return {
    ...base,
    lowDataMode,
    level,
    confidence: pipeline.confidence,
    dataQualityReasons: pipeline.reasons,
  };
}

/** Pull convenience / family / walkability toward neutral when OSM is sparse. */
function softenUncertainScore(raw: number): number {
  return clamp(Math.round(raw * 0.26 + 50 * 0.74));
}

/**
 * Build a full IntelResult for UI (handles older cached API payloads missing zone metadata).
 */
export function normalizeIntelResultForUi(
  partial: Pick<IntelResult, "scores" | "evidence"> & {
    redFlags?: string[];
    zoneDataQuality?: ZoneDataQuality;
    categoryCounts?: Record<PoiCategoryKey, number>;
    uncertainScores?: UncertainScores;
  },
  poisByCategory?: Record<PoiCategoryKey, OverpassPoi[]> | null,
): IntelResult {
  const categoryCounts =
    partial.categoryCounts ??
    (poisByCategory
      ? computeCategoryCounts(poisByCategory)
      : (Object.fromEntries(POI_CATEGORY_KEYS.map((k) => [k, 0])) as Record<
          PoiCategoryKey,
          number
        >));
  const zoneDataQuality = partial.zoneDataQuality ?? computeZoneDataQuality(categoryCounts);
  const uncertainScores: UncertainScores =
    partial.uncertainScores ??
    (zoneDataQuality.lowDataMode
      ? {
          convenience: true,
          family: true,
          walkability: true,
          nightlifeRisk: true,
        }
      : {
          convenience: false,
          family: false,
          walkability: false,
          nightlifeRisk: false,
        });

  return {
    scores: partial.scores,
    evidence: partial.evidence,
    redFlags: partial.redFlags ?? [],
    zoneDataQuality,
    categoryCounts,
    uncertainScores,
  };
}

// ---- Main API ----

export function computeIntelScores(
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
  options?: { pipelineQuality?: PoiDataQuality },
): IntelResult {
  const categoryCounts = computeCategoryCounts(poisByCategory);
  let zoneDataQuality = computeZoneDataQuality(categoryCounts);
  zoneDataQuality = mergeZoneDataQualityWithPipeline(
    zoneDataQuality,
    options?.pipelineQuality,
  );

  const convRaw = computeConvenience(poisByCategory);
  const famRaw = computeFamily(poisByCategory);
  const night = computeNightlifeRisk(poisByCategory, zoneDataQuality.lowDataMode);
  const walkRaw = computeWalkability(poisByCategory);

  let conv = convRaw;
  let fam = famRaw;
  let walk = walkRaw;
  let uncertainScores: UncertainScores = {
    convenience: false,
    family: false,
    walkability: false,
    nightlifeRisk: false,
  };

  if (zoneDataQuality.lowDataMode) {
    conv = { ...conv, score: softenUncertainScore(conv.score) };
    fam = { ...fam, score: softenUncertainScore(fam.score) };
    walk = { ...walk, score: softenUncertainScore(walk.score) };
    uncertainScores = {
      convenience: true,
      family: true,
      walkability: true,
      nightlifeRisk: true,
    };
  }

  return {
    scores: {
      convenience: {
        value: conv.score,
        label: scoreLabel(conv.score),
        labelRo: "Comoditate zilnica",
      },
      family: {
        value: fam.score,
        label: scoreLabel(fam.score),
        labelRo: "Potrivire familii",
      },
      nightlifeRisk: {
        value: night.score,
        label: scoreLabel(night.score),
        labelRo: "Risc zgomot nocturn",
      },
      walkability: {
        value: walk.score,
        label: scoreLabel(walk.score),
        labelRo: "Walkability",
      },
    },
    evidence: {
      convenience: conv.evidence,
      family: fam.evidence,
      nightlifeRisk: night.evidence,
      walkability: walk.evidence,
    },
    redFlags: [],
    zoneDataQuality,
    categoryCounts,
    uncertainScores,
  };
}
