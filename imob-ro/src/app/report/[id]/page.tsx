"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import Image from "next/image";
import React from "react";

import FeedbackBanner from "@/components/FeedbackBanner";
import { ListingCard } from "@/components/listing-card";
import ReportPreview from "@/components/pdf/ReportPreview";
import RefreshButton from "@/components/refresh-button";
import ShareButton from "@/components/ShareButton";
import AreaHeatmap from "@/components/ui/area-heatmap";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Sparkline from "@/components/ui/sparkline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import UpgradeBanner from "@/components/UpgradeBanner";
import ConditionCard from "@/components/vision/ConditionCard";
import { prisma } from "@/lib/db";
import estimatePriceRange from "@/lib/ml/avm";
import estimateTTS from "@/lib/ml/tts";
import { computeYield, estimateRent, type YieldResult } from "@/lib/ml/yield";
import { computePriceBadge } from "@/lib/price-badge";
import { matchSeismic } from "@/lib/risk/seismic";

import AvmCard from "./_components/AvmCard";
import { Poller } from "./poller";

// keep params typing loose to satisfy Next.js PageProps constraints
type Props = { params: any };
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
  const analysis = await loadAnalysis(params.id);

  const extracted = analysis?.extractedListing ?? null;
  const features = (analysis?.featureSnapshot?.features ?? null) as any;
  const f = features as any;
  let yieldRes: YieldResult | null = null;
  const rentM2: number | null = null;
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
    const areaStats = {
      medianEurPerM2: ad?.medianEurM2 ?? 1500,
      count: ad?.supply ?? 1,
    };
    priceRange = estimatePriceRange(f, areaStats as any) as any;

    // compute Time-to-Sell input values and persist ScoreSnapshot
    if (priceRange) {
      try {
        const actualPrice = (f?.price_eur as number) ?? (extracted?.price as number) ?? null;

        // compute some local values; note: priceDelta/demand/season used by server-side estimators
        // avmMid available as avmMidCalc below; avoid unused var warning

        const avmMidCalc = Math.round((priceRange.low + priceRange.high) / 2);
        const askingPrice = actualPrice;
        const areaM2Local = (f?.area_m2 as number) ?? (extracted?.areaM2 as number) ?? null;
        const conditionScoreLocal = f?.condition_score ?? null;
        const tts = await estimateTTS({
          avmMid: avmMidCalc,
          asking: askingPrice ?? undefined,
          areaSlug: f?.area_slug ?? undefined,
          month: new Date().getMonth() + 1,
          areaM2: areaM2Local ?? undefined,
          conditionScore: conditionScoreLocal ?? undefined,
        });
        // Yield estimation: extract comps rent per m2 or compute from comps with price/area
        const comps = Array.isArray(f?.comps) ? f.comps : null;
        const compsRentArr: number[] = [];
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

        const rentM2 = estimateRent(f, compsRentArr.length ? compsRentArr : null);
        const areaM2 = (f?.area_m2 as number) ?? (extracted?.areaM2 as number) ?? null;
        const rentPerMonth = rentM2 && areaM2 ? rentM2 * areaM2 : null;

        // capex heuristic: map condition score or photo_condition to estimated one-time capex
        let capex = 0;
        const cond = f?.condition_score ?? null;
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
          extracted?.lat ?? f?.lat,
          extracted?.lng ?? f?.lng,
          extracted?.addressRaw ?? f?.address_raw ?? f?.address,
        );

        // avmMidCalc and askingPrice already computed above for TTS and scoring
        // keep askingPrice for later usage (askingPrice is set earlier)
        const priceBadgeCalc = computePriceBadge(
          askingPrice,
          priceRange.low,
          avmMidCalc,
          priceRange.high,
        );

        await prisma.scoreSnapshot.upsert({
          where: { analysisId: analysis!.id },
          // Cast create/update payloads to any because Prisma client types may be out-of-sync
          create: {
            analysisId: analysis!.id,
            avmLow: priceRange.low,
            avmHigh: priceRange.high,
            avmMid: avmMidCalc,
            priceBadge: priceBadgeCalc,
            avmConf: priceRange.conf,
            ttsBucket: tts.bucket,
            yieldGross: yieldRes?.yieldGross ?? null,
            yieldNet: yieldRes?.yieldNet ?? null,
            riskSeismic: seismic.level === "RS1" ? 1 : seismic.level === "RS2" ? 2 : null,
          } as any,
          update: {
            avmLow: priceRange.low,
            avmHigh: priceRange.high,
            avmMid: avmMidCalc,
            priceBadge: priceBadgeCalc,
            avmConf: priceRange.conf,
            ttsBucket: tts.bucket,
            yieldGross: yieldRes?.yieldGross ?? null,
            yieldNet: yieldRes?.yieldNet ?? null,
            riskSeismic: seismic.level === "RS1" ? 1 : seismic.level === "RS2" ? 2 : null,
          } as any,
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
    tts: (analysis?.featureSnapshot as any)?.ttsBucket ?? null,
    yieldNet: (analysis?.featureSnapshot as any)?.yieldNet ?? null,
    riskSeismic: (analysis?.featureSnapshot as any)?.riskSeismic ?? null,
    conditionScore: (analysis?.featureSnapshot as any)?.conditionScore ?? null,
    comps: (f?.comps as any) ?? null,
    photos: Array.isArray(extracted?.photos) ? (extracted?.photos as string[]) : null,
    negotiableProb: null as number | null,
    time_to_metro_min: (f?.time_to_metro_min as number) ?? null,
  };

  // compute negotiability heuristic
  try {
    const avmMid = priceRange ? priceRange.mid : null;
    const actualPrice = (f?.price_eur as number) ?? (extracted?.price as number) ?? null;
    const priceDelta = actualPrice != null && avmMid ? actualPrice / avmMid - 1 : 0;
    const ttsBucket = (analysis?.featureSnapshot as any)?.ttsBucket ?? null;
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

  const ss = analysis?.scoreSnapshot as any;
  const estRent = ss?.estRent;
  const yGross = ss?.yieldGross;
  const yNet = ss?.yieldNet;
  const rentExp = (ss?.explain as any)?.rent;
  const rentAdjRooms = (rentExp?.adjustments?.rooms ?? 1) as number;
  const rentAdjCondition = (rentExp?.adjustments?.condition ?? 1) as number;
  const rentAdjMetro = (rentExp?.adjustments?.metro ?? 1) as number;
  const rentAdjText = rentExp?.eurM2
    ? `Bază: ${Math.round(rentExp.eurM2)} €/m² — ajustări: rooms ${rentAdjRooms.toFixed(2)}, cond ${rentAdjCondition.toFixed(2)}, metro ${rentAdjMetro.toFixed(2)}`
    : null;

  // Prefer persisted seismic info from ScoreSnapshot when available
  const riskExplain = (ss?.explain as any)?.seismic ?? null;
  const riskClass = ss?.riskClass ?? riskExplain?.riskClass ?? null;
  const riskSource = ss?.riskSource ?? riskExplain?.source ?? riskExplain?.sourceUrl ?? null;
  const riskConfidence =
    typeof riskExplain?.confidence === "number" ? riskExplain.confidence : null;
  const riskMethod = riskExplain?.method ?? null;
  const riskNote = riskExplain?.note ?? null;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Raport analiză</h1>
        <div className="flex gap-2">
          <UpgradeBanner />
          {/* client-side refresh button with toast */}
          <RefreshButton analysisId={analysis?.id ?? ""} />
          {/* Report preview (Client) */}
          <ReportPreview data={docData} analysisId={analysis?.id} />
          <ShareButton url={canonicalUrl} title={extracted?.title ?? "Raport analiză"} />
        </div>
      </div>

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
                  {extracted.photos.map((p: any, i: number) => (
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
            <AvmCard priceRange={priceRange} actualPrice={f?.price_eur} />

            {/* Area interest heatmap */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="font-medium">Interes zonă</div>
                  <div className="text-sm text-muted-foreground">recent</div>
                </div>
              </CardHeader>
              <CardContent>
                {areaDailyForDisplay ? (
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
                      <b>Camere:</b> {f?.rooms ?? "—"}
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
                  <div className="text-sm text-muted-foreground">{f?.sell_in_months ?? "—"}</div>
                </div>
              </CardHeader>
              <CardContent>
                {f ? (
                  <div className="flex items-center gap-2">
                    <div className="text-sm">
                      {(analysis?.featureSnapshot as any)?.ttsBucket ?? "—"}
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
                  <div className="text-sm text-muted-foreground">{f?.risk_seismic ?? "—"}</div>
                </div>
              </CardHeader>
              <CardContent>
                {f ? <div>{f?.risk_seismic ?? "—"}</div> : <Skeleton className="h-8 w-full" />}
              </CardContent>
            </Card>

            <ConditionCard photos={extracted?.photos ?? (f?.photos as any) ?? null} />

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="font-medium">Comps</div>
                  <div className="text-sm text-muted-foreground">{f?.comps?.length ?? "—"}</div>
                </div>
              </CardHeader>
              <CardContent>
                {f?.comps ? (
                  <ul className="list-inside list-disc text-sm">
                    {f.comps.map((c: any, i: number) => (
                      <li key={i}>{c.title ?? c.address ?? JSON.stringify(c)}</li>
                    ))}
                  </ul>
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
          </div>
        </div>
      </div>
      <Poller active={analysis?.status !== "done" && analysis?.status !== "error"} />
    </div>
  );
}

// metadata generator: set canonical, robots and og images for SEO
export async function generateMetadata(props: any): Promise<any> {
  // Next sometimes passes params as a Promise in PageProps typing; resolve defensively
  const maybeParams = await Promise.resolve(props?.params);
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
