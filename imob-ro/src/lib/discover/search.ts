import { prisma } from "@/lib/db";
import { parsePageSize, getTakePlusOne } from "@/lib/pagination";

import { discoverSchema } from "./validate";

function n(x: unknown): number | undefined {
  return typeof x === "number" ? x : undefined;
}

export async function discoverSearch(raw: URLSearchParams) {
  const parsed = discoverSchema.safeParse(Object.fromEntries(raw));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten().fieldErrors };
  }
  const p = parsed.data;
  const take = parsePageSize(p.pageSize); // Cap at 50

  // Merge compound params (price, eurm2, m2, year, metro, areas, rooms)
  const filters = {
    areas: p.areas || p.area || undefined,
    priceMin: p.price?.min || p.priceMin,
    priceMax: p.price?.max || p.priceMax,
    eurm2Min: p.eurm2?.min || p.eurm2Min,
    eurm2Max: p.eurm2?.max || p.eurm2Max,
    m2Min: p.m2?.min || p.m2Min,
    m2Max: p.m2?.max || p.m2Max,
    rooms: p.rooms,
    roomsMin: p.roomsMin,
    roomsMax: p.roomsMax,
    yearMin: p.year?.min || p.yearMin,
    yearMax: p.year?.max || p.yearMax,
    metroMaxM: p.metro || p.metroMaxM,
    signals: p.signals,
    underpriced: p.underpriced,
    sort: p.sort,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}; // v1: afișăm toate analizele din DB (București filtrat în JS)

  const cursor = p.cursor ? { id: p.cursor } : undefined;

  const list = await prisma.analysis.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      featureSnapshot: true,
      scoreSnapshot: true,
      extractedListing: true,
      trustSnapshot: true,
      group: {
        include: {
          snapshots: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    take: getTakePlusOne(take), // take + 1 pattern
    ...(cursor ? { skip: 1, cursor } : {}),
  });

  const rows = list
    .map((a) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const f = (a.featureSnapshot?.features ?? {}) as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = a.scoreSnapshot as any;
      const photos = Array.isArray(a.extractedListing?.photos)
        ? (a.extractedListing?.photos as string[])
        : [];
      const priceEur = n(f?.priceEur);
      const areaM2 = n(f?.areaM2);
      const eurm2 = priceEur && areaM2 ? priceEur / areaM2 : undefined;

      // Extract trust data
      const trustScore = a.trustSnapshot?.score ?? null;
      const trustBadge = a.trustSnapshot?.badge ?? null;
      const trustReasons = (a.trustSnapshot?.reasons as { minus?: string[] }) ?? null;
      const flags = trustReasons?.minus ?? [];

      // Get source count from group snapshot (Day 26)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const groupSnapshot = (a.group as any)?.snapshots?.[0];
      const sourceCount = groupSnapshot?.sources ?? null;
      const dupCount = sourceCount && sourceCount > 1 ? sourceCount - 1 : 0;

      return {
        id: a.id,
        url: a.sourceUrl || null,
        title: a.extractedListing?.title ?? null,
        photo: photos[0] ?? null,
        createdAt: a.createdAt,
        priceEur,
        areaM2,
        rooms: n(f?.rooms),
        level: n(f?.level),
        yearBuilt: n(f?.yearBuilt),
        distMetroM: n(f?.distMetroM),
        city: f?.city ?? null,
        areaSlug: f?.areaSlug ?? null,
        eurm2,
        priceBadge: s?.priceBadge ?? null,
        avmMid: n(s?.avmMid),
        lat: n(f?.lat),
        lng: n(f?.lng),
        groupId: a.groupId || null,
        trustScore,
        trustBadge,
        flags,
        dupCount,
        ttsBucket: s?.ttsBucket ?? null,
        yieldNet: n(s?.yieldNet),
        riskClass: s?.riskClass ?? null,
      };
    })
    // Bucharest-only (dacă city e setat)
    .filter((r) => !r.city || r.city.toLowerCase() === "bucurești")
    // area slugs (support multiple areas)
    .filter((r) => !filters.areas || !r.areaSlug || filters.areas.includes(r.areaSlug))
    // numeric filters
    .filter((r) => filters.priceMin == null || (r.priceEur ?? 0) >= filters.priceMin!)
    .filter((r) => filters.priceMax == null || (r.priceEur ?? 0) <= filters.priceMax!)
    .filter((r) => filters.m2Min == null || (r.areaM2 ?? 0) >= filters.m2Min!)
    .filter((r) => filters.m2Max == null || (r.areaM2 ?? 0) <= filters.m2Max!)
    // Rooms (support multiple values: [2,3])
    .filter((r) => {
      if (filters.rooms && filters.rooms.length > 0) {
        return filters.rooms.includes(r.rooms ?? 0);
      }
      if (filters.roomsMin != null && (r.rooms ?? 0) < filters.roomsMin) return false;
      if (filters.roomsMax != null && (r.rooms ?? 0) > filters.roomsMax) return false;
      return true;
    })
    .filter((r) => filters.yearMin == null || (r.yearBuilt ?? 0) >= filters.yearMin!)
    .filter((r) => filters.yearMax == null || (r.yearBuilt ?? 0) <= filters.yearMax!)
    .filter((r) => filters.metroMaxM == null || (r.distMetroM ?? 1e9) <= filters.metroMaxM!)
    .filter((r) => filters.eurm2Min == null || (r.eurm2 ?? 0) >= filters.eurm2Min!)
    .filter((r) => filters.eurm2Max == null || (r.eurm2 ?? 0) <= filters.eurm2Max!)
    // Signals filters
    .filter((r) => {
      if (!filters.signals || filters.signals.length === 0) return true;
      
      for (const signal of filters.signals) {
        if (signal === 'underpriced' && r.priceBadge !== 'Underpriced') return false;
        if (signal === 'fast_tts' && !['fast', 'medium'].includes(r.ttsBucket || '')) return false;
        if (signal === 'yield_high' && (r.yieldNet ?? 0) < 0.06) return false;
        if (signal === 'seismic_low' && !['none', 'RS3'].includes(r.riskClass || '')) return false;
      }
      
      return true;
    })
    // Legacy underpriced filter
    .filter((r) => !filters.underpriced || r.priceBadge === "Underpriced");

  // Apply sorting
  if (filters.sort) {
    rows.sort((a, b) => {
      switch (filters.sort) {
        case 'price_asc':
          return (a.priceEur ?? 0) - (b.priceEur ?? 0);
        case 'price_desc':
          return (b.priceEur ?? 0) - (a.priceEur ?? 0);
        case 'eurm2_asc':
          return (a.eurm2 ?? 0) - (b.eurm2 ?? 0);
        case 'eurm2_desc':
          return (b.eurm2 ?? 0) - (a.eurm2 ?? 0);
        case 'yield_desc':
          return (b.yieldNet ?? 0) - (a.yieldNet ?? 0);
        case 'tts_asc':
          // Fast < Medium < Slow
          const ttsOrder: Record<string, number> = { fast: 1, medium: 2, slow: 3 };
          return (ttsOrder[a.ttsBucket || ''] ?? 999) - (ttsOrder[b.ttsBucket || ''] ?? 999);
        default:
          return 0; // relevance = default order
      }
    });
  }

  // Day 26: Collapse by groupId (show 1 per group, pick most recent)
  const grouped = new Map<string, (typeof rows)[0]>();
  for (const r of rows) {
    const key = r.groupId || r.id; // Use groupId if available, else unique per item
    if (!grouped.has(key)) {
      grouped.set(key, r);
    }
  }
  const collapsed = Array.from(grouped.values());

  const hasNext = collapsed.length > take;
  const items = collapsed.slice(0, take);
  const nextCursor = hasNext ? items[items.length - 1]?.id : null;

  return { ok: true as const, items, nextCursor, countApprox: collapsed.length };
}
