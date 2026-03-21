import type { ScoreSnapshot } from "@prisma/client";

import {
  checkReducedVATEligibility,
  computePriceWithVAT,
  detectDevelopmentStatus,
} from "@/lib/analysis/development-detect";
import { prisma } from "@/lib/db";
import { inferLocationFromText, nearestStationM } from "@/lib/geo";
import type { LlmTextExtraction } from "@/lib/llm/types";
import { computeExecutiveVerdict, type VerdictInput } from "@/lib/report/verdict";
import {
  applyReportRiskVisibility,
  buildRecommendedNextStep,
  buildRiskInsights,
  normalizeRiskStack,
  orderRiskLayerKeysForReport,
  RISK_LAYER_LABELS,
} from "@/lib/risk/executive";
import { computeApartmentScore } from "@/lib/score/apartmentScore";
import type { NormalizedFeatures } from "@/types/analysis";

export type PdfReportData = {
  id: string;
  url?: string | null;
  title?: string | null;
  address?: string | null;
  addressIsExact?: boolean;
  sector?: string | null;
  photos?: string[];
  priceEur?: number | null;
  areaM2?: number | null;
  rooms?: number | null;
  level?: number | null;
  floorRaw?: string | null;
  yearBuilt?: number | null;
  city?: string | null;
  areaSlug?: string | null;
  distMetroM?: number | null;
  sellerType?: string | null;
  currency?: string | null;
  avmLow?: number | null;
  avmMid?: number | null;
  avmHigh?: number | null;
  avmConf?: number | null;
  priceBadge?: string | null;
  ttsBucket?: string | null;
  ttsMinMonths?: number | null;
  ttsMaxMonths?: number | null;
  estRent?: number | null;
  yieldGross?: number | null;
  yieldNet?: number | null;
  riskClass?: string | null;
  riskSource?: string | null;
  notarialTotal?: number | null;
  notarialEurM2?: number | null;
  notarialZone?: string | null;
  notarialYear?: number | null;
  trustScore?: number | null;
  trustBadge?: string | null;
  trustReasons?: { plus?: string[]; minus?: string[] } | null;
  events?: Array<{ kind: string; happenedAt: Date; payload?: unknown }>;
  hasParking?: boolean | null;
  nearestMetro?: string | null;
  compsCount?: number | null;
  zoneMedianEurM2?: number | null;
  llmCondition?: string | null;
  llmSummary?: string | null;
  llmRedFlags?: string[] | null;
  llmPositives?: string[] | null;

  // Executive verdict
  verdictLabel?: string | null;
  verdictSummary?: string | null;
  confidenceScore?: number | null;
  confidenceLabel?: string | null;
  dealKillers?: string[] | null;

  // Apartment score
  apartmentScore?: number | null;
  apartmentScoreLabel?: string | null;
  scoreValue?: number | null;
  scoreRisk?: number | null;
  scoreLiquidity?: number | null;
  scoreLifestyle?: number | null;
  scorePros?: string[] | null;
  scoreCons?: string[] | null;

  // Transport
  nearestMetroMinutes?: number | null;
  hasElevator?: boolean | null;
  heatingType?: string | null;

  // Acquisition costs
  commissionStatus?: "zero" | "standard" | "unknown" | null;

  // VAT
  hasPlusTVA?: boolean;
  vatRate?: number | null;
  vatAmount?: number | null;
  priceWithVAT?: number | null;
  reducedVATEligible?: boolean;
  reducedVATReason?: string | null;
  riskStackOverallScore?: number | null;
  riskStackOverallLevel?: string | null;
  riskStackTopRisk?: string | null;
  riskStackTopSummary?: string | null;
  riskStackInsights?: string[] | null;
  riskStackRecommendedNextStep?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

  const sourceMeta = (a.extractedListing?.sourceMeta ?? {}) as Record<string, unknown>;
  const llmText = a.extractedListing?.llmTextExtract as unknown as LlmTextExtraction | null;
  const lat = typeof f?.lat === "number" ? f.lat : null;
  const lng = typeof f?.lng === "number" ? f.lng : null;

  const addressRaw = a.extractedListing?.addressRaw ?? null;
  const streetPatterns = [
    /\bstr\.?\s/i,
    /\bstrada\s/i,
    /\bbld\.?\s/i,
    /\bcalea\s/i,
    /\bsoseaua\s/i,
    /\bnr\.?\s?\d/i,
  ];
  const addressIsExact = addressRaw ? streetPatterns.some((p) => p.test(addressRaw)) : false;

  let sector: string | null = null;
  if (addressRaw) {
    const sm = addressRaw.match(/sector(?:ul)?\s*(\d)/i);
    if (sm) sector = `Sector ${sm[1]}`;
  }
  if (!sector) {
    const aSlug = typeof f?.areaSlug === "string" ? f.areaSlug : null;
    if (aSlug) {
      const sm = aSlug.match(/sector-?(\d)/i);
      if (sm) sector = `Sector ${sm[1]}`;
    }
  }

  const compsExplain = (ssRecord?.explain as Record<string, unknown> | null)?.comps as
    | Record<string, unknown>
    | undefined;
  const compsStats = compsExplain?.eurM2 as { median?: number } | undefined;
  const explainRecord = isRecord(ssRecord?.explain) ? ssRecord.explain : null;
  const seismicExplain = isRecord(explainRecord?.seismic) ? explainRecord.seismic : null;
  const normalizedRiskStack = applyReportRiskVisibility(
    normalizeRiskStack(
      (explainRecord?.riskStack ?? null) as Parameters<typeof normalizeRiskStack>[0],
      seismicExplain,
    ),
  );
  const orderedRiskKeys = orderRiskLayerKeysForReport(normalizedRiskStack.layers);
  const riskInsights = buildRiskInsights(normalizedRiskStack, orderedRiskKeys);
  const riskRecommendation = buildRecommendedNextStep(
    normalizedRiskStack,
    riskInsights.dominantKey,
  );

  const comps = await prisma.compMatch.count({ where: { analysisId } });

  const priceEur =
    typeof f?.priceEur === "number"
      ? f.priceEur
      : ((a.extractedListing?.price as number | null) ?? null);
  const areaM2 =
    typeof f?.areaM2 === "number"
      ? f.areaM2
      : ((a.extractedListing?.areaM2 as number | null) ?? null);
  const rooms =
    typeof f?.rooms === "number" ? f.rooms : ((a.extractedListing?.rooms as number | null) ?? null);
  const yearBuilt =
    typeof f?.yearBuilt === "number"
      ? f.yearBuilt
      : ((a.extractedListing?.yearBuilt as number | null) ?? null);
  const level = typeof f?.level === "number" ? f.level : null;
  const totalFloors = typeof f?.totalFloors === "number" ? f.totalFloors : null;
  const hasElevator = typeof f?.hasLift === "boolean" ? f.hasLift : null;
  const distMetroM = typeof f?.distMetroM === "number" ? f.distMetroM : null;
  const sm = a.extractedListing?.sourceMeta as Record<string, unknown> | null | undefined;
  const commissionStatus: "zero" | "standard" | "unknown" =
    sm?.zeroCommission === true
      ? "zero"
      : llmText?.redFlags?.some((r: string) => /comision/i.test(r))
        ? "standard"
        : "unknown";

  // Infer location if needed for metro
  let effectiveLat = lat;
  let effectiveLng = lng;
  if (effectiveLat == null || effectiveLng == null) {
    const hint = inferLocationFromText(
      a.extractedListing?.title ?? null,
      (a.extractedListing as unknown as Record<string, unknown>)?.description as string | null,
      addressRaw,
    );
    if (hint) {
      effectiveLat = hint.lat;
      effectiveLng = hint.lng;
    }
  }
  const metroData =
    effectiveLat != null && effectiveLng != null
      ? nearestStationM(effectiveLat, effectiveLng)
      : null;
  const nearestMetroMinutes = metroData ? Math.round(metroData.distM / 80) : null;

  // Under-construction detection
  const devPriceText = sm?.plusTVA ? "+ TVA" : null;
  const pdfDevSignals = detectDevelopmentStatus(
    a.extractedListing?.title ?? null,
    (sourceMeta?.description as string | null) ??
      ((a.extractedListing as unknown as Record<string, unknown>)?.description as string | null),
    yearBuilt,
    typeof sourceMeta?.sellerType === "string" ? (sourceMeta.sellerType as string) : null,
    devPriceText,
  );

  // VAT computation
  const hasPlusTVA = pdfDevSignals.hasVAT || sm?.plusTVA === true;
  const vatRate = pdfDevSignals.vatRate ?? (hasPlusTVA ? 19 : null);
  const vatComputed =
    hasPlusTVA && priceEur && vatRate ? computePriceWithVAT(priceEur, vatRate) : null;
  const reducedVATCheck =
    hasPlusTVA && priceEur ? checkReducedVATEligibility(priceEur, areaM2) : null;

  // Compute executive verdict for PDF
  const verdictInput: VerdictInput = {
    askingPrice: priceEur,
    avmLow: avmLow,
    avmMid: avmMid,
    avmHigh: avmHigh,
    currency: (a.extractedListing?.currency as string) ?? "EUR",
    confidenceLevel: null,
    confidenceScore: avmConf != null ? Math.round(avmConf * 100) : null,
    compsCount: comps,
    seismicRiskClass: riskClass,
    seismicConfidence: null,
    seismicMethod: null,
    llmRedFlags: llmText?.redFlags ?? null,
    llmCondition: llmText?.condition ?? null,
    sellerMotivation: llmText?.sellerMotivation ?? null,
    transitScore: null,
    vibeZoneTypeKey: null,
    yearBuilt,
    hasPhotos: photos.length > 0,
    rooms,
    areaM2,
    floor: level,
    totalFloors,
    address: addressRaw,
    title: a.extractedListing?.title ?? null,
    hasParking: llmText?.hasParking ?? null,
    hasElevator,
    heatingType: llmText?.heatingType ?? null,
    sellerType:
      typeof sourceMeta?.sellerType === "string" ? (sourceMeta.sellerType as string) : null,
    isUnderConstruction: pdfDevSignals.isUnderConstruction,
    isNeverLivedIn: sm?.neverLivedIn === true,
    hasPlusTVA,
    isRender: pdfDevSignals.isRender,
    photosAreRenders: pdfDevSignals.isRender,
    estimatedDelivery: pdfDevSignals.estimatedDelivery,
  };
  const verdict = computeExecutiveVerdict(verdictInput);

  // Compute apartment score for PDF
  const yearBucket = yearBuilt
    ? yearBuilt < 1978
      ? ("<1977" as const)
      : yearBuilt <= 1990
        ? ("1978-1990" as const)
        : yearBuilt <= 2005
          ? ("1991-2005" as const)
          : ("2006+" as const)
    : undefined;
  const apartmentScoreResult = computeApartmentScore({
    listingPriceEur: priceEur ?? undefined,
    fairLikelyEur: avmMid ?? 0,
    range80: { min: avmLow ?? 0, max: avmHigh ?? 0 },
    range95: { min: (avmLow ?? 0) * 0.9, max: (avmHigh ?? 0) * 1.1 },
    confidence: avmConf != null ? Math.round(avmConf * 100) : 30,
    yearBucket,
    yearBuilt: yearBuilt ?? undefined,
    condition: llmText?.condition as
      | "nou"
      | "renovat"
      | "locuibil"
      | "necesita_renovare"
      | "de_renovat"
      | undefined,
    floor: level ?? undefined,
    totalFloors: totalFloors ?? undefined,
    hasElevator: hasElevator ?? undefined,
    hasParking: llmText?.hasParking ?? undefined,
    heatingType: llmText?.heatingType ?? undefined,
    rooms: rooms ?? undefined,
    areaM2: areaM2 ?? undefined,
    sellerType:
      typeof sourceMeta?.sellerType === "string" ? (sourceMeta.sellerType as string) : undefined,
    isUnderConstruction: pdfDevSignals.isUnderConstruction,
    isNeverLivedIn: sm?.neverLivedIn === true,
  });

  return {
    id: a.id,
    url: a.sourceUrl,
    title: a.extractedListing?.title ?? null,
    address: addressRaw,
    addressIsExact,
    sector,
    photos,
    priceEur,
    areaM2,
    rooms,
    level,
    floorRaw: (a.extractedListing?.floorRaw as string) ?? null,
    yearBuilt,
    sellerType:
      typeof sourceMeta?.sellerType === "string" ? (sourceMeta.sellerType as string) : null,
    currency: (a.extractedListing?.currency as string) ?? "EUR",
    city: typeof f?.city === "string" ? f.city : null,
    areaSlug: typeof f?.areaSlug === "string" ? f.areaSlug : null,
    distMetroM,
    avmLow,
    avmMid,
    avmHigh,
    avmConf,
    priceBadge,
    ttsBucket,
    ttsMinMonths:
      typeof ssRecord?.ttsMinMonths === "number" ? (ssRecord.ttsMinMonths as number) : null,
    ttsMaxMonths:
      typeof ssRecord?.ttsMaxMonths === "number" ? (ssRecord.ttsMaxMonths as number) : null,
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
    hasParking: llmText?.hasParking ?? null,
    nearestMetro: metroData?.name ?? null,
    compsCount: comps,
    zoneMedianEurM2: compsStats?.median ?? null,
    llmCondition: llmText?.condition ?? null,
    llmSummary: llmText?.summary ?? null,
    llmRedFlags: llmText?.redFlags ?? null,
    llmPositives: llmText?.positives ?? null,
    verdictLabel: verdict.verdict,
    verdictSummary: verdict.summary,
    confidenceScore: verdict.confidenceScore,
    confidenceLabel: verdict.confidenceLabel,
    dealKillers: verdict.dealKillers.map((k) => k.text),
    apartmentScore: apartmentScoreResult.score,
    apartmentScoreLabel: apartmentScoreResult.label,
    scoreValue: apartmentScoreResult.subscores.value,
    scoreRisk: apartmentScoreResult.subscores.risk,
    scoreLiquidity: apartmentScoreResult.subscores.liquidity,
    scoreLifestyle: apartmentScoreResult.subscores.lifestyle,
    scorePros: apartmentScoreResult.pros,
    scoreCons: apartmentScoreResult.cons,
    nearestMetroMinutes,
    hasElevator,
    heatingType: llmText?.heatingType ?? null,
    commissionStatus,
    hasPlusTVA,
    vatRate,
    vatAmount: vatComputed?.vatAmount ?? null,
    priceWithVAT: vatComputed?.priceWithVAT ?? null,
    reducedVATEligible: reducedVATCheck?.eligible,
    reducedVATReason: reducedVATCheck?.reason ?? null,
    riskStackOverallScore: normalizedRiskStack.overallScore,
    riskStackOverallLevel: normalizedRiskStack.overallLevel,
    riskStackTopRisk: riskInsights.dominantKey ? RISK_LAYER_LABELS[riskInsights.dominantKey] : null,
    riskStackTopSummary: riskInsights.dominantKey
      ? normalizedRiskStack.layers[riskInsights.dominantKey].summary
      : null,
    riskStackInsights: riskInsights.items,
    riskStackRecommendedNextStep: riskRecommendation,
  };
}
