/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Day 26 - GroupSnapshot Builder
 * Computes canonical "current" state of a dedup group
 */

import { prisma } from "@/lib/db";

export async function rebuildGroupSnapshot(groupId: string) {
  // Fetch all analyses in this group with their features
  const edges = await prisma.dedupEdge.findMany({
    where: { groupId },
    include: {
      analysis: {
        include: {
          featureSnapshot: true,
          extractedListing: true,
          scoreSnapshot: true,
        },
      },
    } as any,
  });

  if (!edges.length) return;

  // Build candidate rows for canonical selection
  const rows = edges.map((edge) => {
    const a = (edge as any).analysis;
    const f = a?.featureSnapshot?.features ?? {};
    const extracted = a?.extractedListing ?? {};

    // Completeness score (more fields = better canonical candidate)
    const completeness =
      (f.priceEur ? 1 : 0) +
      (f.areaM2 ? 1 : 0) +
      (f.rooms ? 1 : 0) +
      (f.yearBuilt ? 1 : 0) +
      (f.lat && f.lng ? 1 : 0) +
      (extracted.title ? 1 : 0);

    // Extract domain from sourceUrl
    let domain = "unknown";
    try {
      if (a.sourceUrl) {
        const url = new URL(a.sourceUrl);
        domain = url.hostname.replace(/^www\./, "");
      }
    } catch {
      // ignore
    }

    return {
      id: a.id,
      title: extracted.title ?? null,
      priceEur: f.priceEur ?? null,
      areaM2: f.areaM2 ?? null,
      rooms: f.rooms ?? null,
      floorRaw: f.floorRaw ?? null,
      yearBuilt: f.yearBuilt ?? null,
      lat: f.lat ?? null,
      lng: f.lng ?? null,
      photo: Array.isArray(extracted.photos) ? extracted.photos[0] : null,
      createdAt: a.createdAt,
      completeness,
      domain,
      sourceUrl: a.sourceUrl ?? "",
    };
  });

  // Sort by completeness (desc), then recency (desc)
  rows.sort((a, b) => b.completeness - a.completeness || +b.createdAt - +a.createdAt);

  // Pick canonical (most complete & recent)
  const canonical = rows[0];

  // Compute aggregates
  const prices = rows.map((r) => r.priceEur).filter((p): p is number => p != null);
  const priceMin = prices.length ? Math.min(...prices) : null;
  const priceMax = prices.length ? Math.max(...prices) : null;
  const domains = Array.from(new Set(rows.map((r) => r.domain).filter(Boolean)));
  const sources = domains.length;

  // Create snapshot
  await prisma.groupSnapshot.create({
    data: {
      groupId,
      title: canonical.title,
      priceEur: canonical.priceEur,
      areaM2: canonical.areaM2,
      rooms: canonical.rooms,
      floorRaw: canonical.floorRaw,
      yearBuilt: canonical.yearBuilt,
      lat: canonical.lat,
      lng: canonical.lng,
      photo: canonical.photo,
      domains: domains as any,
      priceMin,
      priceMax,
      sources,
      explain: {
        picked: canonical.id,
        sampleCount: rows.length,
        completeness: canonical.completeness,
      } as any,
    },
  });

  // Update group itemCount and centroid
  await prisma.dedupGroup.update({
    where: { id: groupId },
    data: {
      itemCount: edges.length,
      centroidLat: canonical.lat ?? undefined,
      centroidLng: canonical.lng ?? undefined,
    },
  });
}

/**
 * Get latest snapshot for a group
 */
export async function getGroupSnapshot(groupId: string) {
  return prisma.groupSnapshot.findFirst({
    where: { groupId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get all source URLs in a group
 */
export async function getGroupSources(groupId: string) {
  const edges = await prisma.dedupEdge.findMany({
    where: { groupId },
    include: {
      analysis: {
        select: {
          id: true,
          sourceUrl: true,
          createdAt: true,
        },
      },
    } as any,
  });

  return edges.map((edge) => {
    const a = (edge as any).analysis;
    let domain = "unknown";
    try {
      if (a.sourceUrl) {
        const url = new URL(a.sourceUrl);
        domain = url.hostname.replace(/^www\./, "");
      }
    } catch {
      // ignore
    }

    return {
      analysisId: a.id,
      sourceUrl: a.sourceUrl ?? "",
      domain,
      createdAt: a.createdAt,
    };
  });
}
