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
import type { PoiCategoryKey } from "./poiCategories";

// ---- Types ----

export interface IntelScore {
  value: number;
  label: string;
  labelRo: string;
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
  redFlags: string[];
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
    evidence.push(`${barsNear} baruri/cluburi < 500m (zona zgomotoasa)"`);
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
): { score: number; evidence: string[] } {
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
    evidence.push("Risc ridicat de zgomot nocturn");
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

// ---- Red Flags ----

function computeRedFlags(
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
  dims: { convenience: number; family: number; walkability: number },
): string[] {
  const flags: string[] = [];

  const shops = poisByCategory.supermarket ?? [];
  const schools = poisByCategory.school ?? [];
  const parks = poisByCategory.park ?? [];
  const transport = poisByCategory.transport ?? [];
  const medical = poisByCategory.medical ?? [];

  // Only surface "gaps" when the related dimension score is weak, to avoid false alarms
  // (OSM coverage varies; metro may exist but not be tagged as a bus_stop node nearby).
  if (countWithin(shops, 1200) === 0 && dims.convenience < 48) {
    flags.push(
      "Magazine/farmacii: nu apar mapate in OpenStreetMap in 1.2 km (uneori lipsesc din harta - verifica la fata locului).",
    );
  }
  if (countWithin(transport, 800) === 0) {
    flags.push("0 statii de transport in 800m");
  }
  if (countWithin(schools, 2000) === 0 && dims.family < 52) {
    flags.push(
      "Scoli/gradinite: nu apar mapate in OpenStreetMap in 2 km (poate exista nemapate - confirma la fata locului).",
    );
  }
  if (countWithin(parks, 1200) === 0 && dims.family < 45 && dims.walkability < 55) {
    flags.push(
      "Parcuri/spatii verzi: nu apar mapate in OpenStreetMap in 1.2 km (uneori sunt sub-etichetate).",
    );
  }
  if (countWithin(medical, 2500) === 0 && dims.convenience < 42) {
    flags.push(
      "Unitati medicale: nu apar mapate in OpenStreetMap in 2.5 km (clinici mici pot lipsi din OSM).",
    );
  }

  return flags;
}

// ---- Main API ----

export function computeIntelScores(
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>,
): IntelResult {
  const conv = computeConvenience(poisByCategory);
  const fam = computeFamily(poisByCategory);
  const night = computeNightlifeRisk(poisByCategory);
  const walk = computeWalkability(poisByCategory);
  const redFlags = computeRedFlags(poisByCategory, {
    convenience: conv.score,
    family: fam.score,
    walkability: walk.score,
  });

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
    redFlags,
  };
}
