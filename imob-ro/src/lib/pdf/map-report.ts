import type { ScoreSnapshot } from "@prisma/client";

import {
  checkReducedVATEligibility,
  computePriceWithVAT,
  detectDevelopmentStatus,
} from "@/lib/analysis/development-detect";
import { prisma } from "@/lib/db";
import { flags } from "@/lib/feature-flags";
import { inferLocationFromText, nearestStationM } from "@/lib/geo";
import { sanitizeRooms } from "@/lib/property-type";
import type { LlmTextExtraction } from "@/lib/llm/types";
import {
  buildReportDataQualityGate,
  type ReportDataQuality,
} from "@/lib/report/data-quality-gate";
import { buildReportConfidenceExplanation } from "@/lib/report/report-confidence-explanation";
import { buildNegotiationAssistant } from "@/lib/report/negotiation-assistant";
import { findComparables, computeFairRange, type FairPriceResult } from "@/lib/report/pricing";
import { generateNegotiationPoints, type NegotiationInput } from "@/lib/report/negotiation";
import { computeExecutiveVerdict, type VerdictInput } from "@/lib/report/verdict";
import {
  applyReportRiskVisibility,
  buildRecommendedNextStep,
  buildRiskInsights,
  normalizeRiskStack,
  orderRiskLayerKeysForReport,
  RISK_LAYER_LABELS,
} from "@/lib/risk/executive";
import { resolveNotarialDisplayForReport } from "@/lib/notarial/notarial-validate";
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
  /** True when grid matched but numeric display is suppressed (UI shows neutral copy). */
  notarialShowNeutralNote?: boolean;
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
  buyerVerdictKey?: string | null;
  buyerVerdictTitle?: string | null;
  buyerVerdictSubtitle?: string | null;
  verdictSummary?: string | null;
  reportConfidenceLabelRo?: string | null;
  reportConfidenceShortRo?: string | null;
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

  canShowYield?: boolean | null;
  reportDataQuality?: ReportDataQuality | null;

  /** PDF premium: metadata and structured sections */
  reportDateRo?: string | null;
  coverDisclaimerShortRo?: string | null;
  /** fair range used for executive summary and negotiation (comparables when available) */
  fairRangeLow?: number | null;
  fairRangeMid?: number | null;
  fairRangeHigh?: number | null;
  /** "comparabile" when from computeFairRange, else AVM / model */
  fairRangeSource?: "comparabile" | "model" | null;
  diffVsFairPct?: number | null;
  diffVsFairExplanationRo?: string | null;
  executiveRisksRo?: string[];
  executiveNegotiationAngleRo?: string | null;
  dataGapsRo?: string[];
  compsConfidenceNoteRo?: string | null;
  compRows?: Array<{
    distanceM: number | null;
    areaM2: number | null;
    rooms: number | null;
    priceEur: number | null;
    eurM2: number | null;
    titleShort: string | null;
  }>;
  pdfNegotiation?: {
    strategyTitleRo: string;
    strategyBodyRo: string;
    leverageBulletsRo: string[];
    practicalQuestionsRo: string[];
    suggestedMessageRo: string;
  } | null;
  finalChecklistRo?: string[];
  methodologyBodyRo?: string | null;
};

export function pdfNoEmDash(s: string): string {
  return s
    .replace(/\u2014/g, ", ")
    .replace(/\u2013/g, " ")
    .replace(/[–—]/g, ", ");
}

