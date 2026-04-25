import { notFound } from "next/navigation";
import React from "react";

import { BuyerReportTrustNote } from "@/components/common/buyer-report-trust-note";
import { ReportDisclaimer } from "@/components/common/ReportDisclaimer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisFailureRecovery } from "@/components/analyze/AnalysisFailureRecovery";
import { auth } from "@/lib/auth";
import { reasonFromAnalysisRecord } from "@/lib/analyze/analyze-failure-reasons";
import { canViewFullReport, formatUnlockButtonLabel } from "@/lib/billing/report-unlock";
import {
  checkReducedVATEligibility,
  computePriceWithVAT,
  detectDevelopmentStatus,
} from "@/lib/analysis/development-detect";
import { prisma } from "@/lib/db";
import { flags } from "@/lib/feature-flags";
import { flags as appFlags } from "@/lib/flags";
import { geocodeWithNominatim, inferLocationFromText, nearestStationM } from "@/lib/geo";
import { normalizeReportPhotoEntry } from "@/lib/media/normalize-report-photo";
import { getTransportSummary } from "@/lib/geo/transport";
import { computeVibeScores } from "@/lib/geo/vibe";
import type { LlmTextExtraction, LlmVisionExtraction } from "@/lib/llm/types";
import estimatePriceRange, { type AreaStats } from "@/lib/ml/avm";
import estimateTTS from "@/lib/ml/tts";
import {
  detectPropertyType,
  isHouseType,
  isNonResidential,
  propertyScoreLabel,
  propertyTypeLabel,
  sanitizeRooms,
} from "@/lib/property-type";
import {
  buildWhatsAppDraft,
  generateNegotiationPoints,
  type NegotiationInput,
} from "@/lib/report/negotiation";
import { computePriceVerdictPill } from "@/lib/report/price-verdict-badge";
import { computeFairRange, type FairPriceResult, findComparables } from "@/lib/report/pricing";
import { buildReportDataQualityGate } from "@/lib/report/data-quality-gate";
import { medianEurM2FromCompRows } from "@/lib/report/comps-section-metrics";
import { buildReportConfidenceExplanation } from "@/lib/report/report-confidence-explanation";
import { buildReportSellability } from "@/lib/report/report-sellability";
import { buildNegotiationAssistant } from "@/lib/report/negotiation-assistant";
import {
  isPublicSampleReportView,
  PUBLIC_SAMPLE_REPORT_ANALYSIS_ID,
} from "@/lib/report/sample-public-report";
import { resolveNotarialDisplayForReport } from "@/lib/notarial/notarial-validate";
import { buildQuickTake, computeExecutiveVerdict, type VerdictInput } from "@/lib/report/verdict";
import {
  applyReportRiskVisibility,
  buildRecommendedNextStep,
  buildRiskInsights,
  normalizeRiskStack,
  orderRiskLayerKeysForReport,
  RISK_LAYER_LABELS,
} from "@/lib/risk/executive";
import { getAirQuality } from "@/lib/risk/aqicn";
import { mapSeismicExplainToBuyerView } from "@/lib/risk/seismic-label";
import { matchSeismic } from "@/lib/risk/seismic";
import { type ApartmentScoreInput, computeApartmentScore } from "@/lib/score/apartmentScore";
import type { NormalizedFeatures } from "@/lib/types/pipeline";

import AnalysisLoading from "./AnalysisLoading";
import { LlmEnrichTrigger } from "./LlmEnrichTrigger";
import NeighborhoodIntelV2 from "./NeighborhoodIntelV2Lazy";
import { PdfActions } from "./PdfActions";
import { ReportUnlockPostPaymentBanner } from "./ReportUnlockPostPaymentBanner";
import ReportChat from "./ReportChat";
import AcquisitionCostsSection from "./sections/AcquisitionCostsSection";
import ApartmentScoreSection from "./sections/ApartmentScoreSection";
import BuyerInvestmentSection from "./sections/BuyerInvestmentSection";
import DataInsightsSection from "./sections/DataInsightsSection";
import ExecutiveSummarySection from "./sections/ExecutiveSummarySection";
import ReportAboveFoldHeader from "./sections/ReportAboveFoldHeader";
import ReportCollapsible from "./sections/ReportCollapsible";
import ReportConfidenceStrip from "./sections/ReportConfidenceStrip";
import type { QuickMetricItem } from "./sections/ReportQuickMetricsStrip";
import ListingHistorySection from "./sections/ListingHistorySection";
import ListingInsightsSection from "./sections/ListingInsightsSection";
import MethodologySection from "./sections/MethodologySection";
import NegotiationAssistantSection from "./sections/NegotiationAssistantSection";
import PriceAnchorsSection from "./sections/PriceAnchorsSection";
import ReportCompsSection from "./sections/ReportCompsSection";
import SellerChecklist from "./sections/SellerChecklist";
import TransportSection from "./sections/TransportSection";
import ReportRiskSection from "@/components/report/ReportRiskSection";
import VerdictSection from "./sections/VerdictSection";
import { FunnelTrackReportUnlockedView } from "@/components/tracking/FunnelReportViews";

import { ExempluRealListingCta } from "@/components/report/ExempluRealListingCta";
import { ViewTracker } from "./ViewTracker";
import {
  buildPreliminarySignal,
  buildPreviewTeaser,
  ReportPreviewPanel,
} from "./report-preview-panel";
import { getLaunchPriceBadgeRo } from "@/lib/copy/launch-pricing-ro";
import { getReportPageIndexable } from "@/lib/seo/report-page-indexing";
import { PaidReportFeedback } from "./PaidReportFeedback";

export const dynamic = "force-dynamic";

const PHOTO_BLACKLIST_PATTERNS = [
  /google\s*play/i,
  /app\s*store/i,
  /badge/i,
  /logo/i,
  /icon/i,
  /favicon/i,
  /avatar/i,
  /placeholder/i,
  /banner/i,
  /sprite/i,
  /widget/i,
  /play\.google\.com/i,
  /apple\.com\/.*badge/i,
  /\.svg$/i,
  /\/agent\//i,
  /\/similar\//i,
  /\/recomandate\//i,
  // omit /thumbnail/ and /ads/ — real listing CDNs often use these path segments
  /1x1\./i,
  /pixel\./i,
  /profile[-_]?pic/i,
];

function isPropertyPhoto(url: string): boolean {
  return !PHOTO_BLACKLIST_PATTERNS.some((p) => p.test(url));
}

/** Same-origin proxy avoids hotlink blocks; /api/img enforces domain allowlist. */
function reportGalleryImgSrc(absoluteUrl: string): string {
  if (absoluteUrl.startsWith("http")) {
    return `/api/img?w=1280&src=${encodeURIComponent(absoluteUrl)}`;
  }
  return absoluteUrl;
}

function looksLikeAddress(raw: string): boolean {
  if (!raw || raw.length < 5 || raw.length > 300) return false;
  const lower = raw.toLowerCase();
  const nonAddressPatterns = [
    /^descriere/,
    /^detalii/,
    /^informatii/,
    /^contact/,
    /^galerie/,
    /^vezi /,
    /^citeste/,
    /^afiseaza/,
    /^anunt/,
    /^oferta$/,
    /pre[tț]\s+\d/, // contains price like "preț 124.000"
    /\bimobiliare\.ro\b/i, // contains source name
    /\bstoria\.ro\b/i,
    /\bolx\.ro\b/i,
    /\d+\s*€/, // contains euro amounts
    /\+\s*TVA/i, // contains "+TVA"
  ];
  if (nonAddressPatterns.some((p) => p.test(lower))) return false;
  return true;
}

function isStreetAddress(raw: unknown): boolean {
  if (typeof raw !== "string" || !raw) return false;
  const lower = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const streetPatterns = [
    /\bstr\.?\s/i,
    /\bstrada\s/i,
    /\bbld\.?\s/i,
    /\bbulevardul\s/i,
    /\bcalea\s/i,
    /\bsoseaua\s/i,
    /\bsos\.?\s/i,
    /\baleea\s/i,
    /\bsplaiul\s/i,
    /\bpiata\s/i,
    /\bnr\.?\s?\d/i,
    /\bbloc\s/i,
    /\bintrarea\s/i,
    /\bdrumul\s/i,
  ];
  return streetPatterns.some((p) => p.test(lower));
}

function extractSectorDisplay(
  raw: string | null | undefined,
  areaSlug: string | null | undefined,
): string | null {
  if (raw) {
    const m = raw.match(/sector(?:ul)?\s*(\d)/i);
    if (m) return `Sector ${m[1]}`;
  }
  if (areaSlug) {
    const m = areaSlug.match(/sector-?(\d)/i);
    if (m) return `Sector ${m[1]}`;
  }
  return null;
}

function formatAreaLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeReportSellerType(raw: unknown): string | null {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!s) return null;
  if (s === "agentie" || s === "agenție" || s.includes("agent")) return "agentie";
  if (s === "proprietar" || s.includes("owner")) return "proprietar";
  if (s === "dezvoltator" || s.includes("dezvolt")) return "dezvoltator";
  return null;
}

function buildApproximateLocationLabel(
  addressRaw: unknown,
  title: string | null | undefined,
  areaSlug: string | null | undefined,
  description: string | null | undefined,
): string | null {
  if (typeof addressRaw === "string" && addressRaw && !isStreetAddress(addressRaw)) {
    return addressRaw.replace(/,\s*Bucuresti$/i, "").trim();
  }

  const normalizedAddress = typeof addressRaw === "string" ? addressRaw : null;
  const inferred = inferLocationFromText(title, description, normalizedAddress);
  if (inferred?.hint) {
    return inferred.hint
      .replace(/^zona\s+/i, "")
      .replace(/^aproape de metrou\s+/i, "Metrou ")
      .replace(/^complex\s+/i, "")
      .trim();
  }

  if (areaSlug) {
    return formatAreaLabel(areaSlug);
  }

  return null;
}

