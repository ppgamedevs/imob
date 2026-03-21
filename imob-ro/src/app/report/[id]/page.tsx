import { notFound } from "next/navigation";
import React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  checkReducedVATEligibility,
  computePriceWithVAT,
  detectDevelopmentStatus,
} from "@/lib/analysis/development-detect";
import { prisma } from "@/lib/db";
import { flags } from "@/lib/feature-flags";
import { geocodeWithNominatim, inferLocationFromText, nearestStationM } from "@/lib/geo";
import { upgradeListingPhotoUrl } from "@/lib/media/upgrade-listing-photo-url";
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
import { computeFairRange, type FairPriceResult, findComparables } from "@/lib/report/pricing";
import { buildConfidenceNarrative } from "@/lib/report/trust-copy";
import { buildQuickTake, computeExecutiveVerdict, type VerdictInput } from "@/lib/report/verdict";
import {
  buildRecommendedNextStep,
  buildRiskInsights,
  normalizeRiskStack,
  orderRiskLayerKeys,
  RISK_LAYER_LABELS,
} from "@/lib/risk/executive";
import { matchSeismic } from "@/lib/risk/seismic";
import { type ApartmentScoreInput, computeApartmentScore } from "@/lib/score/apartmentScore";
import type { NormalizedFeatures } from "@/lib/types/pipeline";

import AnalysisLoading from "./AnalysisLoading";
import CompsClientBlock from "./CompsClientBlock";
import { LlmEnrichTrigger } from "./LlmEnrichTrigger";
import NeighborhoodIntelV2 from "./NeighborhoodIntelV2Lazy";
import { PdfActions } from "./PdfActions";
import ReportChat from "./ReportChat";
import RetryAnalysisButton from "./RetryAnalysisButton";
import AcquisitionCostsSection from "./sections/AcquisitionCostsSection";
import ApartmentScoreSection from "./sections/ApartmentScoreSection";
import DataInsightsSection from "./sections/DataInsightsSection";
import ExecutiveSummarySection from "./sections/ExecutiveSummarySection";
import ReportAboveFoldHeader from "./sections/ReportAboveFoldHeader";
import ReportCollapsible from "./sections/ReportCollapsible";
import type { TldrItem } from "./sections/ReportTldrStrip";
import ListingHistorySection from "./sections/ListingHistorySection";
import ListingInsightsSection from "./sections/ListingInsightsSection";
import MethodologySection from "./sections/MethodologySection";
import NegotiationPointsSection from "./sections/NegotiationPointsSection";
import PriceAnchorsSection from "./sections/PriceAnchorsSection";
import RiskStackSection from "./sections/RiskStackSection";
import SellerChecklist from "./sections/SellerChecklist";
import TransportSection from "./sections/TransportSection";
import TtsSection from "./sections/TtsSection";
import VerdictSection from "./sections/VerdictSection";
import { ViewTracker } from "./ViewTracker";

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