export function buildPdfDiffExplanationRo(
  pct: number | null,
  canStrongPrice: boolean,
  hasPriceAndBaseline: boolean,
): string {
  if (pct == null || !hasPriceAndBaseline) {
    return "Nu putem descrie o diferență procentuală rezonabilă: lipsesc fie prețul listat, fie un reper de interval suficient de ancorat din datele curente. Folosește tabelul și secțiunile de mai jos doar ca reper, nu ca promisiune de tranzacție.";
  }
  const abs = Math.abs(pct);
  const over = pct > 0;
  if (canStrongPrice) {
    return over
      ? `Față de reperul central al intervalului folosit, prețul cerut este la aproximativ ${abs}% deasupra. Este o diferență orientativă din model și comparabile publice, nu o evaluare ANEVAR sau o cifră de negociere garantată.`
      : `Față de reperul central, prețul cerut este la aproximativ ${abs}% sub reper (orientativ; surse: anunțuri și model, nu tranzacții oficiale centralizate aici).`;
  }
  return `Față de reperul central, diferența indicativă este de aproximativ ${abs}% ${over ? "peste" : "sub"} reper, dar baza e limitată (suficiente date lipsesc pentru o concluzie tare). Cere confirmări suplimentare la vizionare.`;
}

const PDF_FINAL_CHECKLIST_RO: string[] = [
  "Extras CF (carte funciară) la zi, cu mențiuni despre sarcini, ipoteci, urmărire și notă de intabulare.",
  "Situația la asociația de proprietari: datorii, fund de reparații, lucrări aprobate, procese, litigii.",
  "Certificat energetic, plus avize (ISU) și acte de autorizație, dacă există finisaje sau compartimentări fără viza din proiect.",
  "Garanții, recepții și documentație șantier, dacă e locuință nouă sau în finalizare.",
  "Dacă imobilul e vechi sau e în clasă de risc seismic discutabilă, verificare de specialitate (tehnică, structură) înainte de ofertă fermă.",
  "Scenarii notar, taxe, TVA, comisioane, bancă: sume și clauze pe hârtie înainte de antecontract.",
];

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

  const [comps, compTableRowsRaw] = await Promise.all([
    prisma.compMatch.count({ where: { analysisId } }),
    prisma.compMatch.findMany({
      where: { analysisId },
      orderBy: [{ score: "desc" }, { distanceM: "asc" }],
      take: 12,
    }),
  ]);

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
  const fRecord = (f ?? {}) as Record<string, unknown>;
  const notarialRes = resolveNotarialDisplayForReport({
    scoreSnapshot: a.scoreSnapshot
      ? {
          notarialTotal: a.scoreSnapshot.notarialTotal,
          notarialEurM2: a.scoreSnapshot.notarialEurM2,
          notarialZone: a.scoreSnapshot.notarialZone,
          notarialYear: a.scoreSnapshot.notarialYear,
          explain: a.scoreSnapshot.explain,
        }
      : null,
    askingPriceEur: priceEur,
    avmMidEur: avmMid,
    features: {
      ...fRecord,
      title: a.extractedListing?.title ?? fRecord.title,
      rooms: a.extractedListing?.rooms ?? fRecord.rooms,
    },
  });
  const notarialTotal = notarialRes.notarialTotal;
  const notarialEurM2 = notarialRes.notarialEurM2;
  const notarialZone = notarialRes.notarialZone;
  const notarialYear = notarialRes.notarialYear;
  const notarialShowNeutralNote = notarialRes.showNeutralNote;
  const saneRoomsForNeg = sanitizeRooms(rooms, a.extractedListing?.title ?? null);
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

  let compsFairRange: FairPriceResult | null = null;
  if (flags.pricingV2 && areaM2 && areaM2 > 0) {
    try {
      const tightComps = await findComparables({
        analysisId,
        lat: typeof lat === "number" ? lat : null,
        lng: typeof lng === "number" ? lng : null,
        areaM2,
        rooms: saneRoomsForNeg,
        yearBuilt,
      });
      compsFairRange = computeFairRange(tightComps, areaM2);
    } catch {
      /* non-fatal: fall back to AVM band */
    }
  }

  const bestRange: { low: number; mid: number; high: number } | null =
    compsFairRange && compsFairRange.compsUsed > 0
      ? {
          low: compsFairRange.fairMin,
          mid: compsFairRange.fairMid,
          high: compsFairRange.fairMax,
        }
      : avmLow != null && avmMid != null && avmHigh != null
        ? { low: avmLow, mid: avmMid, high: avmHigh }
        : null;

  const negotiationOverpricingPct =
    priceEur && bestRange?.mid
      ? Math.round(((priceEur - bestRange.mid) / bestRange.mid) * 100)
      : null;

  // VAT computation
  const hasPlusTVA = pdfDevSignals.hasVAT || sm?.plusTVA === true;
  const vatRate = pdfDevSignals.vatRate ?? (hasPlusTVA ? 19 : null);
  const vatComputed =
    hasPlusTVA && priceEur && vatRate ? computePriceWithVAT(priceEur, vatRate) : null;
  const reducedVATCheck =
    hasPlusTVA && priceEur ? checkReducedVATEligibility(priceEur, areaM2) : null;

  const confFromExplain = isRecord(explainRecord?.confidence)
    ? (explainRecord.confidence as { level?: string })
    : null;
  const pipelinePdfLevel =
    confFromExplain?.level === "high" ||
    confFromExplain?.level === "medium" ||
    confFromExplain?.level === "low"
      ? (confFromExplain.level as "high" | "medium" | "low")
      : null;
  const reportConfidenceForPdf = buildReportConfidenceExplanation({
    features: f as import("@/lib/types/pipeline").NormalizedFeatures,
    compCount: comps,
    oldestCompDays:
      typeof (compsExplain as { oldestCompDays?: unknown })?.oldestCompDays === "number"
        ? ((compsExplain as { oldestCompDays: number }).oldestCompDays)
        : null,
    pipelineConfidenceLevel: pipelinePdfLevel,
    hasListingPrice: priceEur != null && priceEur > 0,
    hasListingArea: areaM2 != null && areaM2 > 0,
    hasListingRooms: rooms != null,
    hasFloor: level != null,
    hasYearBuilt: yearBuilt != null,
  });

  const reportDataQualityForPdf = buildReportDataQualityGate({
    features: f as import("@/lib/types/pipeline").NormalizedFeatures,
    compCount: comps,
    oldestCompDays:
      typeof (compsExplain as { oldestCompDays?: unknown })?.oldestCompDays === "number"
        ? ((compsExplain as { oldestCompDays: number }).oldestCompDays)
        : null,
    hasPrice: priceEur != null && priceEur > 0,
    hasArea: areaM2 != null && areaM2 > 0,
    hasRooms: rooms != null,
    hasYearBuilt: yearBuilt != null,
    hasAreaPriceBaseline: avmMid != null && avmMid > 0,
    yieldGross,
    yieldNet,
    riskStack: normalizedRiskStack,
  });

  const negSeismicClass =
    (seismicExplain?.riskClass as string) ??
    (typeof riskClass === "string" ? riskClass : null);
  const seismicNearbyPdf = seismicExplain?.nearby as
    | { total?: number; buildings?: { distanceM: number }[] }
    | undefined;

  const negotiationInput: NegotiationInput = {
    askingPrice: priceEur,
    fairMin: compsFairRange?.fairMin ?? bestRange?.low ?? null,
    fairMax: compsFairRange?.fairMax ?? bestRange?.high ?? null,
    fairMid: compsFairRange?.fairMid ?? bestRange?.mid ?? null,
    medianEurM2: compsFairRange?.medianEurM2 ?? compsStats?.median ?? null,
    compsUsed: compsFairRange && compsFairRange.compsUsed > 0 ? compsFairRange.compsUsed : comps,
    currency: (a.extractedListing?.currency as string) ?? "EUR",
    areaM2,
    rooms: saneRoomsForNeg,
    yearBuilt,
    floor: level,
    hasParking: llmText?.hasParking ?? null,
    hasElevator,
    condition: llmText?.condition ?? null,
    priceDrops: 0,
    maxDropAmount: 0,
    totalSnapshots: 0,
    duplicateCount: 0,
    wasRemoved: false,
    seismicRiskClass: negSeismicClass,
    seismicNearbyCount: typeof seismicNearbyPdf?.total === "number" ? seismicNearbyPdf.total : 0,
    seismicNearbyClosestM: seismicNearbyPdf?.buildings?.[0]?.distanceM ?? null,
    nightlifeScore: null,
    zoneTypeKey: null,
    transitScore: null,
    nearestMetroName: metroData?.name ?? null,
    nearestMetroMinutes: nearestMetroMinutes,
  };
  const negotiationPoints = generateNegotiationPoints(negotiationInput);
  const pdfNegotiationAssistant = buildNegotiationAssistant({
    title: a.extractedListing?.title ?? null,
    overpricingPct: negotiationOverpricingPct,
    confidenceLevel: confFromExplain?.level ?? null,
    compsCount: comps,
    canShowStrongPricePosition: reportDataQualityForPdf.canShowStrongPricePositionLanguage,
    canShowSubstantiveNegotiation: reportDataQualityForPdf.canShowNegotiationArguments,
    hasYearBuilt: yearBuilt != null,
    seismicRiskClass: negSeismicClass,
    isRender: pdfDevSignals.isRender,
    isUnderConstruction: pdfDevSignals.isUnderConstruction,
    points: negotiationPoints,
  });

  // Compute executive verdict for PDF
  const verdictInput: VerdictInput = {
    confidenceSuppressStrong: reportConfidenceForPdf.shouldSuppressStrongVerdict,
    dataQuality: {
      canShowPriceVerdict: reportDataQualityForPdf.canShowPriceVerdict,
      canShowStrongOverUnderLanguage: reportDataQualityForPdf.canShowStrongPricePositionLanguage,
      canShowLocationClaims: reportDataQualityForPdf.canShowNeighborhoodRiskClaims,
      canShowContextualRiskNarrative: !reportDataQualityForPdf.contextualRiskDataInsufficient,
      canShowFirmBuyerRecommendation: reportDataQualityForPdf.canShowStrongBuyerVerdict,
    },
    askingPrice: priceEur,
    avmLow: bestRange?.low ?? avmLow,
    avmMid: bestRange?.mid ?? avmMid,
    avmHigh: bestRange?.high ?? avmHigh,
    currency: (a.extractedListing?.currency as string) ?? "EUR",
    confidenceLevel: null,
    confidenceScore: avmConf != null ? Math.round(avmConf * 100) : null,
    compsCount: comps,
    seismicRiskClass: negSeismicClass,
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
    fairLikelyEur: bestRange?.mid ?? avmMid ?? 0,
    range80: {
      min: bestRange?.low ?? avmLow ?? 0,
      max: bestRange?.high ?? avmHigh ?? 0,
    },
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

  const compRowsMapped = compTableRowsRaw.map((r) => {
    const t = r.title?.trim() ?? null;
    const titleShort =
      t && t.length > 44 ? `${t.slice(0, 42)}…` : t;
    return {
      distanceM: r.distanceM ?? null,
      areaM2: r.areaM2 != null ? Math.round(r.areaM2 * 10) / 10 : null,
      rooms: r.rooms != null ? Math.round(r.rooms) : null,
      priceEur: r.priceEur ?? null,
      eurM2: r.eurM2 != null ? Math.round(r.eurM2) : null,
      titleShort,
    };
  });

  const executiveRisksRo: string[] = [];
  for (const d of verdict.dealKillers) {
    if (d.text && executiveRisksRo.length < 3) executiveRisksRo.push(pdfNoEmDash(d.text));
  }
  for (const ins of riskInsights.items) {
    if (executiveRisksRo.length >= 4) break;
    const line = typeof ins === "string" ? ins : String(ins);
    if (line && !executiveRisksRo.some((e) => e.slice(0, 40) === line.slice(0, 40))) {
      executiveRisksRo.push(pdfNoEmDash(line));
    }
  }
  if (executiveRisksRo.length === 0) {
    executiveRisksRo.push(
      "Nu am identificat riscuri critice explicite din motor; riscurile rămân la verificare practică.",
    );
  }

  const firstLeverage = pdfNegotiationAssistant.leverageBulletsRo[0];
  const executiveNegotiationAngleRo = pdfNoEmDash(
    firstLeverage?.length
      ? firstLeverage
      : pdfNegotiationAssistant.strategy.bodyRo.length > 24
        ? `${pdfNegotiationAssistant.strategy.bodyRo.split(".")[0] ?? pdfNegotiationAssistant.strategy.bodyRo}.`
        : pdfNegotiationAssistant.strategy.bodyRo,
  );

  const hasBaseline = bestRange != null && priceEur != null;
  const diffVsFairExplanationRo = buildPdfDiffExplanationRo(
    negotiationOverpricingPct,
    reportDataQualityForPdf.canShowStrongPricePositionLanguage,
    hasBaseline,
  );
  const dataGapsRo = reportDataQualityForPdf.reasonsRo.map(pdfNoEmDash);
  const methodologyBodyRo = pdfNoEmDash(
    "Preturile de reper se bazează pe anunțuri similare din zonă, filtrate și ajustate în model. Concluzia nu e tranzacție, nu e evaluare ANEVAR, și nu ține loc de certitudine. Riscurile includ surse publice, cu posibile nepotriviri de adresă sau date incomplete. Pentru o decizie mare, validează pe teren, la asociație, la notar și, dacă e cazul, la specialist structură sau juridic.",
  );
  const reportDateRo = new Date().toLocaleDateString("ro-RO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const compsConfidenceNoteRo = `${reportConfidenceForPdf.shortExplanationRo} Am folosit ${comps} comparabile apropiate în acest studiu, cu limitările domeniului public.`;

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
    notarialShowNeutralNote,
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
    buyerVerdictKey: verdict.buyerVerdict.key,
    buyerVerdictTitle: verdict.buyerVerdict.title,
    buyerVerdictSubtitle: verdict.buyerVerdict.subtitle,
    reportConfidenceLabelRo: reportConfidenceForPdf.labelRo,
    reportConfidenceShortRo: reportConfidenceForPdf.shortExplanationRo,
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
    canShowYield: reportDataQualityForPdf.canShowYield,
    reportDataQuality: reportDataQualityForPdf.reportQuality,

    reportDateRo,
    coverDisclaimerShortRo:
      "Document informativ pentru cumpărător, nu consultanță juridică și nu evaluare ANEVAR. Verifică orice cifră la fața locului.",
    fairRangeLow: bestRange?.low ?? null,
    fairRangeMid: bestRange?.mid ?? null,
    fairRangeHigh: bestRange?.high ?? null,
    fairRangeSource:
      compsFairRange && compsFairRange.compsUsed > 0 ? ("comparabile" as const) : ("model" as const),
    diffVsFairPct: negotiationOverpricingPct,
    diffVsFairExplanationRo,
    executiveRisksRo,
    executiveNegotiationAngleRo,
    dataGapsRo,
    compsConfidenceNoteRo,
    compRows: compRowsMapped,
    pdfNegotiation: {
      strategyTitleRo: pdfNegotiationAssistant.strategy.titleRo,
      strategyBodyRo: pdfNegotiationAssistant.strategy.bodyRo,
      leverageBulletsRo: pdfNegotiationAssistant.leverageBulletsRo,
      practicalQuestionsRo: pdfNegotiationAssistant.practicalQuestionsRo,
      suggestedMessageRo: pdfNegotiationAssistant.suggestedMessageRo,
    },
    finalChecklistRo: PDF_FINAL_CHECKLIST_RO,
    methodologyBodyRo,
  };
}
