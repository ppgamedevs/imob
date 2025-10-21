import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

import { eurM2, metersBetween, overallScore } from "./similarity";

type Fs = {
  priceEur?: number | null;
  areaM2?: number | null;
  rooms?: number | null;
  yearBuilt?: number | null;
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  areaSlug?: string | null;
};

function inRange(v?: number | null, lo?: number, hi?: number) {
  if (v == null) return false;
  if (lo != null && v < lo) return false;
  if (hi != null && v > hi) return false;
  return true;
}

export async function applyCompsToAnalysis(analysisId: string) {
  // 1) subject
  const A = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: { extractedListing: true, featureSnapshot: true },
  });
  const F = (A?.featureSnapshot?.features ?? {}) as Fs;
  if (!A || !F?.areaM2 || !F.priceEur) return null;

  const refArea = F.areaM2!;
  const refRooms = F.rooms ?? null;
  const refYear = F.yearBuilt ?? null;

  // 2) candidates (last 180 days)
  const since = new Date();
  since.setDate(since.getDate() - 180);
  const candidates = await prisma.analysis.findMany({
    where: { id: { not: analysisId }, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { extractedListing: true, featureSnapshot: true },
  });

  const sameCity = (x: { features?: { features?: unknown } | null }) => {
    const features = x?.features?.features as Record<string, unknown> | undefined;
    const c = features?.city;
    const cityStr = typeof c === "string" ? c : undefined;
    if (!F.city || !cityStr) return true;
    return cityStr.toLowerCase() === F.city.toLowerCase();
  };

  const pool = candidates
    .map((c) => {
      const f = (c.featureSnapshot?.features ?? {}) as Fs;
      const meters = metersBetween({ lat: F.lat, lng: F.lng }, { lat: f.lat, lng: f.lng });
      const price = f.priceEur ?? null;
      const e2 = eurM2(price ?? undefined, f.areaM2 ?? undefined);
      const score = overallScore({
        meters,
        areaRef: refArea,
        area: f.areaM2 ?? undefined,
        roomsRef: refRooms ?? undefined,
        rooms: f.rooms ?? undefined,
        yearRef: refYear ?? undefined,
        year: f.yearBuilt ?? undefined,
      });
      const photosArray = c.extractedListing?.photos;
      const photo =
        Array.isArray(photosArray) && photosArray.length > 0 ? (photosArray[0] as string) : null;

      return {
        id: c.id,
        url: c.sourceUrl,
        title: c.extractedListing?.title ?? null,
        photo,
        lat: f.lat ?? null,
        lng: f.lng ?? null,
        meters: meters ?? null,
        priceEur: price,
        areaM2: f.areaM2 ?? null,
        rooms: f.rooms ?? null,
        yearBuilt: f.yearBuilt ?? null,
        eurM2: e2,
        score,
        city: f.city,
      };
    })
    .filter((x) => x.priceEur && x.areaM2 && x.eurM2)
    .filter((x) => sameCity({ features: { features: x } }))
    .filter((x) => x.meters == null || x.meters <= 2500)
    .filter((x) => inRange(x.areaM2, refArea * 0.7, refArea * 1.3))
    .filter((x) => !refRooms || !x.rooms || Math.abs((refRooms ?? 0) - (x.rooms ?? 0)) <= 1)
    .sort((a, b) => b.score! - a.score!);

  const top = pool.slice(0, 12);

  // 3) write CompMatch
  await prisma.compMatch.deleteMany({ where: { analysisId } });
  if (top.length) {
    await prisma.compMatch.createMany({
      data: top.map((c) => ({
        analysisId,
        compId: c.id,
        sourceUrl: c.url ?? undefined,
        title: c.title ?? undefined,
        photo: c.photo ?? undefined,
        lat: c.lat ?? undefined,
        lng: c.lng ?? undefined,
        distanceM: c.meters ? Math.round(c.meters) : null,
        priceEur: c.priceEur ?? undefined,
        areaM2: c.areaM2 ?? undefined,
        rooms: c.rooms ?? undefined,
        yearBuilt: c.yearBuilt ?? undefined,
        eurM2: c.eurM2 ?? undefined,
        score: Number((c.score ?? 0).toFixed(3)),
      })),
      skipDuplicates: true,
    });
  }

  // 4) stats → ScoreSnapshot.explain.comps
  const eurM2s = top.map((c) => c.eurM2!).sort((a, b) => a - b);
  const median = eurM2s.length ? eurM2s[Math.floor(eurM2s.length / 2)] : null;
  const q1 = eurM2s.length ? eurM2s[Math.floor(eurM2s.length / 4)] : null;
  const q3 = eurM2s.length ? eurM2s[Math.floor((eurM2s.length * 3) / 4)] : null;

  await prisma.scoreSnapshot.upsert({
    where: { analysisId },
    update: {
      explain: { comps: { count: top.length, eurM2: { median, q1, q3 } } } as Prisma.JsonObject,
    },
    create: {
      analysisId,
      explain: { comps: { count: top.length, eurM2: { median, q1, q3 } } } as Prisma.JsonObject,
    },
  });

  return { count: top.length, medianEurM2: median };
}
