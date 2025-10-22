/**
 * Loads zone data for SEO page.
 * Fetches Area, AreaDaily (90 days), top listings (collapsed by groupId).
 */
import { prisma } from "@/lib/db";

interface ZoneKpi {
  pricePerSqm: number | null;
  supply: number;
}

interface HistogramBucket {
  bucket: number;
  count: number;
}

interface DailyPoint {
  date: Date;
  pricePerSqm: number | null;
  supply: number;
}

interface ZoneItem {
  id: string;
  title: string | null;
  priceEur: number | null;
  areaM2: number | null;
  lat: number | null;
  lng: number | null;
  photos: { src: string }[];
}

export interface ZoneData {
  area: {
    id: string;
    name: string;
    city: string;
    slug: string;
    polygon: unknown;
    stats: unknown;
  };
  daily: DailyPoint[];
  kpi: ZoneKpi;
  items: ZoneItem[];
  histogram: HistogramBucket[];
  ttsMode: number | null;
}

export async function loadZone(slug: string): Promise<ZoneData | null> {
  const area = await prisma.area.findUnique({ where: { slug } });
  if (!area) return null;

  // Last 120 days of daily stats
  const rawDaily = await prisma.areaDaily.findMany({
    where: { areaSlug: slug },
    orderBy: { date: "asc" },
    take: 120,
  });

  const daily: DailyPoint[] = rawDaily.map((d) => ({
    date: d.date,
    pricePerSqm: d.medianEurM2,
    supply: d.supply ?? 0,
  }));

  // Latest KPIs
  const today = daily[daily.length - 1];
  const kpi: ZoneKpi = {
    pricePerSqm: today?.pricePerSqm ?? null,
    supply: today?.supply ?? 0,
  };

  // Top listings (collapse duplicates by groupId)
  const analyses = await prisma.analysis.findMany({
    where: {
      featureSnapshot: { isNot: null },
    },
    include: {
      featureSnapshot: true,
      scoreSnapshot: true,
      extractedListing: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const rows = analyses
    .map((a) => {
      const f = (a.featureSnapshot?.features ?? {}) as Record<string, unknown>;
      if (f.areaSlug !== slug) return null;

      const s = (a.scoreSnapshot ?? {}) as Record<string, unknown>;
      const photos = Array.isArray(a.extractedListing?.photos)
        ? (a.extractedListing?.photos as { src: string }[])
        : [];
      const priceEur = typeof f.priceEur === "number" ? f.priceEur : null;
      const areaM2 = typeof f.areaM2 === "number" ? f.areaM2 : null;
      const eurm2 = priceEur && areaM2 ? priceEur / areaM2 : null;

      return {
        id: a.id,
        groupId: a.groupId ?? a.id,
        title: a.extractedListing?.title ?? null,
        url: a.sourceUrl ?? null,
        photo: photos[0] ?? null,
        priceEur,
        areaM2,
        eurm2,
        rooms: typeof f.rooms === "number" ? f.rooms : null,
        yearBuilt: typeof f.yearBuilt === "number" ? f.yearBuilt : null,
        lat: typeof f.lat === "number" ? f.lat : null,
        lng: typeof f.lng === "number" ? f.lng : null,
        priceBadge: typeof s.priceBadge === "string" ? s.priceBadge : null,
        ttsBucket: typeof s.ttsBucket === "string" ? s.ttsBucket : null,
        createdAt: a.createdAt,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Collapse by groupId (take first from each group)
  const grouped = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.groupId;
    const arr = grouped.get(key) ?? [];
    arr.push(r);
    grouped.set(key, arr);
  }
  const items: ZoneItem[] = Array.from(grouped.values())
    .map((g) => {
      const first = g[0];
      return {
        id: first.id,
        title: first.title,
        priceEur: first.priceEur,
        areaM2: first.areaM2,
        lat: first.lat,
        lng: first.lng,
        photos: first.photo ? [{ src: first.photo.src }] : [],
      };
    })
    .slice(0, 24);

  // Histogram bins (€/m²)
  const binSize = 100;
  const hist = new Map<number, number>();
  for (const it of items) {
    if (!it.priceEur || !it.areaM2) continue;
    const eurm2 = it.priceEur / it.areaM2;
    const b = Math.round(eurm2 / binSize) * binSize;
    hist.set(b, (hist.get(b) ?? 0) + 1);
  }
  const histogram: HistogramBucket[] = Array.from(hist.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, count]) => ({ bucket, count }));

  // TTS mode (most common bucket)
  const ttsVec = items
    .map((i) => {
      const raw = rows.find((r) => r.id === i.id);
      return raw?.ttsBucket;
    })
    .filter((x): x is string => !!x);
  const ttsMode = ttsVec.length ? parseFloat(mode(ttsVec)) : null;

  return { area, daily, kpi, items, histogram, ttsMode };
}

/**
 * Finds most common value in array.
 */
function mode(arr: string[]): string {
  const m = new Map<string, number>();
  for (const v of arr) m.set(v, (m.get(v) ?? 0) + 1);
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1])[0][0];
}
