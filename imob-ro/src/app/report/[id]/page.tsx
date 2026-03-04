import React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import estimatePriceRange, { type AreaStats } from "@/lib/ml/avm";
import estimateTTS from "@/lib/ml/tts";
import { computeYield, estimateRent, type YieldResult } from "@/lib/ml/yield";
import { nearestStationM } from "@/lib/geo";
import { matchSeismic } from "@/lib/risk/seismic";
import type { NormalizedFeatures } from "@/lib/types/pipeline";

import type { LlmTextExtraction, LlmVisionExtraction } from "@/lib/llm/types";

import AnalysisLoading from "./AnalysisLoading";
import CompsClientBlock from "./CompsClientBlock";
import { LlmEnrichTrigger } from "./LlmEnrichTrigger";
import { PdfActions } from "./PdfActions";
import DataInsightsSection from "./sections/DataInsightsSection";
import ListingInsightsSection from "./sections/ListingInsightsSection";
import MethodologySection from "./sections/MethodologySection";
import NegotiationSection from "./sections/NegotiationSection";
import PriceAnchorsSection from "./sections/PriceAnchorsSection";
import SeismicSection from "./sections/SeismicSection";
import SellerChecklist from "./sections/SellerChecklist";
import TtsSection from "./sections/TtsSection";
import NearbySection from "./sections/NearbySection";
import VerdictSection from "./sections/VerdictSection";
import ReportChat from "./ReportChat";
import { ViewTracker } from "./ViewTracker";

export const dynamic = "force-dynamic";

const PHOTO_BLACKLIST_PATTERNS = [
  /google\s*play/i, /app\s*store/i, /badge/i,
  /logo/i, /icon/i, /favicon/i, /avatar/i, /placeholder/i,
  /banner/i, /sprite/i, /widget/i,
  /play\.google\.com/i, /apple\.com\/.*badge/i,
  /\.svg$/i,
];

function isPropertyPhoto(url: string): boolean {
  return !PHOTO_BLACKLIST_PATTERNS.some((p) => p.test(url));
}

