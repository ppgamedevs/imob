import { revalidateGroup } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";

import { canonicalSignature, fuzzyScore } from "./similarity";
import { rebuildGroupSnapshot } from "./snapshot";

export async function attachToGroup(analysisId: string) {
  const a = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: {
      featureSnapshot: true,
      extractedListing: true,
      scoreSnapshot: true,
      photoAssets: true,
      sights: { take: 1, orderBy: { seenAt: "desc" } },
    },
  });
  if (!a) return;

  const f: any = a.featureSnapshot?.features ?? {};
  const sig = canonicalSignature({
    lat: f.lat,
    lng: f.lng,
    areaM2: f.areaM2,
    priceEur: f.priceEur,
    level: f.level,
    yearBuilt: f.yearBuilt,
  });

  // 1) If we have deterministic signature => find or create group
  if (sig) {
    const found = await prisma.dedupGroup
      .findUnique({ where: { signature: sig } })
      .catch(() => null);
    const g =
      found ??
      (await prisma.dedupGroup.create({
        data: {
          signature: sig,
          city: f.city ?? null,
          areaSlug: f.areaSlug ?? null,
          centroidLat: f.lat ?? null,
          centroidLng: f.lng ?? null,
        },
      }));
    await prisma.analysis.update({ where: { id: a.id }, data: { groupId: g.id } });
    await prisma.dedupEdge.upsert({
      where: { groupId_analysisId: { groupId: g.id, analysisId: a.id } },
      update: { score: 1, reason: { type: "signature" } as any },
      create: { groupId: g.id, analysisId: a.id, score: 1, reason: { type: "signature" } as any },
    });
    await rebuildGroupSnapshot(g.id).catch((e) => console.warn("snapshot failed", e));
    await revalidateGroup(g.id); // Invalidate cache for this group
    return;
  }

  // 2) Fallback fuzzy: search recent candidates in same city/area
  const candidates = await prisma.analysis.findMany({
    where: {
      id: { not: a.id },
      groupId: { not: null },
      createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45) }, // 45 days
    },
    include: {
      featureSnapshot: true,
      extractedListing: true,
      scoreSnapshot: true,
      photoAssets: true,
      sights: { take: 1, orderBy: { seenAt: "desc" } },
    },
    take: 80,
    orderBy: { createdAt: "desc" },
  });

  let best: { id: string; groupId: string; score: number; reasons: any } | null = null;
  for (const c of candidates) {
    const { score, reasons } = fuzzyScore(
      {
        features: a.featureSnapshot,
        extracted: a.extractedListing,
        photos: a.photoAssets,
        sight: a.sights?.[0],
      },
      {
        features: c.featureSnapshot,
        extracted: c.extractedListing,
        photos: c.photoAssets,
        sight: c.sights?.[0],
      },
    );
    if (!best || score > best.score) best = { id: c.id, groupId: c.groupId!, score, reasons };
  }

  if (best && best.score >= 0.7) {
    await prisma.analysis.update({ where: { id: a.id }, data: { groupId: best.groupId } });
    await prisma.dedupEdge.upsert({
      where: { groupId_analysisId: { groupId: best.groupId, analysisId: a.id } },
      update: { score: best.score, reason: best.reasons as any },
      create: {
        groupId: best.groupId,
        analysisId: a.id,
        score: best.score,
        reason: best.reasons as any,
      },
    });
    await rebuildGroupSnapshot(best.groupId).catch((e) => console.warn("snapshot failed", e));
    await revalidateGroup(best.groupId); // Invalidate cache for this group
    return;
  }

  // 3) No good match — create own adhoc group
  const g = await prisma.dedupGroup.create({
    data: {
      signature: `adhoc:${a.id}`,
      city: f.city ?? null,
      areaSlug: f.areaSlug ?? null,
      centroidLat: f.lat ?? null,
      centroidLng: f.lng ?? null,
    },
  });
  await prisma.analysis.update({ where: { id: a.id }, data: { groupId: g.id } });
  await prisma.dedupEdge.create({
    data: { groupId: g.id, analysisId: a.id, score: 0.5, reason: { type: "adhoc" } as any },
  });
  await rebuildGroupSnapshot(g.id).catch((e) => console.warn("snapshot failed", e));
  await revalidateGroup(g.id); // Invalidate cache for this group
}
