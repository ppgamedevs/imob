import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { hashPhotoUrls, mapScoreToVerdict } from "@/lib/ml/vision/condition";

import { computeQuality } from "./quality";

async function inferConditionFromPhotos(
  photoUrls: string[],
): Promise<{ conditionScore: number; verdict: string } | null> {
  if (!photoUrls.length) return null;

  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/vision/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photos: photoUrls.slice(0, 3) }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      conditionScore: data.score ?? 0.5,
      verdict: data.verdict?.verdict ?? "decent",
    };
  } catch {
    return null;
  }
}

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

  // Vision-based condition inference (non-blocking)
  let visionResult: { conditionScore: number; verdict: string } | null = null;
  const photoUrls = photos
    .map((p: any) => (typeof p === "string" ? p : p?.url))
    .filter((u): u is string => typeof u === "string" && u.startsWith("http"));

  if (photoUrls.length > 0) {
    const photoHash = await hashPhotoUrls(photoUrls.slice(0, 3));
    const cached = a.scoreSnapshot?.conditionScore;
    if (cached != null) {
      const mapped = mapScoreToVerdict(cached);
      visionResult = { conditionScore: cached, verdict: mapped.verdict };
    } else {
      visionResult = await inferConditionFromPhotos(photoUrls);
    }
  }

  const explainPayload: Record<string, unknown> = { quality };
  if (visionResult) {
    explainPayload.vision = {
      conditionScore: visionResult.conditionScore,
      verdict: visionResult.verdict,
      photoCount: photoUrls.length,
    };
  }

  const existingExplain = (a.scoreSnapshot?.explain as Record<string, unknown>) ?? {};

  await prisma.scoreSnapshot.upsert({
    where: { analysisId },
    update: {
      conditionScore: visionResult?.conditionScore ?? undefined,
      condition: visionResult?.verdict ?? undefined,
      explain: { ...existingExplain, ...explainPayload } as Prisma.JsonObject,
    },
    create: {
      analysisId,
      conditionScore: visionResult?.conditionScore ?? undefined,
      condition: visionResult?.verdict ?? undefined,
      explain: explainPayload as Prisma.JsonObject,
    },
  });

  return quality;
}
