import type { ScoreSnapshot } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { NormalizedFeatures } from "@/types/analysis";

export type PdfReportData = {
  id: string;
  url?: string | null;
  title?: string | null;
  address?: string | null;
  photos?: string[];
  priceEur?: number | null;
  areaM2?: number | null;
  rooms?: number | null;
  level?: number | null;
  yearBuilt?: number | null;
  city?: string | null;
  areaSlug?: string | null;
  distMetroM?: number | null;
  avmLow?: number | null;
  avmMid?: number | null;
  avmHigh?: number | null;
  avmConf?: number | null;
  priceBadge?: string | null;
  ttsBucket?: string | null;
  estRent?: number | null;
  yieldGross?: number | null;
  yieldNet?: number | null;
  riskClass?: string | null;
  riskSource?: string | null;
  // Notarial grid
  notarialTotal?: number | null;
  notarialEurM2?: number | null;
  notarialZone?: string | null;
  notarialYear?: number | null;
  // Day 20: Provenance
  trustScore?: number | null;
  trustBadge?: string | null;
  trustReasons?: { plus?: string[]; minus?: string[] } | null;
  events?: Array<{ kind: string; happenedAt: Date; payload?: unknown }>;
};

export async function loadPdfReportData(analysisId: string): Promise<PdfReportData | null> {
  const a = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: {
      extractedListing: true,
      featureSnapshot: true,
      scoreSnapshot: true,
      trustSnapshot: true,
      provenanceEvents: { orderBy: { happenedAt: "asc" }, take: 8 },
    },
  });
  if (!a) return null;
  // featureSnapshot and extractedListing shapes are dynamic; treat as unknown and narrow
  const f = (a.featureSnapshot?.features ?? {}) as unknown as NormalizedFeatures;

  const photos: string[] = Array.isArray(a.extractedListing?.photos)
    ? (a.extractedListing!.photos as string[])
    : [];
  const ss = (a.scoreSnapshot as ScoreSnapshot | null) ?? null;
  const ssRecord = ss as unknown as Record<string, unknown> | null;

  const avmLow = typeof ssRecord?.avmLow === "number" ? (ssRecord.avmLow as number) : null;
  const avmMid = typeof ssRecord?.avmMid === "number" ? (ssRecord.avmMid as number) : null;
  const avmHigh = typeof ssRecord?.avmHigh === "number" ? (ssRecord.avmHigh as number) : null;
  const avmConf = typeof ssRecord?.avmConf === "number" ? (ssRecord.avmConf as number) : null;
  const priceBadge =
    typeof ssRecord?.priceBadge === "string" ? (ssRecord.priceBadge as string) : null;
  const ttsBucket = typeof ssRecord?.ttsBucket === "string" ? (ssRecord.ttsBucket as string) : null;
  const estRent = typeof ssRecord?.estRent === "number" ? (ssRecord.estRent as number) : null;
  const yieldGross =
    typeof ssRecord?.yieldGross === "number" ? (ssRecord.yieldGross as number) : null;
  const yieldNet = typeof ssRecord?.yieldNet === "number" ? (ssRecord.yieldNet as number) : null;
  const riskClass = typeof ssRecord?.riskClass === "string" ? (ssRecord.riskClass as string) : null;
  const riskSource =
    typeof ssRecord?.riskSource === "string" ? (ssRecord.riskSource as string) : null;

  // Day 20: Trust + Events
  const trustScore = a.trustSnapshot?.score ?? null;
  const trustBadge = a.trustSnapshot?.badge ?? null;
  const trustReasons = (a.trustSnapshot?.reasons as { plus?: string[]; minus?: string[] }) ?? null;
  const events = a.provenanceEvents?.map((e) => ({
    kind: e.kind,
    happenedAt: e.happenedAt,
    payload: e.payload,
  }));

  const notarialTotal =
    typeof ssRecord?.notarialTotal === "number" ? (ssRecord.notarialTotal as number) : null;
  const notarialEurM2 =
    typeof ssRecord?.notarialEurM2 === "number" ? (ssRecord.notarialEurM2 as number) : null;
  const notarialZone =
    typeof ssRecord?.notarialZone === "string" ? (ssRecord.notarialZone as string) : null;
  const notarialYear =
    typeof ssRecord?.notarialYear === "number" ? (ssRecord.notarialYear as number) : null;

  return {
    id: a.id,
    url: a.sourceUrl,
    title: a.extractedListing?.title ?? null,
    address: a.extractedListing?.addressRaw ?? null,
    photos,
    priceEur: typeof f?.priceEur === "number" ? f.priceEur : null,
    areaM2: typeof f?.areaM2 === "number" ? f.areaM2 : null,
    rooms: typeof f?.rooms === "number" ? f.rooms : null,
    level: typeof f?.level === "number" ? f.level : null,
    yearBuilt: typeof f?.yearBuilt === "number" ? f.yearBuilt : null,
    city: typeof f?.city === "string" ? f.city : null,
    areaSlug: typeof f?.areaSlug === "string" ? f.areaSlug : null,
    distMetroM: typeof f?.distMetroM === "number" ? f.distMetroM : null,
    avmLow,
    avmMid,
    avmHigh,
    avmConf,
    priceBadge,
    ttsBucket,
    estRent,
    yieldGross,
    yieldNet,
    riskClass,
    riskSource,
    notarialTotal,
    notarialEurM2,
    notarialZone,
    notarialYear,
    trustScore,
    trustBadge,
    trustReasons,
    events,
  };
}
