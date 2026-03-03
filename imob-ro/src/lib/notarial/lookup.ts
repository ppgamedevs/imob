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
  Crangasi: ["Crangasi", "Crângași"],
  Herastrau: ["Herastrau", "Herăstrău", "Herastrau Nord"],
  Floreasca: ["Floreasca", "Florească"],
  Dorobanti: ["Dorobanti", "Dorobanți", "Dorobantilor"],
  Baneasa: ["Baneasa", "Băneasa"],
  Titan: ["Titan", "Baba Novac"],
  Tineretului: ["Tineretului", "Timpuri Noi"],
  Unirii: ["Unirii", "Piata Unirii"],
  Cotroceni: ["Cotroceni", "Eroilor"],
  Militari: ["Militari", "Militari Residence"],
  Aviatorilor: ["Aviatorilor", "Piata Aviatorilor"],
  Primaverii: ["Primaverii", "Primăverii"],
};

function normalizeNeighborhood(name: string): string {
  const lower = name.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(NEIGHBORHOOD_ALIASES)) {
    if (aliases.some((a) => a.toLowerCase() === lower)) {
      return canonical;
    }
  }
  return name.trim();
}

function extractSectorFromAddress(address: string): number | null {
  const m = address.match(/sector(?:ul)?\s*(\d)/i);
  if (m) return Number(m[1]);
  const m2 = address.match(/\bS(\d)\b/);
  if (m2) return Number(m2[1]);
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
