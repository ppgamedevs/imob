import { prisma } from "@/lib/db";

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
  const take = p.pageSize ?? 20;

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
    take: take + 1,
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
      };
    })
    // Bucharest-only (dacă city e setat)
    .filter((r) => !r.city || r.city.toLowerCase() === "bucurești")
    // area slugs
    .filter((r) => !p.area || (r.areaSlug && p.area.includes(r.areaSlug)))
    // numeric filters
    .filter((r) => p.priceMin == null || (r.priceEur ?? 0) >= p.priceMin!)
    .filter((r) => p.priceMax == null || (r.priceEur ?? 0) <= p.priceMax!)
    .filter((r) => p.m2Min == null || (r.areaM2 ?? 0) >= p.m2Min!)
    .filter((r) => p.m2Max == null || (r.areaM2 ?? 0) <= p.m2Max!)
    .filter((r) => p.roomsMin == null || (r.rooms ?? 0) >= p.roomsMin!)
    .filter((r) => p.roomsMax == null || (r.rooms ?? 0) <= p.roomsMax!)
    .filter((r) => p.yearMin == null || (r.yearBuilt ?? 0) >= p.yearMin!)
    .filter((r) => p.yearMax == null || (r.yearBuilt ?? 0) <= p.yearMax!)
    .filter((r) => p.metroMaxM == null || (r.distMetroM ?? 1e9) <= p.metroMaxM!)
    .filter((r) => p.eurm2Min == null || (r.eurm2 ?? 0) >= p.eurm2Min!)
    .filter((r) => p.eurm2Max == null || (r.eurm2 ?? 0) <= p.eurm2Max!)
    .filter((r) => !p.underpriced || r.priceBadge === "Underpriced");

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

  return { ok: true as const, items, nextCursor };
}
