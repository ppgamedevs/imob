/**
 * Day 26 - GroupSnapshot Builder
 * Computes canonical "current" state of a dedup group
 */

import { prisma } from "@/lib/db";

export async function rebuildGroupSnapshot(groupId: string) {
  // DedupEdge has analysisId but no Prisma relation to Analysis (only group FK) — load analyses in a second query.
  const edges = await prisma.dedupEdge.findMany({
    where: { groupId },
  });

  if (!edges.length) return;

  const analysisIds = [...new Set(edges.map((e) => e.analysisId))];
  const analyses = await prisma.analysis.findMany({
    where: { id: { in: analysisIds } },
    include: {
      featureSnapshot: true,
      extractedListing: true,
      scoreSnapshot: true,
    },
  });
  const analysisById = new Map(analyses.map((a) => [a.id, a]));

  // Build candidate rows for canonical selection
  const rows = edges.map((edge) => {
    const a = analysisById.get(edge.analysisId);
    if (!a) return null;
    const f = (a.featureSnapshot?.features ?? {}) as Record<string, unknown>;
    const extracted = (a.extractedListing ?? {}) as Record<string, unknown>;

    const title = typeof extracted.title === "string" ? extracted.title : null;
    const priceEur = typeof f.priceEur === "number" ? f.priceEur : null;
    const areaM2 = typeof f.areaM2 === "number" ? f.areaM2 : null;
    const rooms = typeof f.rooms === "number" ? f.rooms : null;
    const floorRaw = typeof f.floorRaw === "string" ? f.floorRaw : null;
    const yearBuilt = typeof f.yearBuilt === "number" ? f.yearBuilt : null;
    const lat = typeof f.lat === "number" ? f.lat : null;
    const lng = typeof f.lng === "number" ? f.lng : null;
    const photos = extracted.photos;
    const photo =
      Array.isArray(photos) && photos.length > 0 && typeof photos[0] === "string"
        ? photos[0]
        : null;

    // Completeness score (more fields = better canonical candidate)
    const completeness =
      (priceEur != null ? 1 : 0) +
      (areaM2 != null ? 1 : 0) +
      (rooms != null ? 1 : 0) +
      (yearBuilt != null ? 1 : 0) +
      (lat != null && lng != null ? 1 : 0) +
      (title ? 1 : 0);

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
      title,
      priceEur,
      areaM2,
      rooms,
      floorRaw,
      yearBuilt,
      lat,
      lng,
      photo,
      createdAt: a.createdAt,
      completeness,
      domain,
      sourceUrl: a.sourceUrl ?? "",
    };
  }).filter((r): r is NonNullable<typeof r> => r != null);

  if (!rows.length) return;

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
      canonicalUrl: canonical.sourceUrl ?? undefined,
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
  });
  const analysisIds = [...new Set(edges.map((e) => e.analysisId))];
  const analyses = await prisma.analysis.findMany({
    where: { id: { in: analysisIds } },
    select: { id: true, sourceUrl: true, createdAt: true },
  });
  const analysisById = new Map(analyses.map((a) => [a.id, a]));

  return edges.map((edge) => {
    const a = analysisById.get(edge.analysisId);
    if (!a) return null;
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
  }).filter((r): r is NonNullable<typeof r> => r != null);
}
