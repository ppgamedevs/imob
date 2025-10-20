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
};

export async function loadPdfReportData(analysisId: string): Promise<PdfReportData | null> {
  const a = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: {
      extractedListing: true,
      featureSnapshot: true,
      scoreSnapshot: true,
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
    avmLow: avmLow,
    avmMid: avmMid,
    avmHigh: avmHigh,
    avmConf: avmConf,
    priceBadge: priceBadge,
    ttsBucket: ttsBucket,
    estRent: estRent,
    yieldGross: yieldGross,
    yieldNet: yieldNet,
    riskClass: riskClass,
    riskSource: riskSource,
  };
}
