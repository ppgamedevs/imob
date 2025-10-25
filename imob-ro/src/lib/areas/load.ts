/**
 * Area Pages v2 - Server Data Loader
 *
 * Fetch and compute all data needed for area detail pages.
 */

import { prisma } from "@/lib/db";

import type { AreaKpis, AreaPageData, AreaTilesSummary, ListingSummary, NeighborArea } from "./dto";
import { calculateChange, getValueNDaysAgo, toSeries } from "./series";

/**
 * Load complete area page data (SSR)
 */
export async function loadAreaPage(slug: string): Promise<AreaPageData | null> {
  // Fetch area metadata
  const area = await prisma.area.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      polygon: true,
      stats: true,
    },
  });

  if (!area) return null;

  // Fetch time series (last 365 days)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 365);

  const daily = await prisma.areaDaily.findMany({
    where: {
      areaSlug: slug,
      date: { gte: cutoffDate },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      medianEurM2: true,
      supply: true,
      demandScore: true,
      stats: true,
    },
  });

  // Compute KPIs
  const kpis = await computeKpis(area, daily);

  // Transform series
  const series = toSeries(daily);

  // Load tiles (mini-heatmap)
  const tiles = await loadAreaTiles(slug, area);

  // Load best listings (top 6)
  const best = await loadBestListings(slug);

  // Load neighboring areas
  const neighbors = await loadNeighbors(slug);

  // Load FAQ (static for now)
  const faq = getAreaFaq(area.name);

  return {
    kpis,
    series,
    tiles,
    best,
    neighbors,
    faq,
  };
}

/**
 * Compute area KPIs from metadata and time series
 */
async function computeKpis(
  area: any,
  daily: Array<{
    date: Date;
    medianEurM2?: number | null;
    supply?: number | null;
    demandScore?: number | null;
    stats?: any;
  }>,
): Promise<AreaKpis> {
  const stats = (area.stats as any) || {};
  const series = toSeries(daily);

  // Get latest median €/m²
  const latestEurM2 =
    series
      .slice()
      .reverse()
      .find((s) => s.eurM2 !== undefined)?.eurM2 ?? 0;

  // Calculate 30-day change
  const eurM230DaysAgo = getValueNDaysAgo(series, 30, "eurM2") ?? latestEurM2;
  const change30d = calculateChange(latestEurM2, eurM230DaysAgo);

  // Calculate 12-month change
  const eurM212MonthsAgo = getValueNDaysAgo(series, 365, "eurM2") ?? latestEurM2;
  const change12m = calculateChange(latestEurM2, eurM212MonthsAgo);

  // Get current supply
  const listingsNow = daily[daily.length - 1]?.supply ?? 0;

  // Extract additional metrics from stats
  const medianRentEurM2 = stats.medianRentEurM2;
  const yieldNet = stats.yieldNet;
  const ttsMedianDays = stats.ttsMedianDays;
  const seismicMix = stats.seismicMix;

  return {
    slug: area.slug,
    name: area.name,
    city: area.city,
    population: stats.population,
    listingsNow,
    medianEurM2: Math.round(latestEurM2),
    medianEurM2Change30d: change30d,
    medianEurM2Change12m: change12m,
    medianRentEurM2,
    yieldNet,
    ttsMedianDays,
    seismicMix,
  };
}

/**
 * Load area tiles for mini-heatmap
 */
