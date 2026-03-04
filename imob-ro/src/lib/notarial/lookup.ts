import { prisma } from "@/lib/db";

export interface NotarialLookupResult {
  eurPerM2: number;
  maxEurPerM2: number | null;
  totalValue: number;
  totalValueMax: number | null;
  zone: string;
  year: number;
  source: string | null;
}

const NEIGHBORHOOD_ALIASES: Record<string, string[]> = {
  Crangasi: ["Crangasi", "Crângași", "Crangași"],
  Herastrau: ["Herastrau", "Herăstrău", "Herastrau Nord", "Herastru"],
  Floreasca: ["Floreasca", "Florească"],
  Dorobanti: ["Dorobanti", "Dorobanți", "Dorobantilor", "Dorobanți"],
  Baneasa: ["Baneasa", "Băneasa", "Baneasa Nord", "Baneasa Sud"],
  Titan: ["Titan", "Baba Novac", "Baba novac"],
  Tineretului: ["Tineretului", "Timpuri Noi"],
  Unirii: ["Unirii", "Piata Unirii", "Piața Unirii"],
  Cotroceni: ["Cotroceni", "Eroilor"],
  Militari: ["Militari", "Militari Residence", "Militari Residence"],
  Aviatorilor: ["Aviatorilor", "Piata Aviatorilor", "Piața Aviatorilor"],
  Primaverii: ["Primaverii", "Primăverii"],
  Colentina: ["Colentina", "Fundeni"],
  Iancului: ["Iancului", "Piata Iancului", "Piața Iancului"],
  Obor: ["Obor", "Piata Obor", "Piața Obor"],
  Pantelimon: ["Pantelimon", "Delfinului"],
  Tei: ["Tei", "Lacul Tei", "Circului"],
  Mosilor: ["Mosilor", "Moșilor", "Calea Mosilor"],
  Dristor: ["Dristor", "Piata Muncii", "Mihai Bravu"],
  "Balta Alba": ["Balta Alba", "Balta Albă", "Ozana"],
  Vitan: ["Vitan", "Vitan Barzesti"],
  Dudesti: ["Dudesti", "Dudești"],
  Berceni: ["Berceni", "Piata Sudului"],
  "Aparatorii Patriei": ["Aparatorii Patriei", "Aparatorii", "Apărătorii Patriei", "Apărătorii"],
  Brancoveanu: ["Brancoveanu", "Brâncoveanu"],
  Oltenitei: ["Oltenitei", "Oltenței", "Calea Oltenitei"],
  "Piata Sudului": ["Piata Sudului", "Piața Sudului"],
  Progresul: ["Progresul"],
  Rahova: ["Rahova", "Calea Rahovei"],
  "13 Septembrie": ["13 Septembrie"],
  Ferentari: ["Ferentari"],
  Sebastian: ["Sebastian", "Calea Sebastian"],
  Ghencea: ["Ghencea"],
  Panduri: ["Panduri"],
  "Drumul Taberei": ["Drumul Taberei"],
  Lujerului: ["Lujerului", "Politehnica"],
  Pacii: ["Pacii", "Păcii"],
  Virtutii: ["Virtutii", "Virtuții"],
  Gorjului: ["Gorjului"],
  "Bucurestii Noi": ["Bucurestii Noi", "Bucureștii Noi"],
  Chitila: ["Chitila"],
  Pajura: ["Pajura", "Păjura"],
  Domenii: ["Domenii"],
  Kisseleff: ["Kisseleff", "Kiseleff"],
  Victoriei: ["Victoriei", "Piata Victoriei", "Piața Victoriei"],
  "1 Decembrie": ["1 Decembrie"],
  "Splaiul Unirii": ["Splaiul Unirii"],
  Baicului: ["Baicului", "Băicului"],
  Andronache: ["Andronache"],
  Apusului: ["Apusului"],
  Giulesti: ["Giulesti", "Giulești"],
};

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeNeighborhood(name: string): string {
  const lower = stripDiacritics(name.toLowerCase().trim());
  for (const [canonical, aliases] of Object.entries(NEIGHBORHOOD_ALIASES)) {
    if (aliases.some((a) => stripDiacritics(a.toLowerCase()) === lower)) {
      return canonical;
    }
  }
  return name.trim();
}

function extractSectorFromAddress(address: string): number | null {
  const norm = stripDiacritics(address.toLowerCase());
  const patterns = [
    /sector(?:ul)?\s*(\d)/i,
    /\bsect\.?\s*(\d)/i,
    /\bS(\d)\b/,
    /\bsector\s*(\d)/i,
    /,\s*(\d)\s*$/,
  ];
  for (const p of patterns) {
    const m = norm.match(p);
    if (m) {
      const s = Number(m[1]);
      if (s >= 1 && s <= 6) return s;
    }
  }
  return null;
}

