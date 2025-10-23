"use server";
import Image from "next/image";
import React from "react";

// Report page with AVM, TTS, Yield, and Risk analysis
import FeedbackBanner from "@/components/FeedbackBanner";
import { ListingCard } from "@/components/listing-card";
import ReportPreview from "@/components/pdf/ReportPreview";
import RefreshButton from "@/components/refresh-button";
import ShareButton from "@/components/ShareButton";
import AreaHeatmap from "@/components/ui/area-heatmap";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Sparkline from "@/components/ui/sparkline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import UpgradeBanner from "@/components/UpgradeBanner";
import ConditionCard from "@/components/vision/ConditionCard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import estimatePriceRange, { type AreaStats } from "@/lib/ml/avm";
import estimateTTS from "@/lib/ml/tts";
import { getNearestCell, type TileCell } from "@/lib/tiles/loader";
import { computeYield, estimateRent, type YieldResult } from "@/lib/ml/yield";
import { matchSeismic } from "@/lib/risk/seismic";
import type { NormalizedFeatures } from "@/types/analysis";
import type { ScoreExplain } from "@/types/score-explain";

import AvmCard from "./_components/AvmCard";
import { decideClaim } from "./agent-actions";
import { ClaimButton } from "./ClaimButton";
import CompsClientBlock from "./CompsClientBlock";
// Client PDF export actions
import { PdfActions } from "./PdfActions.client";
import { Poller } from "./poller";
import { QualityCard } from "./QualityCard";
import { ReportShareButton } from "./ReportShareButton";
import { TrustCard } from "./TrustCard";
import { ViewTracker } from "./ViewTracker";

// Next.js 15: params is now a Promise
type Props = { params: Promise<{ id?: string | string[] }> };
async function loadAnalysis(id: string) {
  return prisma.analysis.findUnique({
    where: { id },
    include: {
      extractedListing: true,
      featureSnapshot: true,
      scoreSnapshot: true,
    },
  });
}

// Restart is handled via client API at /api/analysis/restart; formatting helper removed (unused)