async function loadAreaTiles(slug: string, area: any): Promise<AreaTilesSummary> {
  // TODO: Implement tile grid generation
  // For now, return a simplified grid based on listings in the area

  // Fetch listings in area
  const analyses = await prisma.analysis.findMany({
    where: {
      status: "done",
      featureSnapshot: {
        features: {
          path: ["areaSlug"],
          equals: slug,
        },
      },
    },
    take: 100,
    include: {
      featureSnapshot: true,
      scoreSnapshot: true,
    },
  });

  // Extract coordinates and prices
  const points = analyses
    .map((a) => {
      const f = (a.featureSnapshot?.features as any) ?? {};
      const s = (a.scoreSnapshot as any) ?? {};
      return {
        lat: f.lat as number | undefined,
        lng: f.lng as number | undefined,
        priceEur: f.priceEur as number | undefined,
        areaM2: f.areaM2 as number | undefined,
      };
    })
    .filter((p) => p.lat && p.lng && p.priceEur && p.areaM2);

  if (points.length === 0) {
    // Return empty grid
    return {
      bounds: [26.0, 44.4, 26.2, 44.5], // Default București bounds
      cells: [],
      metro: [],
      gridSize: { cols: 5, rows: 5, cellSizeM: 500 },
    };
  }

  // Calculate bounds
  const lats = points.map((p) => p.lat!);
  const lngs = points.map((p) => p.lng!);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Create simple grid (5x5)
  const gridSize = { cols: 5, rows: 5, cellSizeM: 500 };
  const cells: AreaTilesSummary["cells"] = [];

  for (let y = 0; y < gridSize.rows; y++) {
    for (let x = 0; x < gridSize.cols; x++) {
      const cellLat = minLat + ((y + 0.5) / gridSize.rows) * (maxLat - minLat);
      const cellLng = minLng + ((x + 0.5) / gridSize.cols) * (maxLng - minLng);

      // Find points in this cell
      const cellPoints = points.filter((p) => {
        const inX =
          p.lng! >= minLng + (x / gridSize.cols) * (maxLng - minLng) &&
          p.lng! < minLng + ((x + 1) / gridSize.cols) * (maxLng - minLng);
        const inY =
          p.lat! >= minLat + (y / gridSize.rows) * (maxLat - minLat) &&
          p.lat! < minLat + ((y + 1) / gridSize.rows) * (maxLat - minLat);
        return inX && inY;
      });

      if (cellPoints.length > 0) {
        const avgEurM2 =
          cellPoints.reduce((sum, p) => {
            const eurM2 = p.priceEur! / p.areaM2!;
            return sum + eurM2;
          }, 0) / cellPoints.length;

        cells.push({
          x,
          y,
          lat: cellLat,
          lng: cellLng,
          eurM2: Math.round(avgEurM2),
          count: cellPoints.length,
        });
      }
    }
  }

  // Load metro stations (TODO: from database)
  const metro: AreaTilesSummary["metro"] = [];

  return {
    bounds: [minLng, minLat, maxLng, maxLat],
    cells,
    metro,
    gridSize,
  };
}

/**
 * Load best listings (top 6: underpriced, high yield, fast TTS)
 */
