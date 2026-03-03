import { prisma } from "@/lib/db";

import { lookupNotarialGrid } from "./lookup";

export async function applyNotarialToAnalysis(analysisId: string, features: Record<string, unknown>) {
  const areaM2 = typeof features.areaM2 === "number" ? features.areaM2 : null;
  if (!areaM2) return null;

  const result = await lookupNotarialGrid({
    areaM2,
    sector: typeof features.sector === "number" ? features.sector : null,
    neighborhood: typeof features.neighborhood === "string" ? features.neighborhood : null,
    areaSlug: typeof features.areaSlug === "string" ? features.areaSlug : (typeof features.area_slug === "string" ? features.area_slug : null),
    addressRaw: typeof features.addressRaw === "string" ? features.addressRaw : null,
    propertyType: "apartment",
  });

  if (!result) return null;

  const existing = await prisma.scoreSnapshot.findUnique({ where: { analysisId } });
  const existingExplain = (existing?.explain as Record<string, unknown>) ?? {};

  await prisma.scoreSnapshot.upsert({
    where: { analysisId },
    update: {
      notarialEurM2: result.eurPerM2,
      notarialTotal: result.totalValue,
      notarialYear: result.year,
      notarialZone: result.zone,
      explain: {
        ...existingExplain,
        notarial: {
          eurPerM2: result.eurPerM2,
          maxEurPerM2: result.maxEurPerM2,
          totalValue: result.totalValue,
          totalValueMax: result.totalValueMax,
          zone: result.zone,
          year: result.year,
          source: result.source,
        },
      },
    },
    create: {
      analysisId,
      notarialEurM2: result.eurPerM2,
      notarialTotal: result.totalValue,
      notarialYear: result.year,
      notarialZone: result.zone,
      explain: {
        notarial: {
          eurPerM2: result.eurPerM2,
          maxEurPerM2: result.maxEurPerM2,
          totalValue: result.totalValue,
          totalValueMax: result.totalValueMax,
          zone: result.zone,
          year: result.year,
          source: result.source,
        },
      },
    },
  });

  return result;
}
