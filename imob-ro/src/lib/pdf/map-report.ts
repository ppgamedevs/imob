import { prisma } from "@/lib/db";

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
  const f = (a.featureSnapshot?.features ?? {}) as unknown as Record<string, any>;

  const photos: string[] = Array.isArray(a.extractedListing?.photos)
    ? (a.extractedListing!.photos as string[])
    : [];
  const ss = a.scoreSnapshot ?? null;

  return {
    id: a.id,
    url: a.sourceUrl,
    title: a.extractedListing?.title ?? null,
    address: a.extractedListing?.addressRaw ?? null,
    photos,
    priceEur: f?.priceEur ?? null,
    areaM2: f?.areaM2 ?? null,
    rooms: f?.rooms ?? null,
    level: f?.level ?? null,
    yearBuilt: f?.yearBuilt ?? null,
    city: f?.city ?? null,
    areaSlug: f?.areaSlug ?? null,
    distMetroM: f?.distMetroM ?? null,
    avmLow: ss?.avmLow ?? null,
    avmMid: ss?.avmMid ?? null,
    avmHigh: ss?.avmHigh ?? null,
    avmConf: ss?.avmConf ?? null,
    priceBadge: ss?.priceBadge ?? null,
    ttsBucket: ss?.ttsBucket ?? null,
    estRent: ss?.estRent ?? null,
    yieldGross: ss?.yieldGross ?? null,
    yieldNet: ss?.yieldNet ?? null,
    riskClass: ss?.riskClass ?? null,
    riskSource: ss?.riskSource ?? null,
  };
}