function looksLikeAddress(raw: string): boolean {
  if (!raw || raw.length < 5 || raw.length > 300) return false;
  const lower = raw.toLowerCase();
  const nonAddressPatterns = [
    /^descriere/, /^detalii/, /^informatii/, /^contact/, /^galerie/,
    /^vezi /, /^citeste/, /^afiseaza/, /^anunt/, /^oferta$/,
  ];
  if (nonAddressPatterns.some((p) => p.test(lower))) return false;
  return true;
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

  const slash = raw.match(/^(p|parter|ground_floor|ground|floor_?\d{0,2}|\d{1,2})\s*\/\s*(\d{1,2})$/i);
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
    const { notFound } = await import("next/navigation");
    notFound();
  }

  // Show loading page until the analysis is fully done
  if (analysis.status !== "done" && analysis.status !== "error") {
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

  const extracted = analysis?.extractedListing ?? null;
  const f = (analysis?.featureSnapshot?.features ?? null) as NormalizedFeatures | null;

  // Score explain data
  const scoreExplain = analysis?.scoreSnapshot?.explain as Record<string, unknown> | null;
  const compsExplain = scoreExplain?.comps as Record<string, unknown> | undefined;
  const compsStats = compsExplain?.eurM2 as { median?: number; q1?: number; q3?: number } | undefined;
  const confidenceData = scoreExplain?.confidence as { level: string; score: number } | undefined;
  const avmExplain = scoreExplain?.avm as Record<string, unknown> | undefined;

  // Compute AVM
  let priceRange: { low: number; high: number; mid: number; conf: number } | null = null;
  let ttsResult: Awaited<ReturnType<typeof estimateTTS>> | null = null;
  let yieldRes: YieldResult | null = null;
  let seismic: { level: "RS1" | "RS2" | "RS3" | "RS4" | "None"; sourceUrl?: string | null } = { level: "None" };

  const areaSlug = f?.areaSlug ?? (f as Record<string, unknown>)?.area_slug as string | undefined;
  const actualPrice = f?.priceEur ?? (f as Record<string, unknown>)?.price_eur as number | undefined ?? extracted?.price as number | undefined;

  if (areaSlug) {
    const ad = await prisma.areaDaily.findFirst({
      where: { areaSlug: String(areaSlug) },
      orderBy: { date: "desc" },
    });

    const areaStats: AreaStats = {
      medianEurPerM2: ad?.medianEurM2 ?? 1500,
      count: ad?.supply ?? 1,
    };
    priceRange = estimatePriceRange(f as NormalizedFeatures, areaStats);

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

        const rentM2 = estimateRent(f, null);
        const areaM2 = f?.areaM2 ?? (extracted?.areaM2 as number) ?? null;
        const rentPerMonth = rentM2 && areaM2 ? rentM2 * areaM2 : null;

        let capex = 0;
        if (typeof f?.conditionScore === "number") {
          capex = Math.round((1 - f.conditionScore) * 10000);
        }

        yieldRes = rentPerMonth ? computeYield((actualPrice as number) ?? 0, rentPerMonth, capex) : null;

        seismic = await matchSeismic(
          extracted?.lat ?? f?.lat,
          extracted?.lng ?? f?.lng,
          extracted?.addressRaw ?? f?.addressRaw ?? undefined,
        );
      } catch { /* scoring errors are non-fatal */ }
    }
  }

  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  // Tier check for notarial data visibility
  // TODO: re-enable paywall before going live
  let showNotarial = true;
  // if (session?.user?.id) {
  //   try {
  //     const { canAccess } = await import("@/lib/billing/entitlements");
  //     const access = await canAccess(session.user.id, "detailedScore");
  //     showNotarial = access.allowed;
  //   } catch { /* free tier by default */ }
  // }
  // if (isAdmin) showNotarial = true;

  // Notarial grid data from ScoreSnapshot
  const notarialTotal = analysis?.scoreSnapshot?.notarialTotal ?? null;
  const notarialZone = analysis?.scoreSnapshot?.notarialZone ?? null;
  const notarialYear = analysis?.scoreSnapshot?.notarialYear ?? null;

  // LLM enrichment data (read from DB, never call LLM here)
  const llmText = extracted?.llmTextExtract as unknown as LlmTextExtraction | null;
  const llmVision = extracted?.llmVisionExtract as unknown as LlmVisionExtraction | null;
  const isLlmEnriching = analysis?.status === "done" && !extracted?.llmEnrichedAt;
  const llmFailed = !!extracted?.llmEnrichedAt && !llmText;
  const showVision = showNotarial; // Pro tier sees vision data

  // Compute derived values for sections
  const overpricingPct = actualPrice && priceRange?.mid
    ? Math.round(((actualPrice - priceRange.mid) / priceRange.mid) * 100)
    : null;

  const seismicExplain = scoreExplain?.seismic as Record<string, unknown> | undefined;

  // Override seismic from pipeline data if available
  if (seismicExplain?.riskClass) {
    const rc = String(seismicExplain.riskClass);
    const mappedLevel = rc === "RsI" || rc === "RS1" ? "RS1"
      : rc === "RsII" || rc === "RS2" ? "RS2"
      : rc === "RsIII" || rc === "RS3" ? "RS3"
      : rc === "RsIV" || rc === "RS4" ? "RS4"
      : "None";
    seismic = { level: mappedLevel as typeof seismic.level, sourceUrl: seismicExplain.sourceUrl as string ?? null };
  }

  return (
    <div className="container mx-auto py-8 px-4">
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
        const city = f?.city as string | undefined;
        const addr = extracted?.addressRaw as string | undefined;
        const combinedText = `${city ?? ""} ${addr ?? ""} ${extracted?.title ?? ""}`.toLowerCase();
        const isBucharest = combinedText.includes("bucuresti") || combinedText.includes("bucurești") || combinedText.includes("ilfov") || combinedText.includes("sector");
        const hasCity = city || addr;
        if (hasCity && !isBucharest) {
          return (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <div className="font-medium text-amber-800">Zona cu acoperire limitata</div>
              <div className="mt-0.5 text-amber-700 text-xs">
                ImobIntel are suport complet doar pentru Bucuresti si Ilfov. Rapoartele pentru alte zone pot avea estimari mai putin precise din cauza numarului redus de comparabile si date disponibile.
              </div>
            </div>
          );
        }
        return null;
      })()}

      {!extracted && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <div className="font-medium">Nu avem inca date extrase pentru acest raport.</div>
          <div className="mt-1 text-muted-foreground">
            Status analiza: <b>{analysis?.status ?? "-"}</b>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: listing details */}
        <div className="lg:col-span-7 space-y-4">
          {extracted && (
            <Card>
              <CardHeader>
                <CardTitle>{extracted.title ?? "Fara titlu"}</CardTitle>
                <CardDescription>
                  {extracted.addressRaw && looksLikeAddress(extracted.addressRaw) ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(extracted.addressRaw + ", Bucuresti")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {extracted.addressRaw}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Pret</div>
                    <div className="font-semibold">{extracted.price ? `${extracted.price.toLocaleString("ro-RO")} ${extracted.currency ?? "EUR"}` : "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Pret/mp</div>
                    <div className="font-semibold">
                      {(() => {
                        const price = extracted.price as number | null;
                        const area = extracted.areaM2 as number | null;
                        if (!price || !area || area <= 0) return "-";
                        const pricePerM2 = Math.round(price / area);
                        const medianM2 = compsStats?.median;
                        return (
                          <span className="flex items-center gap-1.5">
                            {pricePerM2.toLocaleString("ro-RO")} {extracted.currency ?? "EUR"}/mp
                            {medianM2 && medianM2 > 0 && (
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                                pricePerM2 < medianM2 * 0.95
                                  ? "bg-emerald-50 text-emerald-700"
                                  : pricePerM2 > medianM2 * 1.05
                                    ? "bg-red-50 text-red-700"
                                    : "bg-gray-50 text-gray-600"
                              }`}>
                                {pricePerM2 < medianM2
                                  ? `${Math.round(((medianM2 - pricePerM2) / medianM2) * 100)}% sub zona`
                                  : pricePerM2 > medianM2
                                    ? `${Math.round(((pricePerM2 - medianM2) / medianM2) * 100)}% peste zona`
                                    : "~media zonei"}
                              </span>
                            )}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Suprafata</div>
                    <div className="font-semibold">{extracted.areaM2 ? `${extracted.areaM2} mp` : "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Camere</div>
                    <div className="font-semibold">{extracted.rooms ?? f?.rooms ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Etaj</div>
                    <div className="font-semibold">{displayFloor(extracted.floor ?? extracted.floorRaw ?? f?.floorRaw)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">An</div>
                    <div className="font-semibold">{extracted.yearBuilt ?? "-"}</div>
                  </div>
                  {(() => {
                    const st = (extracted.sourceMeta as Record<string, unknown>)?.sellerType as string | undefined;
                    const label = st === "agentie" ? "Agentie" : st === "proprietar" ? "Proprietar" : st === "dezvoltator" ? "Dezvoltator" : null;
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
                      <div className={`font-semibold ${llmText.hasParking ? "text-emerald-600" : "text-amber-600"}`}>
                        {llmText.hasParking ? "Da" : "Nu"}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Photo gallery */}
          {(() => {
            const allPhotos = extracted && Array.isArray(extracted.photos) ? (extracted.photos as string[]).filter(isPropertyPhoto) : [];
            return allPhotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl overflow-hidden">
                {allPhotos.slice(0, 6).map((src, i) => (
                  <div key={i} className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Foto ${i + 1}`}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading={i < 2 ? "eager" : "lazy"}
                    />
                  </div>
                ))}
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
          />

          {/* Nearby POI section */}
          {f?.lat != null && f?.lng != null && (
            <NearbySection
              lat={f.lat}
              lng={f.lng}
              distMetroM={f.distMetroM}
              nearestMetro={nearestStationM(f.lat, f.lng)?.name ?? null}
              hasParking={llmText?.hasParking ?? null}
            />
          )}

          {/* Comparables */}
          <Card>
            <CardHeader>
              <CardTitle>Comparabile</CardTitle>
              <CardDescription>
                {comps.length ? `${comps.length} rezultate` : "-"}
                {compsStats?.median ? ` - med: ${Math.round(compsStats.median)} EUR/mp` : ""}
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
                <Skeleton className="h-20 w-full" />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: analysis cards */}
        <div className="lg:col-span-5 space-y-4">
          <VerdictSection
            priceRange={priceRange}
            actualPrice={actualPrice}
            confidence={confidenceData ?? null}
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

          <TtsSection
            ttsBucket={ttsResult?.bucket ?? analysis?.scoreSnapshot?.ttsBucket}
            scoreDays={ttsResult?.scoreDays}
            minMonths={ttsResult?.minMonths}
            maxMonths={ttsResult?.maxMonths}
            estimateMonths={ttsResult?.estimateMonths}
          />

          <SeismicSection
            riskClass={seismicExplain?.riskClass as string ?? (seismic.level !== "None" ? seismic.level : null)}
            confidence={seismicExplain?.confidence as number ?? null}
            method={seismicExplain?.method as string ?? null}
            note={seismicExplain?.note as string ?? null}
            sourceUrl={seismicExplain?.sourceUrl as string ?? seismic.sourceUrl}
            matchedAddress={seismicExplain?.matchedAddress as string ?? null}
            intervention={seismicExplain?.intervention as string ?? null}
            nearby={seismicExplain?.nearby as { total: number; rsI: number; rsII: number; buildings: { address: string; riskClass: string; distanceM: number; intervention: string | null }[] } ?? null}
            titleMentionsRisk={(() => {
              const text = `${extracted?.title ?? ""} ${((extracted?.sourceMeta as Record<string, unknown>)?.description as string) ?? ""}`.toLowerCase();
              return /risc\s*seismic|bulina\s*rosie|clasa\s*de\s*risc|expertiza\s*tehnic/.test(text);
            })()}
          />

          <NegotiationSection
            overpricingPct={overpricingPct}
            yearBuilt={extracted?.yearBuilt ?? f?.yearBuilt}
            suggestedLow={compsStats?.q1 && f?.areaM2 ? Math.round(compsStats.q1 * f.areaM2) : null}
            suggestedHigh={compsStats?.median && f?.areaM2 ? Math.round(compsStats.median * f.areaM2) : null}
            floor={f?.level ?? null}
            hasParking={llmText?.hasParking ?? null}
            areaM2={extracted?.areaM2 ?? (f?.areaM2 as number) ?? null}
            rooms={extracted?.rooms ?? (f?.rooms as number) ?? null}
            compsCount={comps.length}
            seismicRisk={["RS1", "RS2", "RS3", "RsI", "RsII", "RsIII"].includes(seismic.level)}
            eurPerM2={actualPrice && extracted?.areaM2 ? actualPrice / extracted.areaM2 : null}
            zoneMedianEurM2={compsStats?.median ?? null}
          />

          <DataInsightsSection
            hasPrice={!!extracted?.price}
            hasArea={!!extracted?.areaM2}
            hasRooms={!!(extracted?.rooms ?? f?.rooms)}
            hasFloor={extracted?.floor != null || extracted?.floorRaw != null || f?.level != null}
            hasYear={!!(extracted?.yearBuilt ?? f?.yearBuilt)}
            hasAddress={!!extracted?.addressRaw}
            hasCoords={f?.lat != null && f?.lng != null}
            hasPhotos={Array.isArray(extracted?.photos) && (extracted.photos as unknown[]).length > 0}
            compsCount={comps.length}
            confidenceLevel={confidenceData?.level}
            seismicLevel={seismic.level}
          />

          <SellerChecklist
            yearBuilt={extracted?.yearBuilt ?? f?.yearBuilt}
            hasFloor={extracted?.floor != null || extracted?.floorRaw != null || f?.level != null}
            hasAddress={!!extracted?.addressRaw}
            hasCoords={f?.lat != null && f?.lng != null}
            hasArea={!!extracted?.areaM2}
            hasPhotos={Array.isArray(extracted?.photos) && (extracted.photos as unknown[]).length > 0}
            seismicAttention={["RS1", "RS2", "RS3", "RsI", "RsII", "RsIII"].includes(seismic.level)}
            overpricingPct={overpricingPct}
            compsCount={comps.length}
            confidenceLevel={confidenceData?.level}
            areaM2={extracted?.areaM2 ?? (f?.areaM2 as number) ?? null}
            titleAreaM2={(extracted as Record<string, unknown>)?.titleAreaM2 as number ?? null}
            rooms={extracted?.rooms ?? (f?.rooms as number) ?? null}
            title={extracted?.title ?? null}
            llmRedFlags={llmText?.redFlags ?? null}
            llmCondition={llmText?.condition ?? null}
            llmBalconyM2={llmText?.balconyM2 ?? null}
            description={((extracted?.sourceMeta as Record<string, unknown>)?.description as string) ?? null}
          />

          <MethodologySection
            baselineEurM2={avmExplain?.baselineEurM2 as number ?? null}
            adjustments={avmExplain?.adjustments as Record<string, number> ?? null}
            compsCount={comps.length}
            outlierCount={compsExplain?.outlierCount as number ?? null}
          />
        </div>
      </div>

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
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  return {
    title: analysis?.extractedListing?.title ?? "Raport analiza",
    openGraph: {
      title: analysis?.extractedListing?.title ?? "Raport analiza",
      url: `${base}/report/${id ?? ""}`,
    },
  };
}
