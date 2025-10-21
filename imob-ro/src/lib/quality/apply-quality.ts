import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

import { computeQuality } from "./quality";

export async function applyQualityToAnalysis(analysisId: string) {
  const a = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: { extractedListing: true, featureSnapshot: true, scoreSnapshot: true },
  });
  if (!a) return null;

  const f = (a.featureSnapshot?.features ?? {}) as Record<string, unknown>;
  const photos = Array.isArray(a.extractedListing?.photos)
    ? (a.extractedListing?.photos as unknown[])
    : [];
  const description =
    (a.extractedListing as Record<string, unknown>)?.description ??
    ((a.extractedListing as Record<string, unknown>)?.sourceMeta as Record<string, unknown>)
      ?.description ??
    "";

  const quality = computeQuality({
    extracted: {
      title: a.extractedListing?.title ?? "",
      description: typeof description === "string" ? description : "",
      photos,
    },
    features: {
      priceEur: typeof f?.priceEur === "number" ? f.priceEur : null,
      areaM2: typeof f?.areaM2 === "number" ? f.areaM2 : null,
      rooms: typeof f?.rooms === "number" ? f.rooms : null,
      yearBuilt: typeof f?.yearBuilt === "number" ? f.yearBuilt : null,
      lat: typeof f?.lat === "number" ? f.lat : null,
      lng: typeof f?.lng === "number" ? f.lng : null,
    },
    avm: { mid: a.scoreSnapshot?.avmMid ?? null },
  });

  await prisma.scoreSnapshot.upsert({
    where: { analysisId },
    update: { explain: { quality } as Prisma.JsonObject },
    create: { analysisId, explain: { quality } as Prisma.JsonObject },
  });

  return quality;
}