function buildGoogleMapsUrl(
  lat: number | null | undefined,
  lng: number | null | undefined,
  addressRaw: string | null | undefined,
  isStreet: boolean,
): string {
  if (lat && lng) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  if (addressRaw && isStreet) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressRaw + ", Bucuresti")}`;
  }
  return "";
}

/** Prevent garbage data (JSON blobs, HTML) from rendering in the UI. */
function safeDisplay(val: unknown, maxLen = 30): string {
  if (val == null) return "-";
  const s = String(val).trim();
  if (!s) return "-";
  if (s.startsWith("{") || s.startsWith("[") || s.startsWith("<")) return "-";
  if (s.length > maxLen) return s.slice(0, maxLen) + "...";
  return s;
}

/** Format floor for display: ground_floor -> Parter, floor_1 -> Etaj 1, 1/7 -> Etaj 1/7 */
function displayFloor(val: unknown): string {
  if (val == null) return "-";
  const raw = String(val).trim().toLowerCase();
  if (!raw || raw === "null" || raw === "undefined") return "-";

  const GROUND = ["ground_floor", "ground", "parter", "p", "0", "floor_0"];
  const DEMISOL = ["demisol", "subsol", "-1", "basement"];
  const MANSARDA = ["mansarda", "mansardă", "attic", "99"];

  if (GROUND.includes(raw)) return "Parter";
  if (DEMISOL.includes(raw)) return "Demisol";
  if (MANSARDA.includes(raw)) return "Mansarda";

  // Handle English format: floor_1, floor_2, floor_10
  const floorUnderscore = raw.match(/^floor[_\s]+(\d{1,2})$/i);
  if (floorUnderscore) return `Etaj ${floorUnderscore[1]}`;

  const slash = raw.match(
    /^(p|parter|ground_floor|ground|floor_?\d{0,2}|\d{1,2})\s*\/\s*(\d{1,2})$/i,
  );
  if (slash) {
    const left = slash[1].toLowerCase();
    const total = slash[2];
    if (GROUND.includes(left)) return `Parter/${total}`;
    const leftNum = left.match(/\d+/);
    if (leftNum) return `Etaj ${leftNum[0]}/${total}`;
    return `Etaj ${left}/${total}`;
  }

  const etaj = raw.match(/^(?:etaj\s*)?(\d{1,2})$/i);
  if (etaj) return `Etaj ${etaj[1]}`;

  return safeDisplay(val);
}

type Props = {
  params: Promise<{ id?: string | string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function portalLabelFromUrl(sourceUrl: string | null | undefined): string {
  if (!sourceUrl) return "—";
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return "—";
  }
}

async function loadAnalysis(id: string) {
  return prisma.analysis.findUnique({
    where: { id },
    include: {
      extractedListing: true,
      featureSnapshot: true,
      scoreSnapshot: true,
      group: true,
    },
  });
}

export default async function ReportPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const id = Array.isArray(resolvedParams.id) ? resolvedParams.id[0] : resolvedParams.id;
  if (!id) throw new Error("Missing report id");
  const sp = (await searchParams) ?? {};
  const exempluQ = sp.exemplu;
  const isPublicSample = isPublicSampleReportView(
    id,
    typeof exempluQ === "string" ? exempluQ : Array.isArray(exempluQ) ? exempluQ[0] : undefined,
  );
  const unlockedQ = sp.unlocked;
  const justPaid =
    (typeof unlockedQ === "string" && unlockedQ === "1") ||
    (Array.isArray(unlockedQ) && unlockedQ[0] === "1");
  const [analysis, paidUnlockForFeedback, existingReportFeedback] = await Promise.all([
    loadAnalysis(id),
    prisma.reportUnlock.findFirst({
      where: { analysisId: id, status: "paid" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }),
    prisma.reportFeedback.findUnique({
      where: { analysisId: id },
      select: { id: true },
    }),
  ]);

  if (!analysis) {
    notFound();
  }

  const extracted = analysis.extractedListing ?? null;
  const f = (analysis.featureSnapshot?.features ?? null) as NormalizedFeatures | null;
  const sourceMeta = (extracted as Record<string, unknown> | null)?.sourceMeta as
    | Record<string, unknown>
    | undefined;
  const listingDescription =
    typeof sourceMeta?.description === "string" ? sourceMeta.description : null;
  const rawRooms = (extracted?.rooms ?? f?.rooms ?? null) as number | null;
  const saneRooms = sanitizeRooms(rawRooms, extracted?.title as string | null);
  const propType = detectPropertyType(extracted?.title as string | null, saneRooms);
  const propLabel = propertyTypeLabel(propType);
  const propScoreLabel = propertyScoreLabel(propType);
  const isHouse = isHouseType(propType);
  const isUnsupportedType = isNonResidential(propType);

  const TERMINAL_STATUSES = [
    "done",
    "error",
    "failed",
    "rejected_rental",
    "rejected_not_realestate",
  ];
  if (!TERMINAL_STATUSES.includes(analysis.status ?? "")) {
    return (
      <AnalysisLoading
        status={analysis.status ?? "processing"}
        title={analysis.extractedListing?.title}
      />
    );
  }

  const comps = await prisma.compMatch.findMany({
    where: { analysisId: id },
    orderBy: { score: "desc" },
    take: 12,
  });

  // Comps-driven fair price range (gated)
  let compsFairRange: FairPriceResult | null = null;
  if (flags.pricingV2) {
    const subjectArea =
      extracted?.areaM2 ??
      ((analysis?.featureSnapshot?.features as Record<string, unknown>)?.areaM2 as number) ??
      null;
    if (subjectArea && subjectArea > 0) {
      try {
        const feat = (analysis.featureSnapshot?.features ?? {}) as NormalizedFeatures;
        const tightComps = await findComparables({
          analysisId: id,
          lat: feat.lat ?? null,
          lng: feat.lng ?? null,
          areaM2: subjectArea,
          rooms: saneRooms,
          yearBuilt: feat.yearBuilt ?? extracted?.yearBuilt ?? null,
        });
        compsFairRange = computeFairRange(tightComps, subjectArea);
      } catch {
        /* non-fatal - fall back to area-stats AVM */
      }
    }
  }

  // Listing history & integrity data (gated)
  const cutoff90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const integrityData = flags.integrity
    ? await Promise.all([
        prisma.listingSnapshot.findMany({
          where: { listingId: id, capturedAt: { gte: cutoff90d } },
          orderBy: { capturedAt: "asc" },
          select: { capturedAt: true, priceEur: true, status: true },
        }),
        prisma.listingDuplicate.findMany({
          where: { OR: [{ listingIdA: id }, { listingIdB: id }] },
          orderBy: { confidence: "desc" },
          take: 10,
          include: {
            analysisA: { include: { extractedListing: { select: { title: true } } } },
            analysisB: { include: { extractedListing: { select: { title: true } } } },
          },
        }),
      ])
    : null;
  const rawSnapshots = integrityData?.[0] ?? [];
  const rawDuplicates = integrityData?.[1] ?? [];

  const historySnapshots = rawSnapshots.map((s) => ({
    capturedAt: s.capturedAt.toISOString(),
    priceEur: s.priceEur,
    status: s.status as "ACTIVE" | "REMOVED" | "UNKNOWN",
  }));

  const historyDuplicates = rawDuplicates.map((d) => {
    const isA = d.listingIdA === id;
    const otherAnalysisId = isA ? d.listingIdB : d.listingIdA;
    const otherAnalysis = isA ? d.analysisB : d.analysisA;
    return {
      id: d.id,
      analysisId: otherAnalysisId,
      reason: d.reason as "TEXT_HASH" | "IMAGES_HASH" | "ADDRESS_NEAR",
      confidence: d.confidence,
      sourceUrl: (isA ? d.analysisB : d.analysisA).sourceUrl,
      title: otherAnalysis.extractedListing?.title ?? null,
    };
  });

  // Score explain data
  const scoreExplain = analysis.scoreSnapshot?.explain as Record<string, unknown> | null;
  const rentExplainBlock = scoreExplain?.rent as { rentEur?: number } | undefined;
  const rentEurFromSnapshot = rentExplainBlock?.rentEur ?? null;
  const yieldGrossSnapshot = analysis.scoreSnapshot?.yieldGross ?? null;
  const yieldNetSnapshot = analysis.scoreSnapshot?.yieldNet ?? null;
  const compsExplain = scoreExplain?.comps as Record<string, unknown> | undefined;
  const compsStats = compsExplain?.eurM2 as
    | { median?: number; q1?: number; q3?: number }
    | undefined;
  const confidenceData = scoreExplain?.confidence as { level: string; score: number } | undefined;
  const avmExplain = scoreExplain?.avm as Record<string, unknown> | undefined;

  // Compute AVM
  let priceRange: { low: number; high: number; mid: number; conf: number } | null = null;
  let ttsResult: Awaited<ReturnType<typeof estimateTTS>> | null = null;
  let seismic: { level: "RS1" | "RS2" | "RS3" | "RS4" | "None"; sourceUrl?: string | null } = {
    level: "None",
  };

  const areaSlug = f?.areaSlug ?? ((f as Record<string, unknown>)?.area_slug as string | undefined);
  const isRon = String(extracted?.currency ?? "").toUpperCase() === "RON";
  const ronToEurRate = Number(
    process.env.EURRON_RATE ?? process.env.EXCHANGE_RATE_EUR_TO_RON ?? 4.95,
  );
  const priceEurConverted =
    isRon && extracted?.price ? Math.round((extracted.price as number) / ronToEurRate) : null;
  const actualPrice: number | null =
    f?.priceEur ??
    ((f as Record<string, unknown>)?.price_eur as number | undefined) ??
    priceEurConverted ??
    (extracted?.price as number | undefined) ??
    null;

  if (areaSlug) {
    const ad = await prisma.areaDaily.findFirst({
      where: { areaSlug: String(areaSlug) },
      orderBy: { date: "desc" },
    });

    const areaStats: AreaStats = {
      medianEurPerM2: ad?.medianEurM2 ?? 1500,
      count: ad?.supply ?? 1,
    };
    const estimatedRange = estimatePriceRange(f as NormalizedFeatures, areaStats);
    if (estimatedRange.low != null && estimatedRange.high != null && estimatedRange.mid != null) {
      priceRange = {
        low: estimatedRange.low,
        high: estimatedRange.high,
        mid: estimatedRange.mid,
        conf: estimatedRange.conf,
      };
    }

    if (priceRange) {
      try {
        const avmMid = Math.round((priceRange.low + priceRange.high) / 2);
        ttsResult = await estimateTTS({
          avmMid,
          asking: actualPrice ?? undefined,
          areaSlug: areaSlug,
          month: new Date().getMonth() + 1,
          areaM2: f?.areaM2 ?? (extracted?.areaM2 as number) ?? undefined,
          conditionScore: f?.conditionScore ?? undefined,
        });

        seismic = await matchSeismic(
          extracted?.lat ?? f?.lat,
          extracted?.lng ?? f?.lng,
          extracted?.addressRaw ?? f?.addressRaw ?? undefined,
        );
      } catch {
        /* scoring errors are non-fatal */
      }
    }
  }

  // Price anchors: local range needs areaSlug + AreaDaily. Pipeline AVM lives on ScoreSnapshot;
  // without this fallback, avmMid stays null, PriceAnchorsSection can hide entirely (incl. notarial).
  const snapForAnchors = analysis.scoreSnapshot;
  const priceAnchorsRange =
    priceRange ??
    (snapForAnchors?.avmMid != null
      ? {
          low: Math.round(snapForAnchors.avmLow ?? snapForAnchors.avmMid!),
          high: Math.round(snapForAnchors.avmHigh ?? snapForAnchors.avmMid!),
          mid: Math.round(snapForAnchors.avmMid!),
          conf: snapForAnchors.avmConf ?? 0,
        }
      : null);

  const notarialResolved = resolveNotarialDisplayForReport({
    scoreSnapshot: analysis.scoreSnapshot
      ? {
          notarialTotal: analysis.scoreSnapshot.notarialTotal,
          notarialEurM2: analysis.scoreSnapshot.notarialEurM2,
          notarialZone: analysis.scoreSnapshot.notarialZone,
          notarialYear: analysis.scoreSnapshot.notarialYear,
          explain: analysis.scoreSnapshot.explain,
        }
      : null,
    askingPriceEur: actualPrice,
    avmMidEur: priceAnchorsRange?.mid ?? analysis.scoreSnapshot?.avmMid ?? null,
    features: {
      ...((f ?? {}) as Record<string, unknown>),
      title: extracted?.title ?? ((f ?? {}) as Record<string, unknown>).title,
      rooms: extracted?.rooms ?? ((f ?? {}) as Record<string, unknown>).rooms,
    },
  });
  const notarialTotal = notarialResolved.notarialTotal;
  const notarialZone = notarialResolved.notarialZone;
  const notarialYear = notarialResolved.notarialYear;
  const notarialEurM2Display = notarialResolved.notarialEurM2;
  const notarialConfidence = notarialResolved.confidence;
  const notarialShowNeutralNote = notarialResolved.showNeutralNote;

  // Neighborhood Vibe Index + Transport summary (gated)
  let vibeResult: Awaited<ReturnType<typeof computeVibeScores>> | null = null;
  let transportResult: Awaited<ReturnType<typeof getTransportSummary>> | null = null;
  const approximateLocationLabel = buildApproximateLocationLabel(
    extracted?.addressRaw ?? null,
    extracted?.title ?? null,
    areaSlug ?? null,
    listingDescription,
  );

  // Use extracted lat/lng first, then static inference, then Nominatim geocoding
  let geoLat = f?.lat ?? null;
  let geoLng = f?.lng ?? null;
  let locationInferred = false;
  if (geoLat == null || geoLng == null) {
    const hint = inferLocationFromText(
      extracted?.title ?? null,
      listingDescription,
      extracted?.addressRaw ?? null,
    );
    if (hint) {
      geoLat = hint.lat;
      geoLng = hint.lng;
      locationInferred = true;
    } else {
      // Nominatim fallback: try address first, then title keywords
      const geoQuery =
        (extracted?.addressRaw as string | null) ?? (extracted?.title as string | null);
      if (geoQuery) {
        const geo = await geocodeWithNominatim(geoQuery).catch(() => null);
        if (geo) {
          geoLat = geo.lat;
          geoLng = geo.lng;
          locationInferred = true;
        }
      }
    }
  }

  let airQualityReading: Awaited<ReturnType<typeof getAirQuality>> = null;
  if (geoLat != null && geoLng != null) {
    const [vibe, transport, airQ] = await Promise.all([
      flags.poi ? computeVibeScores(geoLat, geoLng).catch(() => null) : Promise.resolve(null),
      flags.transport
        ? getTransportSummary(geoLat, geoLng).catch(() => null)
        : Promise.resolve(null),
      getAirQuality(geoLat, geoLng).catch(() => null),
    ]);
    vibeResult = vibe;
    transportResult = transport;
    airQualityReading = airQ;
  }

  // Tier check for notarial data visibility
  // TODO: re-enable paywall before going live
  const showNotarial = true;
  // if (userId) {
  //   try {
  //     const { canAccess } = await import("@/lib/billing/entitlements");
  //     const access = await canAccess(userId, "detailedScore");
  //     showNotarial = access.allowed;
  //   } catch { /* free tier by default */ }
  // }
  // if (isAdmin) showNotarial = true;

  // LLM enrichment data (read from DB, never call LLM here)
  const llmText = extracted?.llmTextExtract as unknown as LlmTextExtraction | null;
  const llmVision = extracted?.llmVisionExtract as unknown as LlmVisionExtraction | null;
  const isLlmEnriching = analysis?.status === "done" && !extracted?.llmEnrichedAt;
  const llmFailed = !!extracted?.llmEnrichedAt && !llmText;
  const showVision = showNotarial; // Pro tier sees vision data

  // Compute derived values for sections
  const overpricingPct =
    actualPrice && priceRange?.mid
      ? Math.round(((actualPrice - priceRange.mid) / priceRange.mid) * 100)
      : null;

  const seismicExplain = scoreExplain?.seismic as Record<string, unknown> | undefined;
  const riskStackExplain = scoreExplain?.riskStack as Record<string, unknown> | undefined;
  const titleMentionsRisk =
    /risc\s*seismic|bulina\s*rosie|clasa\s*de\s*risc|expertiza\s*tehnic/.test(
      `${extracted?.title ?? ""} ${((extracted?.sourceMeta as Record<string, unknown>)?.description as string) ?? ""}`.toLowerCase(),
    );
  const buyerSeismicView = mapSeismicExplainToBuyerView(seismicExplain, titleMentionsRisk);
  const normalizedRiskStack = applyReportRiskVisibility(
    normalizeRiskStack(riskStackExplain ?? null, seismicExplain ?? null),
  );
  const orderedRiskKeys = orderRiskLayerKeysForReport(normalizedRiskStack.layers);
  const riskInsightBlock = buildRiskInsights(normalizedRiskStack, orderedRiskKeys);
  const riskRecommendedNextStep = buildRecommendedNextStep(
    normalizedRiskStack,
    riskInsightBlock.dominantKey,
  );
  const dominantRiskLabel = riskInsightBlock.dominantKey
    ? RISK_LAYER_LABELS[riskInsightBlock.dominantKey]
    : null;
  const dominantRiskSummary = riskInsightBlock.dominantKey
    ? normalizedRiskStack.layers[riskInsightBlock.dominantKey].summary
    : null;

  // Override seismic from pipeline data if available
  if (seismicExplain?.riskClass) {
    const rc = String(seismicExplain.riskClass);
    const mappedLevel =
      rc === "RsI" || rc === "RS1"
        ? "RS1"
        : rc === "RsII" || rc === "RS2"
          ? "RS2"
          : rc === "RsIII" || rc === "RS3"
            ? "RS3"
            : rc === "RsIV" || rc === "RS4"
              ? "RS4"
              : "None";
    seismic = {
      level: mappedLevel as typeof seismic.level,
      sourceUrl: (seismicExplain.sourceUrl as string) ?? null,
    };
  }

  // Executive summary verdict - prefer comps-driven range
  const bestRange =
    compsFairRange && compsFairRange.compsUsed > 0
      ? { low: compsFairRange.fairMin, mid: compsFairRange.fairMid, high: compsFairRange.fairMax }
      : priceRange;
  /** Peste/sub reperul de preț folosit în restul raportului (comparabile când există, altfel AVM). */
  const negotiationOverpricingPct =
    actualPrice && bestRange?.mid
      ? Math.round(((actualPrice - bestRange.mid) / bestRange.mid) * 100)
      : null;
  // Negotiation points
  const seismicNearby = seismicExplain?.nearby as
    | { total?: number; buildings?: { distanceM: number }[] }
    | undefined;
  const negotiationInput: NegotiationInput = {
    askingPrice: actualPrice ?? null,
    fairMin: compsFairRange?.fairMin ?? bestRange?.low ?? null,
    fairMax: compsFairRange?.fairMax ?? bestRange?.high ?? null,
    fairMid: compsFairRange?.fairMid ?? bestRange?.mid ?? null,
    medianEurM2: compsFairRange?.medianEurM2 ?? compsStats?.median ?? null,
    compsUsed: compsFairRange?.compsUsed ?? comps.length,
    currency: extracted?.currency ?? "EUR",
    areaM2: extracted?.areaM2 ?? (f?.areaM2 as number) ?? null,
    rooms: saneRooms,
    yearBuilt: extracted?.yearBuilt ?? f?.yearBuilt ?? null,
    floor: isHouse ? null : (f?.level ?? null),
    hasParking: llmText?.hasParking ?? null,
    hasElevator: llmText?.hasElevator ?? null,
    condition: llmText?.condition ?? null,
    priceDrops: (() => {
      let count = 0;
      for (let i = 1; i < historySnapshots.length; i++) {
        if ((historySnapshots[i].priceEur ?? 0) < (historySnapshots[i - 1].priceEur ?? 0)) count++;
      }
      return count;
    })(),
    maxDropAmount: (() => {
      let maxDrop = 0;
      for (let i = 1; i < historySnapshots.length; i++) {
        const prev = historySnapshots[i - 1].priceEur ?? 0;
        const curr = historySnapshots[i].priceEur ?? 0;
        if (curr < prev) maxDrop = Math.max(maxDrop, prev - curr);
      }
      return maxDrop;
    })(),
    totalSnapshots: historySnapshots.length,
    duplicateCount: historyDuplicates.length,
    wasRemoved:
      historySnapshots.some((s) => s.status === "REMOVED") &&
      historySnapshots.some(
        (s, i) =>
          s.status === "REMOVED" &&
          historySnapshots.slice(i + 1).some((n) => n.status === "ACTIVE"),
      ),
    seismicRiskClass:
      (seismicExplain?.riskClass as string) ?? (seismic.level !== "None" ? seismic.level : null),
    seismicNearbyCount: seismicNearby?.total ?? 0,
    seismicNearbyClosestM: seismicNearby?.buildings?.[0]?.distanceM ?? null,
    nightlifeScore: vibeResult?.scores?.nightlifeScore ?? null,
    zoneTypeKey: vibeResult?.scores?.zoneTypeKey ?? null,
    transitScore: transportResult?.transitScore ?? null,
    nearestMetroName: transportResult?.nearestMetro?.name ?? null,
    nearestMetroMinutes: transportResult?.nearestMetro?.walkMinutes ?? null,
  };
  const negotiationPoints = generateNegotiationPoints(negotiationInput);
  const whatsAppDraft = buildWhatsAppDraft(
    negotiationPoints,
    extracted?.title ?? null,
    actualPrice ?? null,
    negotiationInput.fairMid,
    negotiationInput.currency,
  );

  // Under-construction detection
  const yearBuiltVal = (extracted?.yearBuilt ?? f?.yearBuilt ?? null) as number | null;
  const devPriceText = sourceMeta?.plusTVA ? "+ TVA" : null;
  const devSignals = detectDevelopmentStatus(
    extracted?.title as string | null,
    listingDescription,
    yearBuiltVal,
    sourceMeta?.sellerType as string | null,
    devPriceText as string | null,
  );

  // VAT computation
  const hasPlusTVA = devSignals.hasVAT || sourceMeta?.plusTVA === true;
  const vatRate = devSignals.vatRate ?? (hasPlusTVA ? 19 : null);
  const vatComputed =
    hasPlusTVA && actualPrice && vatRate ? computePriceWithVAT(actualPrice, vatRate) : null;
  const reducedVATCheck =
    hasPlusTVA && actualPrice && (extracted?.areaM2 as number | undefined)
      ? checkReducedVATEligibility(actualPrice, extracted?.areaM2 as number)
      : null;

  // Data confidence (user-facing; caps strong buyer verdict when data is thin)
  const featuresForConfidence = (f ?? {}) as NormalizedFeatures;
  const pipelineConfLevel = confidenceData?.level;
  const pipelineLevelResolved =
    pipelineConfLevel === "high" || pipelineConfLevel === "medium" || pipelineConfLevel === "low"
      ? pipelineConfLevel
      : null;
  const oldestCompDaysFromExplain =
    typeof compsExplain?.oldestCompDays === "number" ? compsExplain.oldestCompDays : null;
  const reportConfidenceExplanation = buildReportConfidenceExplanation({
    features: featuresForConfidence,
    compCount: comps.length,
    oldestCompDays: oldestCompDaysFromExplain,
    pipelineConfidenceLevel: pipelineLevelResolved,
    hasListingPrice: actualPrice != null && actualPrice > 0,
    hasListingArea:
      (extracted?.areaM2 ?? f?.areaM2) != null && Number(extracted?.areaM2 ?? f?.areaM2) > 0,
    hasListingRooms: saneRooms != null,
    hasFloor:
      extracted?.floor != null || extracted?.floorRaw != null || f?.level != null,
    hasYearBuilt: !!(extracted?.yearBuilt ?? f?.yearBuilt),
  });

  const hasAreaPriceBaselineForGate =
    (bestRange?.mid != null && bestRange.mid > 0) ||
    (analysis.scoreSnapshot?.avmMid != null && analysis.scoreSnapshot.avmMid > 0);

  const reportDataQualityGate = buildReportDataQualityGate({
    features: featuresForConfidence,
    compCount: comps.length,
    oldestCompDays: oldestCompDaysFromExplain,
    hasPrice: actualPrice != null && actualPrice > 0,
    hasArea:
      (extracted?.areaM2 ?? f?.areaM2) != null && Number(extracted?.areaM2 ?? f?.areaM2) > 0,
    hasRooms: saneRooms != null,
    hasYearBuilt: !!(extracted?.yearBuilt ?? f?.yearBuilt),
    hasAreaPriceBaseline: hasAreaPriceBaselineForGate,
    yieldGross: yieldGrossSnapshot,
    yieldNet: yieldNetSnapshot,
    riskStack: normalizedRiskStack,
  });

  const reportSellability = buildReportSellability({
    hasListingPrice: actualPrice != null && actualPrice > 0,
    hasListingArea:
      (extracted?.areaM2 ?? f?.areaM2) != null && Number(extracted?.areaM2 ?? f?.areaM2) > 0,
    compCount: comps.length,
    hasAreaPriceBaseline: hasAreaPriceBaselineForGate,
    confidenceLevel: confidenceData?.level,
  });

  const negotiationAssistant = buildNegotiationAssistant({
    title: extracted?.title ?? null,
    overpricingPct: negotiationOverpricingPct,
    confidenceLevel: confidenceData?.level,
    compsCount: comps.length,
    canShowStrongPricePosition: reportDataQualityGate.canShowStrongPricePositionLanguage,
    canShowSubstantiveNegotiation: reportDataQualityGate.canShowNegotiationArguments,
    hasYearBuilt: !!(extracted?.yearBuilt ?? f?.yearBuilt),
    seismicRiskClass: negotiationInput.seismicRiskClass,
    isRender:
      devSignals.isRender ||
      (llmVision?.isRender === true && (llmVision?.renderConfidence ?? 0) >= 0.6),
    isUnderConstruction: devSignals.isUnderConstruction,
    points: negotiationPoints,
  });
  const agentQuestionsCopyText = negotiationAssistant.practicalQuestionsRo
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n");

  // Executive verdict (depends on devSignals, hasPlusTVA, sourceMeta)
  const verdictInput: VerdictInput = {
    confidenceSuppressStrong: reportConfidenceExplanation.shouldSuppressStrongVerdict,
    dataQuality: {
      canShowPriceVerdict: reportDataQualityGate.canShowPriceVerdict,
      canShowStrongOverUnderLanguage: reportDataQualityGate.canShowStrongPricePositionLanguage,
      canShowLocationClaims: reportDataQualityGate.canShowNeighborhoodRiskClaims,
      canShowContextualRiskNarrative: !reportDataQualityGate.contextualRiskDataInsufficient,
      canShowFirmBuyerRecommendation: reportDataQualityGate.canShowStrongBuyerVerdict,
    },
    askingPrice: actualPrice ?? null,
    avmLow: bestRange?.low ?? null,
    avmMid: bestRange?.mid ?? null,
    avmHigh: bestRange?.high ?? null,
    currency: extracted?.currency ?? "EUR",
    confidenceLevel: confidenceData?.level ?? null,
    confidenceScore: confidenceData?.score ?? null,
    compsCount: comps.length,
    seismicRiskClass:
      (seismicExplain?.riskClass as string) ?? (seismic.level !== "None" ? seismic.level : null),
    seismicConfidence: (seismicExplain?.confidence as number) ?? null,
    seismicMethod: (seismicExplain?.method as string) ?? null,
    riskOverallLevel: normalizedRiskStack.overallLevel,
    riskOverallScore: normalizedRiskStack.overallScore,
    riskDominantKey: riskInsightBlock.dominantKey,
    riskDominantLabel: dominantRiskLabel,
    riskDominantSummary: dominantRiskSummary,
    riskRecommendedNextStep,
    riskInsights: riskInsightBlock.items,
    llmRedFlags: llmText?.redFlags ?? null,
    llmCondition: llmText?.condition ?? null,
    sellerMotivation: llmText?.sellerMotivation ?? null,
    transitScore: transportResult?.transitScore ?? null,
    vibeZoneTypeKey: vibeResult?.scores?.zoneTypeKey ?? null,
    yearBuilt: extracted?.yearBuilt ?? f?.yearBuilt ?? null,
    hasPhotos: Array.isArray(extracted?.photos) && (extracted.photos as unknown[]).length > 0,
    photoCount: Array.isArray(extracted?.photos) ? (extracted.photos as unknown[]).length : 0,
    rooms: saneRooms,
    areaM2: extracted?.areaM2 ?? f?.areaM2 ?? null,
    floor: isHouse ? null : (f?.level ?? null),
    totalFloors: (f?.totalFloors as number | null | undefined) ?? null,
    address: extracted?.addressRaw ?? null,
    title: extracted?.title ?? null,
    hasParking: llmText?.hasParking ?? null,
    hasElevator: (f?.hasLift as boolean | null | undefined) ?? null,
    heatingType: llmText?.heatingType ?? null,
    sellerType: (sourceMeta?.sellerType as string | null) ?? null,
    isUnderConstruction: devSignals.isUnderConstruction,
    isNeverLivedIn: sourceMeta?.neverLivedIn === true,
    hasPlusTVA,
    isRender: devSignals.isRender,
    photosAreRenders:
      devSignals.isRender ||
      (llmVision?.isRender === true && (llmVision?.renderConfidence ?? 0) >= 0.6),
    estimatedDelivery: devSignals.estimatedDelivery,
  };
  const executiveVerdict = computeExecutiveVerdict(verdictInput);
  const quickTake = buildQuickTake(verdictInput, executiveVerdict.verdict);

  // Apartment Score
  const apartmentScoreInput: ApartmentScoreInput = {
    listingPriceEur: actualPrice ?? undefined,
    fairLikelyEur: compsFairRange?.fairMid ?? bestRange?.mid ?? 0,
    range80: compsFairRange
      ? { min: compsFairRange.fairMin, max: compsFairRange.fairMax }
      : bestRange
        ? { min: bestRange.low, max: bestRange.high }
        : { min: 0, max: 0 },
    range95: bestRange
      ? { min: Math.round(bestRange.low * 0.9), max: Math.round(bestRange.high * 1.1) }
      : { min: 0, max: 0 },
    confidence: confidenceData?.score ?? 30,
    yearBucket:
      yearBuiltVal != null
        ? yearBuiltVal < 1977
          ? "<1977"
          : yearBuiltVal <= 1990
            ? "1978-1990"
            : yearBuiltVal <= 2005
              ? "1991-2005"
              : "2006+"
        : undefined,
    yearBuilt: yearBuiltVal ?? undefined,
    condition: (llmText?.condition as ApartmentScoreInput["condition"]) ?? undefined,
    floor: (f?.level as number) ?? undefined,
    totalFloors: (f?.totalFloors as number) ?? undefined,
    hasElevator: llmText?.hasElevator ?? undefined,
    hasParking: llmText?.hasParking ?? undefined,
    heatingType: llmText?.heatingType ?? undefined,
    rooms: saneRooms ?? undefined,
    areaM2: (extracted?.areaM2 as number) ?? (f?.areaM2 as number) ?? undefined,
    sellerType: sourceMeta?.sellerType as string | undefined,
    isUnderConstruction: devSignals.isUnderConstruction,
    isNeverLivedIn: sourceMeta?.neverLivedIn === true,
    liquidity: {
      daysMin: ttsResult?.minMonths != null ? ttsResult.minMonths * 30 : undefined,
      daysMax: ttsResult?.maxMonths != null ? ttsResult.maxMonths * 30 : undefined,
      label: ttsResult?.bucket ?? undefined,
    },
    integrity: {
      priceDrops: negotiationInput.priceDrops,
      reposts: historySnapshots.filter((s) => s.status === "REMOVED").length,
      duplicates: historyDuplicates.length,
    },
    geoIntel: {
      seismicRiskClass: seismic.level !== "None" ? seismic.level : undefined,
      metroWalkMin: transportResult?.nearestMetro?.walkMinutes ?? undefined,
      vibe: vibeResult?.scores
        ? {
            nightlife: vibeResult.scores.nightlifeScore,
            family: vibeResult.scores.familyScore,
            convenience: vibeResult.scores.convenienceScore,
            green: vibeResult.scores.greenScore,
          }
        : undefined,
    },
  };
  const apartmentScore = computeApartmentScore(apartmentScoreInput);

  const listingPriceForHeader =
    (extracted?.price as number | undefined) ?? actualPrice ?? null;
  const listingCurrencyForHeader = String(extracted?.currency ?? "EUR");
  const headerPriceSecondaryLine =
    isRon && priceEurConverted != null
      ? `≈ ${priceEurConverted.toLocaleString("ro-RO")} EUR echivalent`
      : null;

  const reportPriceFairness =
    reportDataQualityGate.canShowPriceVerdict &&
    reportDataQualityGate.canShowStrongPricePositionLanguage &&
    actualPrice != null &&
    actualPrice > 0 &&
    priceAnchorsRange?.mid != null &&
    priceAnchorsRange.mid > 0
      ? (() => {
          const pill = computePriceVerdictPill(actualPrice, priceAnchorsRange.mid);
          if (!pill) return null;
          return {
            pill,
            listedEur: actualPrice,
            estimatedMidEur: priceAnchorsRange.mid,
            listedExtraLine:
              isRon && extracted?.price
                ? `${(extracted.price as number).toLocaleString("ro-RO")} RON în anunț`
                : null,
          };
        })()
      : null;

  const decisionHeaderTitle =
    [approximateLocationLabel, propLabel].filter(Boolean).join(" · ") ||
    (extracted?.title as string) ||
    null;
  const headerAreaM2 = (extracted?.areaM2 as number | undefined) ?? f?.areaM2 ?? null;
  const headerEurPerM2 =
    actualPrice && headerAreaM2 && headerAreaM2 > 0
      ? Math.round(actualPrice / headerAreaM2)
      : null;
  const sellerTypeNormalized = normalizeReportSellerType(sourceMeta?.sellerType);
  const pricePositionShort = reportPriceFairness?.pill.label ?? null;

  const reportQuickMetrics: QuickMetricItem[] = (() => {
    const items: QuickMetricItem[] = [];
    if (ttsResult?.minMonths != null && ttsResult.maxMonths != null) {
      const d1 = Math.round(ttsResult.minMonths * 30);
      const d2 = Math.round(ttsResult.maxMonths * 30);
      items.push({ icon: "⏱", value: `${d1}–${d2}`, label: "zile (estimare vânzare)" });
    } else if (ttsResult?.bucket) {
      items.push({ icon: "⏱", value: ttsResult.bucket, label: "viteză vânzare" });
    }
    if (
      reportDataQualityGate.canShowStrongPricePositionLanguage &&
      overpricingPct != null &&
      bestRange?.mid
    ) {
      const v = overpricingPct > 0 ? `+${overpricingPct}%` : `${overpricingPct}%`;
      items.push({ icon: "📉", value: v, label: "vs. piață (estimare)" });
    }
    const cl = confidenceData?.level;
    if (cl === "high" || cl === "medium" || cl === "low") {
      const label = cl === "high" ? "ridicată" : cl === "medium" ? "medie" : "scăzută";
      items.push({ icon: "🎯", value: label, label: "precizie model" });
    }
    const rl = normalizedRiskStack.overallLevel;
    if (rl === "high") items.push({ icon: "⚠", value: "Ridicat", label: "risc agregat" });
    else if (rl === "medium") items.push({ icon: "⚠", value: "Mediu", label: "risc agregat" });
    else if (rl === "low") items.push({ icon: "⚠", value: "Scăzut", label: "risc agregat" });
    return items;
  })();

  const medianEurM2ForCompsSection =
    compsFairRange && compsFairRange.compsUsed > 0
      ? compsFairRange.medianEurM2
      : medianEurM2FromCompRows(comps.map((c) => c.eurM2));

  const seismicRiskClassForReport =
    String(seismicExplain?.riskClass ?? "").trim() ||
    (seismic.level !== "None" ? seismic.level : "") ||
    null;

  const siteBase = process.env.NEXT_PUBLIC_SITE_URL ?? "https://imobintel.ro";
  const reportJsonLd = extracted
    ? {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        name: isPublicSample
          ? "Raport exemplu ImobIntel (date demonstrative)"
          : extracted.title || "Apartament Bucuresti",
        description: listingDescription ? String(listingDescription).slice(0, 300) : undefined,
        url: isPublicSample
          ? `${siteBase}/raport-exemplu`
          : `${siteBase}/report/${analysis.id}`,
        datePosted: analysis.createdAt?.toISOString(),
        ...(extracted.price
          ? {
              offers: {
                "@type": "Offer",
                price: extracted.price,
                priceCurrency: "EUR",
                availability: "https://schema.org/InStock",
              },
            }
          : {}),
        ...(extracted.addressRaw
          ? {
              address: {
                "@type": "PostalAddress",
                streetAddress: extracted.addressRaw,
                addressLocality: "Bucuresti",
                addressCountry: "RO",
              },
            }
          : {}),
        ...(geoLat && geoLng
          ? {
              geo: {
                "@type": "GeoCoordinates",
                latitude: geoLat,
                longitude: geoLng,
              },
            }
          : {}),
        ...(extracted.areaM2
          ? {
              floorSize: {
                "@type": "QuantitativeValue",
                value: extracted.areaM2,
                unitCode: "MTK",
              },
            }
          : {}),
        ...(extracted.rooms ? { numberOfRooms: extracted.rooms } : {}),
      }
    : null;

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const canUseStripeForUnlock = appFlags.reportUnlockGuestCheckout || !!userId;
  const fullAccess =
    isPublicSample || (await canViewFullReport({ analysisId: id, userId }));
  const showPreview = analysis.status === "done" && !!extracted && !fullAccess;
  const showFullReportBody = !!extracted && analysis.status === "done" && fullAccess;
  const showFailureRecovery =
    analysis.status === "error" ||
    analysis.status === "failed" ||
    analysis.status === "rejected_rental" ||
    analysis.status === "rejected_not_realestate";
  const failureReason = reasonFromAnalysisRecord({
    status: analysis.status,
    error: analysis.error,
  });
  const previewTeaser =
    extracted && showPreview
      ? buildPreviewTeaser({
          askingEur: actualPrice,
          rangeLow: bestRange?.low ?? null,
          rangeMid: bestRange?.mid ?? null,
          rangeHigh: bestRange?.high ?? null,
          compsCount: comps.length,
          confidenceLevel: confidenceData?.level,
          canShowPriceVerdict: reportDataQualityGate.canShowPriceVerdict,
          canShowStrongPricePositionLanguage:
            reportDataQualityGate.canShowStrongPricePositionLanguage,
        })
      : null;
  const preliminaryForPreview =
    extracted && showPreview
      ? buildPreliminarySignal({
          compsCount: comps.length,
          confidenceLevel: confidenceData?.level,
          canShowFirmAnalysis: reportDataQualityGate.canShowStrongBuyerVerdict,
        })
      : "";

  return (
    <div className="container mx-auto py-8 px-4">
      {reportJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(reportJsonLd) }}
        />
      )}
      <ViewTracker
        groupId={analysis?.groupId ?? null}
        analysisId={analysis?.id ?? ""}
        areaSlug={analysis?.group?.areaSlug ?? null}
        priceEur={extracted?.price ?? null}
        rooms={extracted?.rooms ?? null}
      />
      {analysis?.status === "done" && fullAccess && analysis.id && !isPublicSample ? (
        <FunnelTrackReportUnlockedView analysisId={analysis.id} active />
      ) : null}

      <h1 className="text-2xl font-semibold mb-3">
        {isPublicSample ? "Raport exemplu" : "Raport analiză"}
      </h1>
      {isPublicSample && (
        <div className="mb-4 max-w-3xl rounded-lg border-2 border-indigo-300 bg-indigo-50/95 px-4 py-3 text-sm text-indigo-950">
          <p className="font-semibold">Raport exemplu. Datele sunt demonstrative.</p>
          <p className="mt-1.5 text-indigo-900/90 leading-relaxed">
            Nu este extras din anunțuri reale de vânzare. Vezi structura, tonul explicațiilor și
            modul de prezentare. Pentru o analiză pe un anunț adevărat, deschide analiza din
            ImobIntel.
          </p>
        </div>
      )}
      {showFailureRecovery && (
        <div className="mb-6 max-w-3xl">
          <AnalysisFailureRecovery
            variant="report"
            reason={failureReason}
            sourceUrl={analysis.sourceUrl}
            analysisId={analysis.id}
          />
        </div>
      )}

      <div className="mb-6 max-w-3xl space-y-2 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3">
        <BuyerReportTrustNote variant="compact" className="text-gray-600" showDataLink={false} />
        <ReportDisclaimer variant="legal" className="!border-0 !bg-white/50" />
      </div>

      {justPaid && !isPublicSample && (
        <ReportUnlockPostPaymentBanner
          justPaid={justPaid}
          canViewFullReport={fullAccess}
          isPublicSample={isPublicSample}
          analysisId={analysis.id}
          agentQuestionsText={agentQuestionsCopyText}
          myReportsHref={
            userId
              ? "/profile"
              : `/auth/signin?callbackUrl=${encodeURIComponent("/profile")}`
          }
          requireAccountForUnlock={!appFlags.reportUnlockGuestCheckout}
        />
      )}

      {/* Non-Bucharest disclaimer */}
      {(() => {
        if (showFailureRecovery) return null;
        // Coordinate-based check: Bucharest metro area bounding box
        const inBucharestBbox =
          geoLat != null &&
          geoLng != null &&
          geoLat >= 44.33 &&
          geoLat <= 44.55 &&
          geoLng >= 25.93 &&
          geoLng <= 26.3;
        if (inBucharestBbox) return null;

        const city = f?.city as string | undefined;
        const addr = extracted?.addressRaw as string | undefined;
        const combinedText = `${city ?? ""} ${addr ?? ""} ${extracted?.title ?? ""}`
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        const isBucharest =
          combinedText.includes("bucuresti") ||
          combinedText.includes("ilfov") ||
          combinedText.includes("sector") ||
          /\bbulevardul?\b/.test(combinedText) ||
          /\bstr\.?\s/.test(combinedText) ||
          /\bcalea\b/.test(combinedText) ||
          /\bsoseaua\b/.test(combinedText) ||
          /\bsplaiul\b/.test(combinedText);

        const hasCity = city || addr;
        if (hasCity && !isBucharest) {
          return (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <div className="font-medium text-amber-800">Zona cu acoperire limitata</div>
              <div className="mt-0.5 text-amber-700 text-xs">
                ImobIntel are suport complet doar pentru Bucuresti si Ilfov. Rapoartele pentru alte
                zone pot avea estimari mai putin precise din cauza numarului redus de comparabile si
                date disponibile.
              </div>
            </div>
          );
        }
        return null;
      })()}

      {isUnsupportedType && extracted && !showFailureRecovery && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <div className="font-medium text-amber-800">Tip de proprietate nesustinut</div>
          <div className="mt-1 text-amber-700">
            ImobIntel nu ofera inca suport complet pentru analiza de {propLabel}. Lucram la
            extinderea platformei pentru a include si acest tip de proprietate. Datele prezentate
            mai jos sunt orientative.
          </div>
        </div>
      )}

      {/* TVA banner */}
      {extracted && hasPlusTVA && vatComputed && !showFailureRecovery && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm flex items-start gap-3">
          <span className="text-amber-600 text-lg leading-none mt-0.5">⚠</span>
          <div>
            <div className="font-medium text-amber-900">Pretul afisat nu include TVA</div>
            <div className="mt-1 text-amber-800">
              Pretul din anunt este{" "}
              <strong>
                {(actualPrice ?? 0).toLocaleString("ro-RO")} {extracted.currency ?? "EUR"} + TVA (
                {vatRate}%)
              </strong>
              . Costul real al proprietatii este{" "}
              <strong>
                {vatComputed.priceWithVAT.toLocaleString("ro-RO")} {extracted.currency ?? "EUR"}
              </strong>{" "}
              (TVA: {vatComputed.vatAmount.toLocaleString("ro-RO")} {extracted.currency ?? "EUR"}).
              {reducedVATCheck?.eligible && (
                <span className="block mt-1 text-emerald-700 font-medium">
                  Posibil eligibil pentru TVA redus 5% - verificati cu dezvoltatorul.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {extracted &&
        reportDataQualityGate.showYearBuiltWarning &&
        !devSignals.isUnderConstruction &&
        !showFailureRecovery && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-950">
          <span className="font-medium">An construcție: lipsă din fișă. </span>
          Vechimea afectează risc structural, costuri și negociere — confirmă la vizionare și din acte
          când e posibil.
        </div>
      )}

      {/* Under construction + render warning banner */}
      {extracted && devSignals.isUnderConstruction && !showFailureRecovery && (
        <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm flex items-start gap-3">
          <span className="text-orange-600 text-xl leading-none mt-0.5">🏗️</span>
          <div>
            <div className="font-medium text-orange-900">Proprietate in constructie</div>
            <div className="mt-1 text-orange-800 space-y-1">
              <p>
                Acest apartament <strong>nu este finalizat</strong>.
                {devSignals.estimatedDelivery && (
                  <>
                    {" "}
                    Predare estimata: <strong>{devSignals.estimatedDelivery}</strong>.
                  </>
                )}
                {devSignals.projectName && (
                  <>
                    {" "}
                    Proiect: <strong>{devSignals.projectName}</strong>.
                  </>
                )}
              </p>
              {(devSignals.isRender || llmVision?.isRender) && (
                <p className="flex items-start gap-1.5 mt-1">
                  <span className="shrink-0 text-orange-600">⚠</span>
                  <span>
                    <strong>Fotografiile din anunt sunt randari 3D</strong>, nu poze reale ale
                    apartamentului. Starea actuala a constructiei poate fi diferita de ce vedeti in
                    imagini. Este recomandat sa vizitati santierul pentru a vedea stadiul real
                    inainte de a lua o decizie.
                  </span>
                </p>
              )}
              <p className="text-xs text-orange-700 mt-2">
                Verificati: stadiul constructiei, termenul de predare, garantiile oferite de
                dezvoltator, si clauzele contractuale pentru intarzieri.
                {devSignals.signals.length > 0 && (
                  <span className="block mt-0.5 text-orange-600">
                    Semnale detectate:{" "}
                    {devSignals.signals
                      .map((s) => s.replace(/Text detectat: .*/, "text specific constructie"))
                      .join(", ")}
                    .
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Render-only warning (when not under construction but photos look like renders) */}
      {extracted &&
        !showFailureRecovery &&
        !devSignals.isUnderConstruction &&
        llmVision?.isRender &&
        (llmVision?.renderConfidence ?? 0) >= 0.6 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm flex items-start gap-3">
            <span className="text-amber-600 text-lg leading-none mt-0.5">⚠</span>
            <div>
              <div className="font-medium text-amber-900">Fotografii posibil nerealiste</div>
              <div className="mt-1 text-amber-800">
                Fotografiile din acest anunt par a fi{" "}
                <strong>randari 3D sau vizualizari digitale</strong>, nu fotografii reale ale
                proprietatii. Vizitati apartamentul inainte de a lua o decizie pentru a vedea starea
                reala.
              </div>
            </div>
          </div>
        )}

      {/* Preview panel; full report: verdict cumpărător, preț, comp, risc, negociere, randament, încredere, checklist, apoi context zonă */}
      {showPreview && previewTeaser && extracted && (
        <div className="mb-8">
          <ReportPreviewPanel
            analysisId={id}
            title={(extracted.title as string) ?? null}
            askingPrice={
              extracted.price != null
                ? `${(extracted.price as number).toLocaleString("ro-RO")} ${String(extracted.currency ?? "EUR")}`
                : "—"
            }
            areaLine={extracted.areaM2 != null ? `${extracted.areaM2} mp` : "—"}
            roomsLine={saneRooms != null ? String(saneRooms) : "—"}
            locationLine={
              approximateLocationLabel ??
              (extracted.addressRaw
                ? String(extracted.addressRaw).replace(/\s+/g, " ").trim().slice(0, 200)
                : "—")
            }
            sourcePortal={portalLabelFromUrl(analysis.sourceUrl)}
            preliminarySignal={preliminaryForPreview}
            teaser={previewTeaser}
            confidenceLine={`${reportConfidenceExplanation.labelRo}. ${reportConfidenceExplanation.shortExplanationRo}`}
            unlockButtonLabel={formatUnlockButtonLabel()}
            canUseStripeForUnlock={canUseStripeForUnlock}
            canShowPaywall={reportSellability.canShowPaywall}
            paywallBlockMessageRo={reportSellability.paywallBlockMessageRo}
            shouldShowRefundFriendlyCopy={reportSellability.shouldShowRefundFriendlyCopy}
            sellabilityTier={reportSellability.sellability}
            launchPriceBadgeRo={getLaunchPriceBadgeRo()}
          />
        </div>
      )}

      {showFullReportBody && (
        <>
          <div className="mb-12 space-y-8 md:space-y-10">
            <ReportAboveFoldHeader
              verdict={executiveVerdict}
              propertyTitle={decisionHeaderTitle}
              askingPrice={listingPriceForHeader}
              currency={listingCurrencyForHeader}
              priceSecondaryLine={headerPriceSecondaryLine}
              hasPlusTVA={hasPlusTVA}
              eurPerM2={headerEurPerM2}
              areaM2={headerAreaM2}
              sellerType={sellerTypeNormalized}
              pricePositionLabel={pricePositionShort}
              quickMetrics={reportQuickMetrics}
              pros={apartmentScore.pros}
              cons={apartmentScore.cons}
            />

            <ReportConfidenceStrip explanation={reportConfidenceExplanation} />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
              <div className="lg:col-span-7 space-y-5">
                <VerdictSection
                  cardTitle="Preț: inteligență (interval, diferențe, încredere)"
                  priceRange={priceRange}
                  actualPrice={actualPrice}
                  confidence={confidenceData ?? null}
                  compsFair={compsFairRange}
                  currency={extracted?.currency ?? "EUR"}
                  compsCount={comps.length}
                  confidenceExplanation={reportConfidenceExplanation}
                />
                <PriceAnchorsSection
                  askingPrice={actualPrice ?? null}
                  avmLow={priceAnchorsRange?.low ?? null}
                  avmMid={priceAnchorsRange?.mid ?? null}
                  avmHigh={priceAnchorsRange?.high ?? null}
                  notarialTotal={notarialTotal}
                  notarialEurM2={notarialEurM2Display}
                  notarialZone={notarialZone}
                  notarialYear={notarialYear}
                  notarialConfidence={notarialConfidence}
                  notarialShowNeutralNote={notarialShowNeutralNote}
                  showNotarial={showNotarial}
                  currency={extracted?.currency ?? "EUR"}
                />
              </div>
              <div className="lg:col-span-5 min-w-0">
                <ApartmentScoreSection
                  score={apartmentScore}
                  variant="reportHeader"
                  showActions={false}
                  scoreLabel={propScoreLabel}
                />
              </div>
            </div>
          </div>

          {isPublicSample && <ExempluRealListingCta className="mb-6" />}

          <div className="space-y-10 mb-10">
            <ReportCompsSection
              comps={comps.map((c) => ({
                id: c.id,
                title: c.title,
                photo: c.photo,
                sourceUrl: c.sourceUrl,
                priceEur: c.priceEur,
                areaM2: c.areaM2,
                rooms: c.rooms,
                eurM2: c.eurM2,
                distanceM: c.distanceM,
                score: c.score,
                lat: c.lat,
                lng: c.lng,
              }))}
              center={{ lat: f?.lat ?? null, lng: f?.lng ?? null }}
              medianEurM2={medianEurM2ForCompsSection}
              subjectAskingPriceEur={actualPrice}
              subjectAreaM2={
                (extracted?.areaM2 as number | undefined) ?? (f?.areaM2 as number | undefined) ?? null
              }
              subjectRooms={saneRooms}
              areaSlug={areaSlug ? String(areaSlug) : null}
              city={typeof f?.city === "string" ? f.city : null}
              hasSubjectCoords={geoLat != null && geoLng != null}
              reportConfidenceLabelRo={reportConfidenceExplanation.labelRo}
              reportConfidenceLevel={confidenceData?.level}
              reportConfidenceShortRo={reportConfidenceExplanation.shortExplanationRo}
            />

            {isPublicSample && <ExempluRealListingCta className="mt-2" />}

            <ReportRiskSection
              airQuality={airQualityReading}
              seismic={buyerSeismicView}
              vibeZoneTypeKey={vibeResult?.scores?.zoneTypeKey ?? null}
              seismicRiskClass={seismicRiskClassForReport}
              contextualRiskDataInsufficient={
                reportDataQualityGate.contextualRiskDataInsufficient
              }
              locationClaimsLimited={!reportDataQualityGate.canShowNeighborhoodRiskClaims}
            />

            {isPublicSample && <ExempluRealListingCta className="mt-2" />}

            <div id="report-negotiation" className="scroll-mt-6">
              <NegotiationAssistantSection
                assistant={negotiationAssistant}
                points={negotiationPoints}
                legacyWhatsAppDraft={whatsAppDraft}
                canShowSubstantiveArguments={reportDataQualityGate.canShowNegotiationArguments}
                suggestedLow={
                  negotiationAssistant.allowNumericOfferHint &&
                  compsStats?.q1 &&
                  f?.areaM2
                    ? Math.round(compsStats.q1 * f.areaM2)
                    : null
                }
                suggestedHigh={
                  negotiationAssistant.allowNumericOfferHint &&
                  compsStats?.median &&
                  f?.areaM2
                    ? Math.round(compsStats.median * f.areaM2)
                    : null
                }
                currency={extracted?.currency ?? "EUR"}
              />
            </div>

            <BuyerInvestmentSection
              yieldGross={yieldGrossSnapshot}
              yieldNet={yieldNetSnapshot}
              rentEur={rentEurFromSnapshot}
              currency={extracted?.currency ?? "EUR"}
              canShowYield={reportDataQualityGate.canShowYield}
            />

            <DataInsightsSection
              hasPrice={actualPrice != null}
              hasPriceEstimate={bestRange?.mid != null}
              hasArea={
                (extracted?.areaM2 ?? (f?.areaM2 as number | undefined) ?? null) != null
              }
              hasRooms={saneRooms != null}
              hasFloor={
                extracted?.floor != null || extracted?.floorRaw != null || f?.level != null
              }
              hasYear={!!(extracted?.yearBuilt ?? f?.yearBuilt)}
              hasAddress={!!extracted?.addressRaw}
              isHouse={isHouse}
              hasCoords={geoLat != null && geoLng != null}
              hasPhotos={
                Array.isArray(extracted?.photos) && (extracted.photos as unknown[]).length > 0
              }
              compsCount={comps.length}
              estimateComparableCount={compsFairRange?.compsUsed ?? comps.length}
              confidenceLevel={confidenceData?.level}
              seismicLevel={seismic.level}
              approximateLocationLabel={approximateLocationLabel}
            />

            {isPublicSample && <ExempluRealListingCta className="mt-2" />}

            <SellerChecklist
              heading="Ultimul check înainte de apel: cadastru, risc, negociere"
              yearBuilt={extracted?.yearBuilt ?? f?.yearBuilt}
              hasFloor={
                extracted?.floor != null || extracted?.floorRaw != null || f?.level != null
              }
              hasAddress={!!extracted?.addressRaw}
              hasCoords={f?.lat != null && f?.lng != null}
              hasArea={!!extracted?.areaM2}
              hasPhotos={
                Array.isArray(extracted?.photos) && (extracted.photos as unknown[]).length > 0
              }
              seismicAttention={["RS1", "RS2", "RS3", "RsI", "RsII", "RsIII"].includes(
                seismic.level,
              )}
              overpricingPct={overpricingPct}
              compsCount={comps.length}
              confidenceLevel={confidenceData?.level}
              areaM2={extracted?.areaM2 ?? (f?.areaM2 as number) ?? null}
              titleAreaM2={
                ((extracted as Record<string, unknown>)?.titleAreaM2 as number) ?? null
              }
              rooms={saneRooms}
              title={extracted?.title ?? null}
              llmRedFlags={llmText?.redFlags ?? null}
              llmCondition={llmText?.condition ?? null}
              llmBalconyM2={llmText?.balconyM2 ?? null}
              description={
                ((extracted?.sourceMeta as Record<string, unknown>)?.description as string) ??
                null
              }
            />

            {isPublicSample && <ExempluRealListingCta className="mt-2" />}

            <ReportCollapsible title="Zonă, transport, costuri asociate" defaultOpen={false}>
              <div className="space-y-6">
                {(() => {
                  const effectiveLat = geoLat ?? f?.lat ?? 0;
                  const effectiveLng = geoLng ?? f?.lng ?? 0;
                  const staticMetro =
                    effectiveLat !== 0 && effectiveLng !== 0
                      ? nearestStationM(effectiveLat, effectiveLng)
                      : null;
                  return (
                    <TransportSection
                      transport={transportResult}
                      legacyDistMetroM={f?.distMetroM ?? staticMetro?.distM ?? null}
                      legacyNearestMetro={staticMetro?.name ?? null}
                      locationInferred={locationInferred}
                      propertyType={propLabel}
                    />
                  );
                })()}

                {geoLat != null &&
                  geoLng != null &&
                  reportDataQualityGate.canShowNeighborhoodRiskClaims && (
                    <NeighborhoodIntelV2
                      lat={geoLat}
                      lng={geoLng}
                      initialRadiusM={1000}
                      mode="report"
                    />
                  )}
                {geoLat != null &&
                  geoLng != null &&
                  !reportDataQualityGate.canShowNeighborhoodRiskClaims && (
                    <p className="text-sm text-slate-600 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
                      Context cartier: localizarea e prea aproximativă sau comparabilele sunt prea
                      puține — nu detaliem aici harta de context de zonă; o poți reveni când există
                      adresă sau un punct mai clar pe hartă.
                    </p>
                  )}

                <AcquisitionCostsSection
                  priceEur={actualPrice}
                  commissionStatus={
                    sourceMeta?.zeroCommission === true
                      ? "zero"
                      : llmText?.redFlags?.some((rf) => /comision/i.test(rf))
                        ? "standard"
                        : "unknown"
                  }
                  hasPlusTVA={hasPlusTVA}
                  vatRate={vatRate}
                  vatAmount={vatComputed?.vatAmount ?? null}
                  priceWithVAT={vatComputed?.priceWithVAT ?? null}
                  reducedVATEligible={reducedVATCheck?.eligible}
                  reducedVATReason={reducedVATCheck?.reason}
                />
              </div>
            </ReportCollapsible>

            <ReportCollapsible title="Rezumat extins (opțional)" defaultOpen={false}>
              <ExecutiveSummarySection
                verdict={executiveVerdict}
                priceRange={bestRange}
                askingPrice={actualPrice ?? null}
                currency="EUR"
                originalPrice={isRon && extracted?.price ? (extracted.price as number) : undefined}
                originalCurrency={isRon ? "RON" : undefined}
                hasPlusTVA={hasPlusTVA}
                vatRate={vatRate}
                priceWithVAT={vatComputed?.priceWithVAT ?? null}
                quickTake={quickTake}
                compact
                hideQuickTake
                suppressTopics={[
                  ...(devSignals.isUnderConstruction ? (["construction"] as const) : []),
                  ...(devSignals.isRender ||
                  (llmVision?.isRender === true && (llmVision?.renderConfidence ?? 0) >= 0.6)
                    ? (["renders"] as const)
                    : []),
                  ...(hasPlusTVA ? (["vat"] as const) : []),
                  ...(!bestRange?.mid || comps.length < 3 ? (["pricing-confidence"] as const) : []),
                ]}
              />
            </ReportCollapsible>

            <ReportCollapsible title="Istoric preț, metodologie" defaultOpen={false}>
              <div className="space-y-4">
                <ListingHistorySection
                  snapshots={historySnapshots}
                  duplicates={historyDuplicates}
                  currency={extracted?.currency ?? "EUR"}
                />
                <div className="pt-2">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Metodologie estimare</h3>
                  <MethodologySection
                    baselineEurM2={(avmExplain?.baselineEurM2 as number) ?? null}
                    adjustments={(avmExplain?.adjustments as Record<string, number>) ?? null}
                    compsCount={comps.length}
                    outlierCount={(compsExplain?.outlierCount as number) ?? null}
                  />
                </div>
              </div>
            </ReportCollapsible>

            <ReportCollapsible title="Anunț, fișă, fotografii" defaultOpen={false}>
              <div className="space-y-4">
                {extracted && (
                  <Card>
                <CardHeader>
                  <CardTitle>{extracted.title ?? "Fara titlu"}</CardTitle>
                  <CardDescription>
                    {(() => {
                      const raw = extracted.addressRaw
                        ? extracted.addressRaw
                            .replace(/\s*pre[tț]\s+[\d.,]+\s*€?.*/i, "")
                            .replace(/\s*\|.*$/g, "")
                            .replace(/\s*\+\s*TVA.*/i, "")
                            .replace(/\s*€.*/g, "")
                            .replace(/\s{2,}/g, " ")
                            .trim() || null
                        : null;
                      const hasGoodAddress = raw && looksLikeAddress(raw);
                      const isStreet = hasGoodAddress ? isStreetAddress(raw!) : false;
                      const sector = extractSectorDisplay(raw, areaSlug);
                      const mapUrl = buildGoogleMapsUrl(f?.lat, f?.lng, raw, isStreet);

                      if (hasGoodAddress && isStreet) {
                        return (
                          <span className="flex items-center gap-2 flex-wrap">
                            {mapUrl ? (
                              <a
                                href={mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {raw}
                              </a>
                            ) : (
                              <span>{raw}</span>
                            )}
                            {sector && (
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                {sector}
                              </span>
                            )}
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                              Adresa exacta
                            </span>
                          </span>
                        );
                      }

                      if (hasGoodAddress && !isStreet) {
                        return (
                          <span className="flex items-center gap-2 flex-wrap">
                            {mapUrl ? (
                              <a
                                href={mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {raw}
                              </a>
                            ) : (
                              <span>{raw}</span>
                            )}
                            {sector && (
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                {sector}
                              </span>
                            )}
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              Adresa aproximativa
                            </span>
                          </span>
                        );
                      }

                      if (sector || (f?.lat && f?.lng)) {
                        return (
                          <span className="flex items-center gap-2 flex-wrap">
                            <span className="text-muted-foreground">
                              Adresa exacta nu poate fi determinata
                            </span>
                            {sector && (
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                {sector}
                              </span>
                            )}
                            {mapUrl && (
                              <a
                                href={mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-[11px]"
                              >
                                Vezi pe harta
                              </a>
                            )}
                          </span>
                        );
                      }

                      return (
                        <span className="text-muted-foreground">
                          Adresa exacta sau aproximativa nu poate fi determinata
                        </span>
                      );
                    })()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Pret</div>
                      <div className="font-semibold">
                        {extracted.price ? (
                          <>
                            {(extracted.price as number).toLocaleString("ro-RO")}{" "}
                            {extracted.currency ?? "EUR"}
                            {hasPlusTVA && (
                              <span className="text-xs font-medium text-amber-600"> + TVA</span>
                            )}
                            {isRon && priceEurConverted && (
                              <span className="block text-xs text-muted-foreground font-normal">
                                ~{priceEurConverted.toLocaleString("ro-RO")} EUR
                              </span>
                            )}
                            {hasPlusTVA && vatComputed && (
                              <span className="block text-xs text-muted-foreground font-normal">
                                Cu TVA {vatRate}%:{" "}
                                <span className="font-semibold text-foreground">
                                  {vatComputed.priceWithVAT.toLocaleString("ro-RO")}{" "}
                                  {extracted.currency ?? "EUR"}
                                </span>
                              </span>
                            )}
                          </>
                        ) : (
                          "-"
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Pret/mp</div>
                      <div className="font-semibold">
                        {(() => {
                          const price = extracted.price as number | null;
                          const area = extracted.areaM2 as number | null;
                          if (!price || !area || area <= 0) return "-";
                          const pricePerM2 = Math.round(price / area);
                          const eurPerM2 = isRon ? Math.round(pricePerM2 / ronToEurRate) : null;
                          const pricePerM2WithVAT =
                            hasPlusTVA && vatComputed
                              ? Math.round(vatComputed.priceWithVAT / area)
                              : null;
                          const medianM2 = compsStats?.median;
                          const compareM2 = pricePerM2WithVAT ?? pricePerM2;
                          return (
                            <span className="flex flex-col">
                              <span className="flex items-center gap-1.5">
                                {pricePerM2.toLocaleString("ro-RO")} {extracted.currency ?? "EUR"}
                                /mp
                                {hasPlusTVA && (
                                  <span className="text-xs font-medium text-amber-600">+ TVA</span>
                                )}
                                {medianM2 && medianM2 > 0 && (
                                  <span
                                    className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                                      compareM2 < medianM2 * 0.95
                                        ? "bg-emerald-50 text-emerald-700"
                                        : compareM2 > medianM2 * 1.05
                                          ? "bg-red-50 text-red-700"
                                          : "bg-gray-50 text-gray-600"
                                    }`}
                                  >
                                    {compareM2 < medianM2
                                      ? `${Math.round(((medianM2 - compareM2) / medianM2) * 100)}% sub zona`
                                      : compareM2 > medianM2
                                        ? `${Math.round(((compareM2 - medianM2) / medianM2) * 100)}% peste zona`
                                        : "~media zonei"}
                                  </span>
                                )}
                              </span>
                              {isRon && eurPerM2 && (
                                <span className="text-xs text-muted-foreground font-normal">
                                  ~{eurPerM2.toLocaleString("ro-RO")} EUR/mp
                                </span>
                              )}
                              {pricePerM2WithVAT && (
                                <span className="text-xs text-muted-foreground font-normal">
                                  Cu TVA: {pricePerM2WithVAT.toLocaleString("ro-RO")}{" "}
                                  {extracted.currency ?? "EUR"}/mp
                                </span>
                              )}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Suprafata</div>
                      <div className="font-semibold">
                        {extracted.areaM2 ? `${extracted.areaM2} mp` : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Camere</div>
                      <div className="font-semibold">{saneRooms ?? "-"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Etaj</div>
                      <div className="font-semibold">
                        {displayFloor(extracted.floor ?? extracted.floorRaw ?? f?.floorRaw)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">An</div>
                      <div className="font-semibold">{extracted.yearBuilt ?? "-"}</div>
                    </div>
                    {(() => {
                      const st = (extracted.sourceMeta as Record<string, unknown>)?.sellerType as
                        | string
                        | undefined;
                      const label =
                        st === "agentie"
                          ? "Agentie"
                          : st === "proprietar"
                            ? "Proprietar"
                            : st === "dezvoltator"
                              ? "Dezvoltator"
                              : null;
                      return label ? (
                        <div>
                          <div className="text-muted-foreground">Tip vanzator</div>
                          <div className="font-semibold">{label}</div>
                        </div>
                      ) : null;
                    })()}
                    {llmText?.hasParking != null && (
                      <div>
                        <div className="text-muted-foreground">Parcare</div>
                        <div
                          className={`font-semibold ${llmText.hasParking ? "text-emerald-600" : "text-amber-600"}`}
                        >
                          {llmText.hasParking ? "Da" : "Nu"}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Commission, exclusivity & property badges */}
                  {(() => {
                    const sm = extracted.sourceMeta as Record<string, unknown> | null;
                    const zeroCom = sm?.zeroCommission === true;
                    const excl = sm?.exclusivitate === true;
                    const neverLived = sm?.neverLivedIn === true;
                    if (!zeroCom && !excl && !neverLived) return null;
                    return (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {zeroCom && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 cursor-help"
                            title="Comision 0% pentru cumparator inseamna ca vanzatorul plateste tot comisionul agentiei. Agentul poate fi incentivat sa prioritizeze interesele vanzatorului."
                          >
                            <span>ℹ</span> Comision 0% cumparator
                          </span>
                        )}
                        {excl && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 cursor-help"
                            title="Proprietatea este listata in exclusivitate de o singura agentie. Pretul poate fi mai putin negociabil."
                          >
                            <span>★</span> Exclusivitate
                          </span>
                        )}
                        {neverLived && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700"
                            title="Proprietatea nu a fost locuita anterior. Finisajele si instalatiile sunt in stare originala de fabrica."
                          >
                            <span>✓</span> Proprietate nelocuita
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Photo gallery */}
            {(() => {
              const allPhotos =
                extracted && Array.isArray(extracted.photos)
                  ? (extracted.photos as unknown[])
                      .map(normalizeReportPhotoEntry)
                      .filter((u): u is string => u != null)
                      .filter(isPropertyPhoto)
                  : [];
              const photosLikelyRenders =
                devSignals.isRender ||
                (llmVision?.isRender === true && (llmVision?.renderConfidence ?? 0) >= 0.6);
              return allPhotos.length > 0 ? (
                <div className="relative">
                  {photosLikelyRenders && (
                    <div className="mb-2 flex items-center gap-1.5 px-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 border border-orange-200 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                        Randari 3D - nu sunt fotografii reale
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl overflow-hidden">
                    {allPhotos.slice(0, 6).map((src, i) => (
                      <div
                        key={i}
                        className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={reportGalleryImgSrc(src)}
                          alt={`Foto ${i + 1}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading={i < 2 ? "eager" : "lazy"}
                          referrerPolicy="no-referrer"
                        />
                        {photosLikelyRenders && i === 0 && (
                          <div className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white font-medium">
                            Randare 3D
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* LLM Analysis - detailed listing insights */}
            <ListingInsightsSection
              llmText={llmText}
              llmVision={llmVision}
              isEnriching={isLlmEnriching}
              showVision={showVision}
              llmFailed={llmFailed}
              priceEur={actualPrice ?? null}
              areaM2={extracted?.areaM2 ?? (f?.areaM2 as number) ?? null}
              rooms={saneRooms}
              yearBuilt={extracted?.yearBuilt ?? f?.yearBuilt ?? null}
              zoneMedianEurM2={compsStats?.median ?? null}
              avmMid={priceRange?.mid ?? null}
              floor={extracted?.floorRaw ?? null}
            />
              </div>
            </ReportCollapsible>

            
          </div>
        </>
      )}

      {/* PDF Download (full access only) */}
      {analysis?.status === "done" && fullAccess && !isPublicSample && (
        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exporta raport</CardTitle>
            </CardHeader>
            <CardContent>
              <PdfActions analysisId={analysis.id} />
            </CardContent>
          </Card>
          {paidUnlockForFeedback && !existingReportFeedback ? (
            <PaidReportFeedback analysisId={analysis.id} reportUnlockId={paidUnlockForFeedback.id} />
          ) : null}
        </div>
      )}

      {isLlmEnriching && fullAccess && !isPublicSample && (
        <LlmEnrichTrigger analysisId={analysis?.id ?? ""} />
      )}

      {/* Chat assistant */}
      {extracted && fullAccess && !isPublicSample && <ReportChat analysisId={analysis?.id ?? ""} />}
    </div>
  );
}

export async function generateMetadata(
  props: { params?: { id?: string | string[] } } | unknown,
): Promise<Record<string, unknown>> {
  const maybeParams = await Promise.resolve(
    (props as { params?: { id?: string | string[] } })?.params,
  );
  const id = Array.isArray(maybeParams?.id) ? maybeParams.id[0] : maybeParams?.id;
  const [analysis, indexRec] = id
    ? await Promise.all([
        prisma.analysis.findUnique({
          where: { id },
          include: { extractedListing: true },
        }),
        getReportPageIndexable(id),
      ])
    : [null, { indexable: false, sellability: null }];
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (id === PUBLIC_SAMPLE_REPORT_ANALYSIS_ID) {
    return {
      title: "Raport exemplu ImobIntel (demo)",
      description:
        "Demo: structură de raport cu date demonstrative. URL canonic: /raport-exemplu — acest /report/… rămâne neindexat pentru a evita duplicate.",
      alternates: { canonical: "/raport-exemplu" },
      robots: { index: false, follow: true },
      openGraph: {
        title: "Raport exemplu ImobIntel (date demonstrative)",
        description: "Demo. Pentru piață reală, analizează un anunț suportat.",
        url: `${base}/raport-exemplu`,
        type: "article",
      },
    };
  }

  const el = analysis?.extractedListing;
  const title = el?.title ?? "Raport analiza imobiliara";

  const descParts: string[] = [];
  if (el?.price) descParts.push(`${el.price.toLocaleString("ro-RO")} EUR`);
  if (el?.areaM2) descParts.push(`${el.areaM2} mp`);
  if (el?.rooms) descParts.push(`${el.rooms} camere`);
  if (el?.addressRaw) descParts.push(el.addressRaw);
  const description = descParts.length
    ? `Analiza completa: ${descParts.join(", ")}. Pret estimat, comparabile, risc seismic si viteza de vanzare.`
    : "Raport complet cu pret estimat, comparabile, risc seismic si viteza de vanzare pentru acest apartament din Bucuresti.";

  const url = `${base}/report/${id ?? ""}`;
  const ogImage = `${base}/api/og/report/${id ?? ""}`;

  if (!id || !analysis) {
    return { title: "Raport", robots: { index: false, follow: false } };
  }

  if (!indexRec.indexable) {
    return {
      title,
      description,
      alternates: { canonical: `/report/${id}` },
      robots: { index: false, follow: false },
      openGraph: {
        title,
        description,
        url,
        type: "article",
        images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      },
    };
  }

  return {
    title,
    description,
    alternates: { canonical: `/report/${id}` },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