/** Coerce stored JSON photo entries and upgrade CDN thumbnails to larger variants. */
function normalizeReportPhotoUrl(entry: unknown): string | null {
  if (typeof entry === "string") {
    const u = entry.startsWith("//") ? `https:${entry}` : entry;
    if (u.startsWith("http")) return upgradeListingPhotoUrl(u);
  }
  if (
    entry &&
    typeof entry === "object" &&
    "url" in entry &&
    typeof (entry as { url: unknown }).url === "string"
  ) {
    let u = (entry as { url: string }).url;
    if (u.startsWith("//")) u = `https:${u}`;
    if (u.startsWith("http")) return upgradeListingPhotoUrl(u);
  }
  return null;
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

type Props = { params: Promise<{ id?: string | string[] }> };

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

export default async function ReportPage({ params }: Props) {
  const resolvedParams = await params;
  const id = Array.isArray(resolvedParams.id) ? resolvedParams.id[0] : resolvedParams.id;
  if (!id) throw new Error("Missing report id");
  const analysis = await loadAnalysis(id);

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

  if (geoLat != null && geoLng != null) {
    const [vibe, transport] = await Promise.all([
      flags.poi ? computeVibeScores(geoLat, geoLng).catch(() => null) : Promise.resolve(null),
      flags.transport
        ? getTransportSummary(geoLat, geoLng).catch(() => null)
        : Promise.resolve(null),
    ]);
    vibeResult = vibe;
    transportResult = transport;
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

  // Notarial grid data from ScoreSnapshot
  const notarialTotal = analysis.scoreSnapshot?.notarialTotal ?? null;
  const notarialZone = analysis.scoreSnapshot?.notarialZone ?? null;
  const notarialYear = analysis.scoreSnapshot?.notarialYear ?? null;

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
  const normalizedRiskStack = normalizeRiskStack(riskStackExplain ?? null, seismicExplain ?? null);
  const orderedRiskKeys = orderRiskLayerKeys(normalizedRiskStack.layers);
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

  // Executive verdict (depends on devSignals, hasPlusTVA, sourceMeta)
  const verdictInput: VerdictInput = {
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

  const priceTrustLine =
    !bestRange?.mid || comps.length < 3
      ? "Nu putem valida pretul cu incredere ridicata fata de piata."
      : confidenceData?.level === "high"
        ? "Pretul poate fi plasat fata de comparabile si intervalul estimat."
        : confidenceData?.level === "medium"
          ? "Pretul este plasabil, dar ramane marja de incertitudine."
          : "Validarea pretului este limitata - foloseste estimarea conservativ.";

  const riskImpactLine = (() => {
    const lvl = normalizedRiskStack.overallLevel;
    if (lvl === "high") return "Exista riscuri importante de context sau imobil.";
    if (lvl === "medium") return "Risc moderat: merita verificari suplimentare inainte de decizie.";
    if (lvl === "low") return "Riscuri majore limitate la nivelul datelor actuale.";
    return "Riscul agregat nu este complet evaluat.";
  })();

  const decisionBullets = (() => {
    type Bullet = { text: string; kind: "plus" | "minus" | "dot" };
    const out: Bullet[] = [];
    for (const p of apartmentScore.pros.slice(0, 2)) {
      const t = p.trim();
      if (t) out.push({ text: t, kind: "plus" });
    }
    for (const c of apartmentScore.cons.slice(0, 2)) {
      const t = c.trim();
      if (t) out.push({ text: t, kind: "minus" });
    }
    for (const r of executiveVerdict.reasons) {
      if (out.length >= 5) break;
      const t = r.trim();
      if (!t || out.some((x) => x.text === t)) continue;
      out.push({ text: t, kind: "dot" });
    }
    return out.slice(0, 5);
  })();

  const reportTldrItems: TldrItem[] = (() => {
    const out: TldrItem[] = [];
    const seen = new Set<string>();
    const add = (raw: string, kind: TldrItem["kind"]) => {
      const t = raw.trim();
      if (!t || seen.has(t)) return;
      seen.add(t);
      out.push({ text: t, kind });
    };
    for (const s of quickTake) add(s, "caution");
    for (const b of decisionBullets) {
      add(
        b.text,
        b.kind === "plus" ? "positive" : b.kind === "minus" ? "warning" : "caution",
      );
    }
    return out.slice(0, 4);
  })();

  const listingPriceForHeader =
    (extracted?.price as number | undefined) ?? actualPrice ?? null;
  const listingCurrencyForHeader = String(extracted?.currency ?? "EUR");
  const headerPriceSecondaryLine =
    isRon && priceEurConverted != null
      ? `≈ ${priceEurConverted.toLocaleString("ro-RO")} EUR echivalent`
      : null;

  const confidenceNarrative = buildConfidenceNarrative(confidenceData?.level, comps.length);

  const reportJsonLd = extracted
    ? {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        name: extracted.title || "Apartament Bucuresti",
        description: listingDescription ? String(listingDescription).slice(0, 300) : undefined,
        url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://imobintel.ro"}/report/${analysis.id}`,
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

      <h1 className="text-2xl font-semibold mb-6">Raport analiza</h1>

      {/* Non-Bucharest disclaimer */}
      {(() => {
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

      {String(analysis?.status ?? "") === "rejected_rental" && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
          <div className="font-medium text-blue-800">Anunt de inchiriere detectat</div>
          <div className="mt-1 text-blue-700">
            ImobIntel analizeaza momentan doar anunturi de vanzare. Suportul pentru chirii si regim
            hotelier este in constructie si va fi disponibil in curand.
          </div>
        </div>
      )}

      {String(analysis?.status ?? "") === "rejected_not_realestate" && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
          <div className="font-medium text-red-800">Proprietate nerezidentiala detectata</div>
          <div className="mt-1 text-red-700">
            ImobIntel analizeaza doar proprietati rezidentiale: apartamente, garsoniere, case, vile,
            studiouri, mansarde, penthouse-uri si duplex-uri. Spatiile comerciale, afacerile,
            terenurile, birourile si halele industriale nu sunt suportate.
          </div>
        </div>
      )}

      {!extracted &&
        !["rejected_rental", "rejected_not_realestate"].includes(
          String(analysis?.status ?? ""),
        ) && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
            <div className="font-medium text-red-800">
              {analysis?.status === "error" || analysis?.status === "failed"
                ? "Analiza nu a putut fi finalizata"
                : "Nu avem inca date extrase pentru acest raport"}
            </div>
            <div className="mt-1 text-red-700">
              {analysis?.status === "error" || analysis?.status === "failed"
                ? "Nu am reusit sa extragem datele din anunt. Acest lucru se poate intampla cand site-ul sursa blocheaza accesul automat. Incearca din nou - de obicei functioneaza la a doua incercare."
                : `Status analiza: ${analysis?.status ?? "-"}`}
            </div>
            {(analysis?.status === "error" || analysis?.status === "failed") &&
              analysis?.sourceUrl && <RetryAnalysisButton url={analysis.sourceUrl} />}
          </div>
        )}

      {isUnsupportedType && extracted && (
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
      {extracted && hasPlusTVA && vatComputed && (
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

      {/* Under construction + render warning banner */}
      {extracted && devSignals.isUnderConstruction && (
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

      {/* 1-3 Decision -> TLDR -> pro/contra; 4 Pret+scor; then risk, harta, costuri, detalii */}
      {extracted && (
        <>
          <div className="mb-12 space-y-8 md:space-y-10">
            <ReportAboveFoldHeader
              verdict={executiveVerdict}
              propertyTitle={(extracted.title as string) ?? null}
              askingPrice={listingPriceForHeader}
              currency={listingCurrencyForHeader}
              priceSecondaryLine={headerPriceSecondaryLine}
              hasPlusTVA={hasPlusTVA}
              priceTrustLine={priceTrustLine}
              riskImpactLine={riskImpactLine}
              confidenceNarrative={confidenceNarrative}
              tldrItems={reportTldrItems}
              pros={apartmentScore.pros}
              cons={apartmentScore.cons}
            />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
              <div className="lg:col-span-7 space-y-5">
                <VerdictSection
                  priceRange={priceRange}
                  actualPrice={actualPrice}
                  confidence={confidenceData ?? null}
                  compsFair={compsFairRange}
                  currency={extracted?.currency ?? "EUR"}
                  compsCount={comps.length}
                />
                <PriceAnchorsSection
                  askingPrice={actualPrice ?? null}
                  avmLow={priceRange?.low ?? null}
                  avmMid={priceRange?.mid ?? null}
                  avmHigh={priceRange?.high ?? null}
                  notarialTotal={notarialTotal}
                  notarialZone={notarialZone}
                  notarialYear={notarialYear}
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

            <ReportCollapsible title="Detalii motor analiza (optional)" defaultOpen={false}>
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
          </div>

          <div className="space-y-10 mb-10">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
              <RiskStackSection
                riskStack={riskStackExplain ?? null}
                seismicExplain={
                  seismicExplain
                    ? seismicExplain
                    : {
                        riskClass: seismic.level !== "None" ? seismic.level : null,
                        sourceUrl: seismic.sourceUrl,
                      }
                }
                titleMentionsRisk={titleMentionsRisk}
              />
              <TtsSection
                ttsBucket={ttsResult?.bucket ?? analysis?.scoreSnapshot?.ttsBucket}
                scoreDays={ttsResult?.scoreDays}
                minMonths={ttsResult?.minMonths}
                maxMonths={ttsResult?.maxMonths}
                estimateMonths={ttsResult?.estimateMonths}
              />
            </div>

            {geoLat != null && geoLng != null && (
              <NeighborhoodIntelV2 lat={geoLat} lng={geoLng} initialRadiusM={1000} mode="report" />
            )}
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

            <Card className="border-0 shadow-sm ring-1 ring-slate-200/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Comparabile gasite automat in zona</CardTitle>
                <CardDescription>
                  {comps.length
                    ? `${comps.length} rezultate · mediana zonei ~ ${compsStats?.median ? `${Math.round(compsStats.median)} EUR/mp` : "-"} (~ estimat)`
                    : "Lista goala - nu am putut extrage comparabile utile pentru acest punct."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {comps.length ? (
                  <CompsClientBlock
                    comps={comps.map((c) => ({
                      id: c.id,
                      title: c.title,
                      photo: c.photo,
                      sourceUrl: c.sourceUrl,
                      priceEur: c.priceEur,
                      areaM2: c.areaM2,
                      eurM2: c.eurM2,
                      distanceM: c.distanceM,
                      score: c.score,
                      lat: c.lat,
                      lng: c.lng,
                    }))}
                    center={{
                      lat: f?.lat ?? null,
                      lng: f?.lng ?? null,
                    }}
                  />
                ) : (
                  <div className="rounded-lg bg-amber-50/60 p-4 ring-1 ring-amber-100/90 space-y-2">
                    <p className="text-sm font-semibold text-amber-950">
                      Nu avem suficiente comparabile in zona pentru o lista automata.
                    </p>
                    <p className="text-[13px] text-slate-800">
                      <span className="font-semibold">Ce inseamna pentru tine: </span>
                      Estimarea de pret din raport are mai putina ancora obiectiva - nu trata intervalul
                      ca „pret corect”.
                    </p>
                    <p className="text-[13px] text-slate-800">
                      <span className="font-semibold">Pas urmator: </span>
                      Recomandare: foloseste o evaluare independenta sau cauta manual 3-4 anunturi similare
                      (aceeasi zona, mp, finisaj).
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

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

            <ReportCollapsible title="Anunt: fisa, foto, ce mai spun datele" defaultOpen={false}>
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
                      .map(normalizeReportPhotoUrl)
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
                          src={src}
                          alt={`Foto ${i + 1}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading={i < 2 ? "eager" : "lazy"}
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

            <ReportCollapsible title="Negociere, istoric, checklist" defaultOpen={false}>
              <div className="space-y-4">
                <NegotiationPointsSection
                  points={negotiationPoints}
                  whatsAppDraft={whatsAppDraft}
                  suggestedLow={
                    compsStats?.q1 && f?.areaM2 ? Math.round(compsStats.q1 * f.areaM2) : null
                  }
                  suggestedHigh={
                    compsStats?.median && f?.areaM2
                      ? Math.round(compsStats.median * f.areaM2)
                      : null
                  }
                  currency={extracted?.currency ?? "EUR"}
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

                <ListingHistorySection
                  snapshots={historySnapshots}
                  duplicates={historyDuplicates}
                  currency={extracted?.currency ?? "EUR"}
                />

                <SellerChecklist
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
              </div>
            </ReportCollapsible>

            <ReportCollapsible title="Metodologie estimare" defaultOpen={false}>
              <MethodologySection
                baselineEurM2={(avmExplain?.baselineEurM2 as number) ?? null}
                adjustments={(avmExplain?.adjustments as Record<string, number>) ?? null}
                compsCount={comps.length}
                outlierCount={(compsExplain?.outlierCount as number) ?? null}
              />
            </ReportCollapsible>
          </div>
        </>
      )}

      {/* PDF Download */}
      {analysis?.status === "done" && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exporta raport</CardTitle>
            </CardHeader>
            <CardContent>
              <PdfActions analysisId={analysis.id} />
            </CardContent>
          </Card>
        </div>
      )}

      {isLlmEnriching && <LlmEnrichTrigger analysisId={analysis?.id ?? ""} />}

      {/* Chat assistant */}
      {extracted && <ReportChat analysisId={analysis?.id ?? ""} />}
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
  const analysis = id
    ? await prisma.analysis.findUnique({
        where: { id },
        include: { extractedListing: true },
      })
    : null;
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

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

  return {
    title,
    description,
    alternates: { canonical: `/report/${id ?? ""}` },
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