function extractNeighborhoodFromAddress(address: string): string | null {
  const norm = stripDiacritics(address.toLowerCase());
  for (const [canonical, aliases] of Object.entries(NEIGHBORHOOD_ALIASES)) {
    for (const alias of aliases) {
      if (norm.includes(stripDiacritics(alias.toLowerCase()))) {
        return canonical;
      }
    }
  }
  return null;
}

function extractNeighborhoodFromSlug(areaSlug: string | null): string | null {
  if (!areaSlug) return null;
  const parts = areaSlug.split("-").filter(Boolean);
  const sectorIdx = parts.findIndex((p) => /^sector$/i.test(p));
  if (sectorIdx >= 0 && sectorIdx + 1 < parts.length) {
    const after = parts.slice(sectorIdx + 2);
    if (after.length > 0) {
      return after.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  }
  const bucIdx = parts.findIndex((p) => /^bucuresti$/i.test(p));
  if (bucIdx >= 0) {
    const after = parts.slice(bucIdx + 1);
    if (after.length > 0) {
      return after.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  }
  return null;
}

export async function lookupNotarialGrid(params: {
  areaM2: number;
  sector?: number | null;
  neighborhood?: string | null;
  areaSlug?: string | null;
  addressRaw?: string | null;
  propertyType?: string;
  year?: number;
}): Promise<NotarialLookupResult | null> {
  const propType = params.propertyType ?? "apartment";
  const year = params.year ?? new Date().getFullYear();

  let sector = params.sector ?? null;
  let neighborhood = params.neighborhood ?? null;

  if (!neighborhood && params.areaSlug) {
    neighborhood = extractNeighborhoodFromSlug(params.areaSlug);
  }
  if (!neighborhood && params.addressRaw) {
    neighborhood = extractNeighborhoodFromAddress(params.addressRaw);
  }
  if (!sector && params.addressRaw) {
    sector = extractSectorFromAddress(params.addressRaw);
  }
  if (!sector && params.areaSlug) {
    const m = params.areaSlug.match(/sector-?(\d)/i);
    if (m) sector = Number(m[1]);
  }

  if (neighborhood) {
    neighborhood = normalizeNeighborhood(neighborhood);
  }

  // Strategy 1: match by neighborhood (most precise)
  if (neighborhood) {
    const match = await prisma.notarialGrid.findFirst({
      where: {
        neighborhood: { equals: neighborhood, mode: "insensitive" },
        propertyType: propType,
        year: { lte: year },
      },
      orderBy: { year: "desc" },
    });
    if (match) {
      return buildResult(match, params.areaM2);
    }
  }

  // Strategy 2: match by sector (fallback)
  if (sector) {
    const matches = await prisma.notarialGrid.findMany({
      where: {
        sector,
        propertyType: propType,
        year: { lte: year },
      },
      orderBy: { year: "desc" },
    });

    if (matches.length > 0) {
      const latestYear = matches[0].year;
      const sameYear = matches.filter((m) => m.year === latestYear);
      const avgMin = sameYear.reduce((s, m) => s + m.minEurPerM2, 0) / sameYear.length;
      const withMax = sameYear.filter((m) => m.maxEurPerM2 != null);
      const avgMax = withMax.length
        ? withMax.reduce((s, m) => s + (m.maxEurPerM2 ?? 0), 0) / withMax.length
        : null;

      return {
        eurPerM2: Math.round(avgMin),
        maxEurPerM2: avgMax ? Math.round(avgMax) : null,
        totalValue: Math.round(avgMin * params.areaM2),
        totalValueMax: avgMax ? Math.round(avgMax * params.areaM2) : null,
        zone: `Sector ${sector} (medie)`,
        year: latestYear,
        source: sameYear[0].source,
      };
    }
  }

  return null;
}

function buildResult(
  grid: { minEurPerM2: number; maxEurPerM2: number | null; zone: string; year: number; source: string | null },
  areaM2: number,
): NotarialLookupResult {
  return {
    eurPerM2: grid.minEurPerM2,
    maxEurPerM2: grid.maxEurPerM2,
    totalValue: Math.round(grid.minEurPerM2 * areaM2),
    totalValueMax: grid.maxEurPerM2 ? Math.round(grid.maxEurPerM2 * areaM2) : null,
    zone: grid.zone,
    year: grid.year,
    source: grid.source,
  };
}