export default async function ReportPage({ params }: Props) {
  const resolvedParams = await params;
  const id = Array.isArray(resolvedParams.id) ? resolvedParams.id[0] : resolvedParams.id;
  if (!id) throw new Error("Missing report id");
  const analysis = await loadAnalysis(id);

  // Load comparables from CompMatch table
  const comps = await prisma.compMatch.findMany({
    where: { analysisId: id },
    orderBy: { score: "desc" },
    take: 12,
  });

  // Load tile data for area intelligence (Day 34)
  let tileData: TileCell | null = null;
  if (analysis?.extractedListing?.lat && analysis?.extractedListing?.lng) {
    tileData = await getNearestCell(
      analysis.extractedListing.lat,
      analysis.extractedListing.lng
    );
  }

  // Load duplicate siblings (Day 19)
  const siblings = analysis?.groupId
    ? await prisma.analysis.findMany({
        where: { groupId: analysis.groupId, id: { not: analysis.id } },
        include: { extractedListing: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      })
    : [];

  // Load group snapshot for multi-source display (Day 26)
  const groupSnapshot = analysis?.groupId
    ? await prisma.groupSnapshot
        .findFirst({
          where: { groupId: analysis.groupId },
          orderBy: { createdAt: "desc" },
        })
        .catch(() => null)
    : null;

  const dedupGroup = analysis?.groupId
    ? await prisma.dedupGroup.findUnique({
        where: { id: analysis.groupId },
        select: { canonicalUrl: true },
      })
    : null;

  const groupSources = analysis?.groupId
    ? await prisma.analysis
        .findMany({
          where: { groupId: analysis.groupId },
          select: { sourceUrl: true, createdAt: true, id: true },
        })
        .then((analyses) =>
          analyses.map((a) => {
            let domain = "unknown";
            try {
              if (a.sourceUrl) {
                const url = new URL(a.sourceUrl);
                domain = url.hostname.replace(/^www\./, "");
              }
            } catch {
              // ignore
            }
            return {
              url: a.sourceUrl ?? "",
              domain,
              createdAt: a.createdAt,
              isCanonical: dedupGroup?.canonicalUrl === a.sourceUrl,
            };
          }),
        )
        .catch(() => [])
    : [];

  // Load trust snapshot & provenance events (Day 20)
  const trust = await prisma.trustSnapshot.findUnique({
    where: { analysisId: id },
  });

  const events = await prisma.provenanceEvent.findMany({
    where: { analysisId: id },
    orderBy: { happenedAt: "asc" },
    take: 12,
  });

  // Extract comps stats from ScoreSnapshot.explain
  const scoreExplain = analysis?.scoreSnapshot?.explain as Record<string, unknown> | null;
  const compsExplain = scoreExplain?.comps as Record<string, unknown> | undefined;
  const compsStats = compsExplain?.eurM2 as
    | { median?: number; q1?: number; q3?: number }
    | undefined;

  // Extract quality metrics from ScoreSnapshot.explain
  const qualityDetail = scoreExplain?.quality as Record<string, unknown> | undefined;

  const extracted = analysis?.extractedListing ?? null;
  const f = (analysis?.featureSnapshot?.features ?? null) as NormalizedFeatures | null;
  let yieldRes: YieldResult | null = null;
  let rentM2: number | null = null;
  const compsRentArr: number[] = [];
  let seismic: { level: "RS1" | "RS2" | "none"; sourceUrl?: string | null } = { level: "none" };

  // compute AVM using area daily stats when possible
  let priceRange: { low: number; high: number; mid: number; conf: number } | null = null;
  if (f?.area_slug) {
    const ad = await prisma.areaDaily.findFirst({
      where: { areaSlug: String(f.area_slug) },
      orderBy: { date: "desc" },
    });
    // latest area daily is represented by `ad` (most recent AreaDaily)
    const areaStats: AreaStats = {
      medianEurPerM2: ad?.medianEurM2 ?? 1500,
      count: ad?.supply ?? 1,
    };
    priceRange = estimatePriceRange(f, areaStats);

    // compute Time-to-Sell input values and persist ScoreSnapshot
    if (priceRange) {
      try {
        const actualPrice = (f?.price_eur as number) ?? (extracted?.price as number) ?? null;

        // compute some local values; note: priceDelta/demand/season used by server-side estimators
        // avmMid available as avmMidCalc below; avoid unused var warning

        const avmMidCalc = Math.round((priceRange.low + priceRange.high) / 2);
        const askingPrice = actualPrice;
        const areaM2Local =
          (typeof f?.areaM2 === "number" ? f.areaM2 : null) ??
          (extracted?.areaM2 as number) ??
          null;
        const conditionScoreLocal = typeof f?.conditionScore === "number" ? f.conditionScore : null;
        const tts = await estimateTTS({
          avmMid: avmMidCalc,
          asking: askingPrice ?? undefined,
          areaSlug: typeof f?.areaSlug === "string" ? f.areaSlug : undefined,
          month: new Date().getMonth() + 1,
          areaM2: areaM2Local ?? undefined,
          conditionScore: conditionScoreLocal ?? undefined,
        });
        // Yield estimation: extract comps rent per m2 or compute from comps with price/area
        const comps = Array.isArray(f?.comps) ? f.comps : null;
        // reuse outer compsRentArr
        if (comps) {
          for (const c of comps) {
            // prefer explicit rent_m2 if present
            if (typeof c?.rent_m2 === "number") compsRentArr.push(c.rent_m2);
            else if (
              typeof c?.price === "number" &&
              typeof c?.area_m2 === "number" &&
              c.area_m2 > 0
            ) {
              // if comp lists monthly_rent or price (for sale) it's not helpful; but if rent is present as price field and area provided
              // assume price field is monthly rent when flagged by c.is_rent
              if (c.is_rent) compsRentArr.push(c.price / c.area_m2);
            }
          }
        }

        rentM2 = estimateRent(f, compsRentArr.length ? compsRentArr : null);
        const areaM2 =
          (typeof f?.areaM2 === "number" ? f.areaM2 : null) ??
          (extracted?.areaM2 as number) ??
          null;
        const rentPerMonth = rentM2 && areaM2 ? rentM2 * areaM2 : null;

        // capex heuristic: map condition score or photo_condition to estimated one-time capex
        let capex = 0;
        const cond = typeof f?.conditionScore === "number" ? f.conditionScore : null;
        if (typeof cond === "number") {
          // cond: 0..1 (lower => worse) -> higher capex
          capex = Math.round((1 - cond) * 10000); // up to 10k
        } else if (f?.photo_condition === "poor") capex = 8000;
        else if (f?.photo_condition === "average") capex = 3000;

        yieldRes = rentPerMonth
          ? computeYield((actualPrice as number) ?? 0, rentPerMonth, capex)
          : null;

        // seismic risk: try to match using coordinates or address
        seismic = await matchSeismic(
          extracted?.lat ?? (typeof f?.lat === "number" ? f.lat : null),
          extracted?.lng ?? (typeof f?.lng === "number" ? f.lng : null),
          extracted?.addressRaw ??
            (typeof f?.address_raw === "string"
              ? f.address_raw
              : typeof f?.address === "string"
                ? f.address
                : null) ??
            undefined,
        );

        // Persist computed scores in ScoreSnapshot
        await prisma.scoreSnapshot.upsert({
          where: { analysisId: analysis!.id },
          create: {
            analysisId: analysis!.id,
            avmLow: priceRange.low,
            avmHigh: priceRange.high,
            avmConf: priceRange.conf,
            ttsBucket: tts.bucket,
            yieldGross: yieldRes?.yieldGross ?? null,
            yieldNet: yieldRes?.yieldNet ?? null,
            riskSeismic: seismic.level === "RS1" ? 1 : seismic.level === "RS2" ? 2 : null,
          },
          update: {
            avmLow: priceRange.low,
            avmHigh: priceRange.high,
            avmConf: priceRange.conf,
            ttsBucket: tts.bucket,
            yieldGross: yieldRes?.yieldGross ?? null,
            yieldNet: yieldRes?.yieldNet ?? null,
            riskSeismic: seismic.level === "RS1" ? 1 : seismic.level === "RS2" ? 2 : null,
          },
        });
        // compute a simple negotiability heuristic: short TTS + negative priceDelta -> higher chance
        // We'll persist negotiability in scoreSnapshot in future; for now compute locally
        // (no DB write to avoid schema churn)
      } catch (e) {
        console.warn("Failed to upsert ScoreSnapshot", e);
      }
    }
  }

  // areaDaily for display (may be null)
  const areaDailyForDisplay = f?.area_slug
    ? await prisma.areaDaily.findFirst({
        where: { areaSlug: String(f.area_slug) },
        orderBy: { date: "desc" },
      })
    : null;

  const docData = {
    address: extracted?.addressRaw ?? null,
    price: extracted?.price ?? null,
    avm: priceRange ? { low: priceRange.low, high: priceRange.high, conf: priceRange.conf } : null,
    tts: analysis?.scoreSnapshot?.ttsBucket ?? null,
    yieldNet: analysis?.scoreSnapshot?.yieldNet ?? null,
    riskSeismic: analysis?.scoreSnapshot?.riskSeismic ?? null,
    conditionScore: analysis?.scoreSnapshot?.conditionScore ?? null,
    comps: Array.isArray(f?.comps) ? (f!.comps as Array<Record<string, unknown>>) : null,
    photos: Array.isArray(extracted?.photos) ? (extracted?.photos as string[]) : null,
    negotiableProb: null as number | null,
    time_to_metro_min: typeof f?.time_to_metro_min === "number" ? f.time_to_metro_min : null,
  };

  // compute negotiability heuristic
  try {
    const avmMid = priceRange ? priceRange.mid : null;
    const actualPrice =
      (typeof f?.priceEur === "number" ? f.priceEur : null) ?? (extracted?.price as number) ?? null;
    const priceDelta = actualPrice != null && avmMid ? actualPrice / avmMid - 1 : 0;
    const ttsBucket = analysis?.scoreSnapshot?.ttsBucket ?? null;
    // base prob: lower priceDelta -> higher chance; scale -0.2 -> +0.6 probability
    let prob = Math.max(0, Math.min(1, 0.4 - priceDelta * 1.5));
    if (ttsBucket === "<30") prob = Math.min(1, prob + 0.25);
    if (ttsBucket === "90+") prob = Math.max(0, prob - 0.15);
    docData.negotiableProb = Math.round(prob * 100) / 100;
  } catch {
    docData.negotiableProb = null;
  }

  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const canonicalUrl = `${base}/report/${analysis?.id ?? ""}`;

  // Query price history for sparkline
  let priceHistory: number[] | null = null;
  if (analysis?.sourceUrl) {
    const ph = await prisma.priceHistory.findMany({
      where: { sourceUrl: analysis.sourceUrl },
      orderBy: { ts: "asc" },
      take: 30,
    });
    if (ph && ph.length) priceHistory = ph.map((p) => p.price);
  }

  type ScoreSnapshotRow = {
    explain?: ScoreExplain;
    estRent?: number | null;
    yieldGross?: number | null;
    yieldNet?: number | null;
    riskClass?: string | null;
    riskSource?: string | null;
  };

  // helper: safely read string property from unknown snapshots/features
  function getStringProp(obj: unknown, key: string): string | null {
    if (!obj || typeof obj !== "object") return null;
    const v = (obj as Record<string, unknown>)[key];
    return typeof v === "string" ? v : null;
  }

  const ss = (analysis?.scoreSnapshot ?? null) as ScoreSnapshotRow | null;
  const estRent = ss?.estRent ?? undefined;
  const yGross = ss?.yieldGross ?? undefined;
  const yNet = ss?.yieldNet ?? undefined;
  const rentExp = ss?.explain?.rent;
  const rentAdjRooms = (rentExp?.adjustments?.rooms ?? 1) as number;
  const rentAdjCondition = (rentExp?.adjustments?.condition ?? 1) as number;
  const rentAdjMetro = (rentExp?.adjustments?.metro ?? 1) as number;
  const rentAdjText = rentExp?.eurM2
    ? `Bază: ${Math.round(rentExp.eurM2)} €/m² — ajustări: rooms ${rentAdjRooms.toFixed(2)}, cond ${rentAdjCondition.toFixed(2)}, metro ${rentAdjMetro.toFixed(2)}`
    : null;

  // Prefer persisted seismic info from ScoreSnapshot when available
  const riskExplain = ss?.explain?.seismic ?? null;
  const riskClass = ss?.riskClass ?? riskExplain?.riskClass ?? null;
  const riskSource = ss?.riskSource ?? null;
  const riskConfidence =
    typeof riskExplain?.confidence === "number" ? riskExplain.confidence : null;
  const riskMethod = riskExplain?.method ?? null;
  const riskNote = riskExplain?.note ?? null;

  // Fetch claims for owner (Day 16)
  const session = await auth();
  const claims = await prisma.listingClaim.findMany({
    where: { analysisId: id },
    include: { agent: true },
    orderBy: { createdAt: "desc" },
  });
  const isOwner = session?.user?.id === analysis?.userId;

  return (
    <div className="container mx-auto py-8">
      {/* Track view event and dwell time (Day 35) */}
      <ViewTracker
        groupId={analysis?.groupId ?? null}
        analysisId={analysis?.id ?? ""}
        areaSlug={analysis?.group?.areaSlug ?? null}
        priceEur={extracted?.price ?? null}
        rooms={extracted?.rooms ?? null}
      />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Raport analiză</h1>
        <div className="flex gap-2">
          <UpgradeBanner />
          {/* client-side refresh button with toast */}
          <RefreshButton analysisId={analysis?.id ?? ""} />
          {/* Report preview (Client) */}
          <ReportPreview data={docData} analysisId={analysis?.id} />
          {/* PDF export actions */}
          <PdfActions analysisId={analysis?.id ?? ""} />
          {/* Public share link (Day 14) */}
          <ReportShareButton analysisId={analysis?.id ?? ""} />
          {/* Claim listing (Day 16) */}
          <ClaimButton analysisId={analysis?.id ?? ""} />
          <ShareButton url={canonicalUrl} title={extracted?.title ?? "Raport analiză"} />
        </div>
      </div>

      {/* Multi-source card (Day 26) */}
      {groupSnapshot && groupSources.length > 1 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-lg">
                  Apare pe {groupSnapshot.sources ?? groupSources.length} site-uri
                </span>
                {groupSnapshot.priceMin && groupSnapshot.priceMax && (
                  <Badge variant="secondary">
                    {groupSnapshot.priceMin.toLocaleString()} –{" "}
                    {groupSnapshot.priceMax.toLocaleString()} €
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {((groupSnapshot.domains as string[]) ?? []).map((d) => (
                <Badge key={d} variant="outline" className="text-xs">
                  {d}
                </Badge>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              {groupSources.slice(0, 4).map((s, i) => (
                <span key={i}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary"
                  >
                    {s.domain}
                  </a>
                  {s.isCanonical && (
                    <Badge variant="default" className="ml-1.5 text-xs">
                      Recomandat
                    </Badge>
                  )}
                  {i < Math.min(3, groupSources.length - 1) && " • "}
                </span>
              ))}
              {groupSources.length > 4 && (
                <span className="text-muted-foreground ml-2">
                  +{groupSources.length - 4} altele
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Left column: listing info */}
        <div className="col-span-8">
          <h2 className="mb-4 text-lg font-medium">Informații anunț</h2>
          {extracted ? (
            <div>
              {/* Active learning feedback banner for low-confidence AVM */}
              {priceRange &&
                (priceRange.conf < 0.4 ||
                  (priceRange.high &&
                    priceRange.low &&
                    priceRange.high / priceRange.low > 1.25)) && (
                  <FeedbackBanner analysisId={analysis!.id} />
                )}
              <ListingCard
                listing={{
                  id: extracted.id,
                  title: extracted.title ?? "Fără titlu",
                  price: extracted.price ?? 0,
                  area: extracted.areaM2 ?? 0,
                  rooms: extracted.rooms ?? 0,
                  neighborhood: extracted.addressRaw ?? "",
                  image: undefined,
                }}
              />

              {/* Simple gallery if photos exist */}
              {Array.isArray(extracted.photos) && extracted.photos.length > 0 ? (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {extracted.photos.map((p: string | unknown, i: number) => (
                    <div
                      key={i}
                      className="relative h-24 w-full overflow-hidden rounded-md bg-muted hover:scale-105 transition-transform cursor-pointer"
                    >
                      <Image
                        src={String(p)}
                        alt={`photo-${i}`}
                        fill
                        sizes="(max-width: 640px) 33vw, 20vw"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  <Card>
                    <CardContent>
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <Skeleton className="aspect-video w-full" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          )}

          <div className="mt-6">
            <h3 className="text-md mb-2 font-semibold">Detalii</h3>
            <Card>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <div className="mb-1 font-medium">Link</div>
                    <div className="truncate">{analysis?.sourceUrl ?? "—"}</div>
                  </div>
                  <div>
                    <div className="mb-1 font-medium">Adresa</div>
                    <div className="truncate">{extracted?.addressRaw ?? "—"}</div>
                  </div>
                  <div>
                    <div className="mb-1 font-medium">Etaj</div>
                    <div>{extracted?.floor ?? "—"}</div>
                  </div>
                  <div>
                    <div className="mb-1 font-medium">An constr.</div>
                    <div>{extracted?.yearBuilt ?? "—"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right column: metric cards populated from features when available */}
        <div className="col-span-4">
          <div className="flex flex-col gap-4">
            {/* AVM card (interval) */}
            <AvmCard
              priceRange={priceRange}
              actualPrice={typeof f?.priceEur === "number" ? f.priceEur : undefined}
            />

            {/* Area interest heatmap */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="font-medium">Interes zonă</div>
                  <div className="text-sm text-muted-foreground">recent</div>
                </div>
              </CardHeader>
              <CardContent>
                {tileData ? (
                  <div className="space-y-3">
                    <AreaHeatmap score={tileData.intelligenceScore} />
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Metro:</span>
                        <span className="font-medium text-foreground">{tileData.nearestMetro} ({Math.round(tileData.distMetroM)}m)</span>
                      </div>
                      {(tileData.poiCounts.schools > 0 || tileData.poiCounts.supermarkets > 0) && (
                        <div className="flex justify-between">
                          <span>Facilități:</span>
                          <span className="font-medium text-foreground">
                            {tileData.poiCounts.schools > 0 && `${tileData.poiCounts.schools} școli`}
                            {tileData.poiCounts.schools > 0 && tileData.poiCounts.supermarkets > 0 && ', '}
                            {tileData.poiCounts.supermarkets > 0 && `${tileData.poiCounts.supermarkets} magazine`}
                          </span>
                        </div>
                      )}
                      {tileData.medianEurM2 && (
                        <div className="flex justify-between">
                          <span>Zonă avg:</span>
                          <span className="font-medium text-foreground">€{tileData.medianEurM2}/m²</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : areaDailyForDisplay ? (
                  <AreaHeatmap score={areaDailyForDisplay.demandScore ?? 0} />
                ) : (
                  <Skeleton className="h-8 w-full" />
                )}
              </CardContent>
            </Card>

            {/* Normalized features */}
            <Card>
              <CardHeader>
                <CardTitle>Detalii normalizate</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {analysis?.featureSnapshot?.features ? (
                  <ul className="space-y-1">
                    <li>
                      <b>Oraș:</b> {f?.city ?? "—"}
                    </li>
                    <li>
                      <b>Suprafață:</b> {f?.areaM2 ? `${f.areaM2} m²` : "—"}
                    </li>
                    <li>
                      <b>Preț (EUR):</b> {f?.priceEur ?? "—"}
                    </li>
                    <li>
                      <b>Camere:</b> {typeof f?.rooms === "number" ? f.rooms : "—"}
                    </li>
                    <li>
                      <b>Nivel:</b> {f?.level ?? "—"}
                    </li>
                    <li>
                      <b>An construcție:</b> {f?.yearBuilt ?? "—"}
                    </li>
                    <li>
                      <b>Distanță metrou:</b>
                      <span className="ml-1">
                        {f?.distMetroM != null ? `${Math.round(f.distMetroM)} m` : "—"}
                      </span>
                    </li>
                  </ul>
                ) : (
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                )}
              </CardContent>
            </Card>

            {/* Other metric cards (placeholders when missing) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="font-medium">Se vinde în</div>
                  <div className="text-sm text-muted-foreground">
                    {typeof f?.sell_in_months === "number" || typeof f?.sell_in_months === "string"
                      ? String(f.sell_in_months)
                      : "—"}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {f ? (
                  <div className="flex items-center gap-2">
                    <div className="text-sm">
                      {getStringProp(analysis?.featureSnapshot, "ttsBucket") ?? "—"}
                    </div>
                    {/* show approximate days when available from scoreSnapshot.explain.tts.scoreDays */}
                    {ss?.explain &&
                    ss.explain?.tts &&
                    typeof ss.explain.tts.scoreDays === "number" ? (
                      <div className="text-sm text-muted-foreground">
                        ≈ {ss.explain.tts.scoreDays} zile
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <Skeleton className="h-8 w-full" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="font-medium">Randament</div>
                  <div className="text-sm text-muted-foreground">{yGross ?? "—"}</div>
                </div>
              </CardHeader>
              <CardContent>
                {(yNet ?? yGross) ? (
                  <div className="text-sm space-y-1">
                    <p>
                      {yNet != null ? <b>{(yNet * 100).toFixed(1)}%</b> : null}
                      {yNet != null && yGross != null ? " net · " : null}
                    </p>
                    {yGross != null ? <p>{(yGross * 100).toFixed(1)}% brut</p> : null}
                    {estRent ? <p>Chirie estimată: ~ {estRent} €/lună</p> : null}
                    {rentAdjText ? (
                      <p className="text-xs text-muted-foreground">{rentAdjText}</p>
                    ) : null}
                  </div>
                ) : (
                  <Skeleton className="h-8 w-full" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="font-medium">Risc seismic</div>
                  <div className="text-sm text-muted-foreground">
                    {typeof f?.risk_seismic === "string" ? f.risk_seismic : "—"}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {f ? (
                  <div>{typeof f?.risk_seismic === "string" ? f.risk_seismic : "—"}</div>
                ) : (
                  <Skeleton className="h-8 w-full" />
                )}
              </CardContent>
            </Card>

            <ConditionCard
              photos={
                (Array.isArray(extracted?.photos) ? (extracted!.photos as string[]) : null) ??
                (Array.isArray(f?.photos) ? (f!.photos as string[]) : null)
              }
            />

            {/* Quality signals card */}
            <QualityCard detail={qualityDetail} />

            {/* Comparables card with carousel + map */}
            <Card>
              <CardHeader>
                <CardTitle>Comparabile</CardTitle>
                <CardDescription>
                  {comps.length ? `${comps.length} rezultate` : "—"}
                  {compsStats?.median ? (
                    <>
                      {" · "}
                      med: {Math.round(compsStats.median)} €/m²
                      {compsStats.q1 != null && compsStats.q3 != null
                        ? ` (IQR ${Math.round(compsStats.q1)}–${Math.round(compsStats.q3)})`
                        : ""}
                    </>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {comps.length ? (
                  <CompsClientBlock
                    comps={comps.map((c: (typeof comps)[number]) => ({
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
                      lat: typeof f?.lat === "number" ? f.lat : null,
                      lng: typeof f?.lng === "number" ? f.lng : null,
                    }}
                  />
                ) : (
                  <Skeleton className="h-20 w-full" />
                )}
              </CardContent>
            </Card>

            {/* Price history sparkline */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="font-medium">Istoric preț</div>
                  <div className="text-sm text-muted-foreground">30 zile</div>
                </div>
              </CardHeader>
              <CardContent>
                {priceHistory ? (
                  <Sparkline values={priceHistory} />
                ) : (
                  <Skeleton className="h-8 w-full" />
                )}
              </CardContent>
            </Card>

            {/* Yield card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="font-medium">Randament estimat</div>
                  <div className="text-sm text-muted-foreground">
                    {yieldRes ? `${Math.round((yieldRes.yieldNet ?? 0) * 10000) / 100}%` : "—"}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {yieldRes ? (
                  <div className="text-sm flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div>Gross</div>
                      <div className="font-semibold">{(yieldRes.yieldGross * 100).toFixed(2)}%</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>Net</div>
                      <div className="font-semibold">{(yieldRes.yieldNet * 100).toFixed(2)}%</div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">Verdict</div>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge
                              variant={
                                yieldRes.verdict === "ok"
                                  ? "default"
                                  : yieldRes.verdict === "mediocre"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {yieldRes.verdict}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={6}>
                            {yieldRes.verdict === "ok" &&
                              "Randament bun — potrivit pentru investitie."}
                            {yieldRes.verdict === "mediocre" &&
                              "Randament moderat — necesita atentie la costuri."}
                            {yieldRes.verdict === "slab" &&
                              "Randament scazut — risc ridicat sau pret prea mare."}
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        {rentM2
                          ? Array.isArray(compsRentArr) && compsRentArr.length
                            ? "bazat pe comps"
                            : "estimare din features"
                          : "—"}
                      </div>
                    </div>
                    {riskClass ? (
                      <div className="mt-3 flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <Badge variant={riskClass === "RS1" ? "destructive" : "secondary"}>
                            {riskClass}
                          </Badge>
                          {typeof riskConfidence === "number" ? (
                            <div className="text-sm text-muted-foreground">
                              {Math.round(riskConfidence * 100)}% încredere
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3">
                          {riskSource ? (
                            <a
                              className="text-sm text-primary underline"
                              href={String(riskSource)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              verifică la sursă
                            </a>
                          ) : (
                            <div className="text-sm text-muted-foreground">verifică la sursă</div>
                          )}

                          {riskMethod ? (
                            <div className="text-sm text-muted-foreground">
                              metodă: {riskMethod}
                            </div>
                          ) : null}
                        </div>

                        {riskNote ? (
                          <div className="text-xs text-muted-foreground">{riskNote}</div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">—</div>
                    )}
                  </div>
                ) : (
                  <Skeleton className="h-20 w-full" />
                )}
              </CardContent>
            </Card>

            {/* Trust Score (Day 20) */}
            {trust ? (
              <TrustCard
                score={trust.score}
                badge={trust.badge}
                reasons={trust.reasons as { plus?: string[]; minus?: string[] }}
              />
            ) : null}

            {/* Timeline (Day 20) */}
            {events.length > 0 ? (
              <div className="rounded-xl border p-3 text-sm">
                <div className="mb-1 font-medium">Timeline</div>
                <ul className="space-y-1">
                  {events.map((e) => (
                    <li key={e.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(e.happenedAt).toLocaleDateString("ro-RO")}
                      </span>
                      <span>· {e.kind}</span>
                      {typeof e.payload === "object" && e.payload && "domain" in e.payload ? (
                        <span className="text-xs text-muted-foreground">
                          ({(e.payload as { domain?: string }).domain})
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Claims management (Day 16) - visible only to owner */}
      {isOwner && claims.length > 0 && (
        <div className="mt-6 border rounded-xl p-4">
          <div className="font-medium mb-3">Cereri de revendicare</div>
          <div className="space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {claims.map((c: any) => (
              <form
                key={c.id}
                action={async (formData) => {
                  "use server";
                  const decision = formData.get("d") as "approved" | "rejected";
                  await decideClaim(c.id, decision);
                }}
                className="flex items-center justify-between gap-3 border rounded p-3"
              >
                <div className="text-sm">
                  <div className="font-medium">
                    {c.agent.fullName} · {c.agent.agencyName ?? "Agent independent"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Status: {c.status} · {c.createdAt.toLocaleString("ro-RO")}
                  </div>
                </div>
                {c.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      name="d"
                      value="approved"
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Aprobă
                    </button>
                    <button
                      name="d"
                      value="rejected"
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Respinge
                    </button>
                  </div>
                )}
              </form>
            ))}
          </div>
        </div>
      )}

      {/* Possible duplicates (Day 19) */}
      {siblings.length > 0 && (
        <div className="mt-6 border rounded-xl p-3">
          <div className="font-medium mb-2">Posibile duplicate ({siblings.length})</div>
          <div className="grid md:grid-cols-3 gap-2 text-sm">
            {siblings.map((s) => {
              const photos = Array.isArray(s.extractedListing?.photos)
                ? (s.extractedListing?.photos as string[])
                : [];
              return (
                <a
                  key={s.id}
                  href={s.sourceUrl || `/report/${s.id}`}
                  target={s.sourceUrl ? "_blank" : "_self"}
                  rel={s.sourceUrl ? "noopener noreferrer" : undefined}
                  className="border rounded-lg p-2 hover:shadow transition-shadow"
                >
                  {photos[0] ? (
                    <img src={photos[0]} className="h-24 w-full object-cover rounded" alt="" />
                  ) : (
                    <div className="h-24 bg-muted rounded" />
                  )}
                  <div className="mt-1 line-clamp-1">
                    {s.extractedListing?.title ?? s.sourceUrl}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      <Poller active={analysis?.status !== "done" && analysis?.status !== "error"} />
    </div>
  );
}

// metadata generator: set canonical, robots and og images for SEO
export async function generateMetadata(
  props: { params?: { id?: string | string[] } } | unknown,
): Promise<Record<string, unknown>> {
  // Next sometimes passes params as a Promise in PageProps typing; resolve defensively
  const maybeParams = await Promise.resolve(
    (props as { params?: { id?: string | string[] } })?.params,
  );
  const id = Array.isArray(maybeParams?.id) ? maybeParams.id[0] : maybeParams?.id;
  const analysis = id
    ? await prisma.analysis.findUnique({ where: { id }, include: { extractedListing: true } })
    : null;
  const isPrivate = analysis == null || analysis.status !== "completed";
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const canonical = `${base}/report/${id ?? ""}`;
  const address = analysis?.extractedListing?.addressRaw ?? "";
  const price = analysis?.extractedListing?.price
    ? String(analysis!.extractedListing!.price) + " EUR"
    : "";

  const ogUrl = `${base}/api/og/report/${encodeURIComponent(id ?? "")}?address=${encodeURIComponent(
    address,
  )}&price=${encodeURIComponent(price)}`;

  return {
    title: analysis?.extractedListing?.title ?? "Raport analiză",
    alternates: { canonical },
    robots: isPrivate ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: analysis?.extractedListing?.title ?? "Raport analiză",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
  };
}