async function loadBestListings(slug: string): Promise<ListingSummary[]> {
  const analyses = await prisma.analysis.findMany({
    where: {
      status: "done",
      featureSnapshot: {
        features: {
          path: ["areaSlug"],
          equals: slug,
        },
      },
    },
    include: {
      featureSnapshot: true,
      scoreSnapshot: true,
      extractedListing: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50, // Get more to filter and rank
  });

  // Transform and score
  const listings = analyses
    .map((a) => {
      const f = (a.featureSnapshot?.features as any) ?? {};
      const s = (a.scoreSnapshot as any) ?? {};
      const photos = Array.isArray(a.extractedListing?.photos)
        ? (a.extractedListing.photos as string[])
        : [];

      const priceEur = f.priceEur as number | undefined;
      const areaM2 = f.areaM2 as number | undefined;
      if (!priceEur || !areaM2) return null;

      const eurM2 = priceEur / areaM2;
      const priceBadge = s.priceBadge as string | undefined;
      const yieldNet = s.yieldNet as number | undefined;
      const ttsBucket = s.ttsBucket as string | undefined;

      // Calculate score (higher = better)
      let score = 0;
      if (priceBadge === "Underpriced") score += 100;
      if (yieldNet && yieldNet > 0.06) score += 50;
      if (ttsBucket === "fast") score += 30;
      if (ttsBucket === "medium") score += 15;

      return {
        id: a.id,
        groupId: a.groupId || undefined,
        href: `/report/${a.id}`,
        mediaUrl: photos[0],
        priceEur: Math.round(priceEur),
        eurM2: Math.round(eurM2),
        avmBadge: priceBadge === "Underpriced" ? ("under" as const) : undefined,
        tts: ttsBucket === "fast" ? "sub 60 zile" : undefined,
        yieldNet,
        seismic: s.riskClass as string | undefined,
        distMetroM: f.distMetroM as number | undefined,
        areaM2: Math.round(areaM2),
        rooms: (f.rooms as number) ?? 2,
        floor: f.level ? `${f.level}` : undefined,
        yearBuilt: f.yearBuilt as number | undefined,
        areaName: f.areaName || slug,
        title: a.extractedListing?.title || `Apartament ${f.rooms} camere`,
        sourceHost: new URL(a.sourceUrl).hostname,
        score,
      };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  // Sort by score and take top 6
  listings.sort((a, b) => b.score - a.score);
  return listings.slice(0, 6);
}

/**
 * Load neighboring areas for comparison
 */
async function loadNeighbors(slug: string): Promise<NeighborArea[]> {
  // TODO: Implement proper neighbor detection based on polygon adjacency
  // For now, get all areas in same city and pick random 5

  const currentArea = await prisma.area.findUnique({
    where: { slug },
    select: { city: true },
  });

  if (!currentArea) return [];

  const areas = await prisma.area.findMany({
    where: {
      city: currentArea.city,
      slug: { not: slug },
    },
    take: 6,
    select: {
      slug: true,
      name: true,
      stats: true,
    },
  });

  return areas.map((a) => {
    const stats = (a.stats as any) || {};
    return {
      slug: a.slug,
      name: a.name,
      medianEurM2: stats.medianEurM2 ?? 0,
      medianEurM2Change30d: stats.medianEurM2Change30d,
      listingsNow: stats.supply,
    };
  });
}

/**
 * Get static FAQ content for area
 */
function getAreaFaq(areaName: string): Array<{ question: string; answer: string }> {
  return [
    {
      question: `Cum se calculează prețul mediu pe m² în ${areaName}?`,
      answer: `Prețul mediu pe m² este calculat din toate anunțurile active în zonă, folosind metoda mediană pentru a elimina valorile extreme. Actualizăm datele zilnic pentru a reflecta piața în timp real.`,
    },
    {
      question: 'Ce înseamnă "Underpriced" (sub AVM)?',
      answer:
        'Un anunț este marcat "Underpriced" când prețul solicitat este cu cel puțin 10% sub valoarea de piață estimată de modelul nostru AVM (Automated Valuation Model). Aceste proprietăți pot reprezenta oportunități de achiziție.',
    },
    {
      question: "Cum estimați randamentul net?",
      answer:
        "Randamentul net este calculat ca: (Chirie lunară × 12 - Cheltuieli anuale) / Preț achiziție. Cheltuielile includ taxe, întreținere, asigurări și un buffer pentru perioade fără chiriași (8% din venitul anual).",
    },
    {
      question: "Ce este Time-to-Sell (TTS)?",
      answer:
        'TTS reprezintă timpul estimat până la vânzarea unei proprietăți, bazat pe analiza istorică a anunțurilor similare. "Fast TTS" înseamnă sub 60 de zile, "Medium" 60-120 zile, "Slow" peste 120 de zile.',
    },
    {
      question: "Ce înseamnă clasele de risc seismic (RS1, RS2, RS3)?",
      answer:
        'Clasele de risc seismic indică vulnerabilitatea clădirii în caz de cutremur: RS1 (risc ridicat, necesită consolidare urgentă), RS2 (risc mediu), RS3 (risc scăzut). "None" înseamnă că clădirea nu are risc seismic semnificativ sau nu este evaluată.',
    },
    {
      question: "Cât de actuale sunt datele?",
      answer:
        "Datele noastre sunt actualizate zilnic prin crawlere automate care monitorizează principalele portaluri imobiliare din România. Graficele și statisticile reflectă situația din ultimele 24 de ore.",
    },
  ];
}

/**
 * Get all area slugs for static path generation
 */
export async function getAllAreaSlugs(): Promise<string[]> {
  const areas = await prisma.area.findMany({
    where: { city: "București" }, // Only București for now
    select: { slug: true },
  });

  return areas.map((a) => a.slug);
}
