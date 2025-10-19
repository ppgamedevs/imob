"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import Image from "next/image";
import React from "react";

import { ListingCard } from "@/components/listing-card";
import ReportPreview from "@/components/pdf/ReportPreview";
import RefreshButton from "@/components/refresh-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ConditionCard from "@/components/vision/ConditionCard";
import { prisma } from "@/lib/db";
import estimatePriceRange from "@/lib/ml/avm";
import estimateTTS from "@/lib/ml/tts";
import { computeYield, estimateRent, type YieldResult } from "@/lib/ml/yield";
import { matchSeismic } from "@/lib/risk/seismic";

import AvmCard from "./_components/AvmCard";

// keep params typing loose to satisfy Next.js PageProps constraints
type Props = { params: any };
async function loadAnalysis(id: string) {
  return prisma.analysis.findUnique({
    where: { id },
    include: {
      extractedListing: true,
      featureSnapshot: true,
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
    const areaStats = {
      medianEurPerM2: ad?.medianEurM2 ?? 1500,
      count: ad?.supply ?? 1,
    };
    priceRange = estimatePriceRange(f, areaStats as any) as any;

    // compute Time-to-Sell input values and persist ScoreSnapshot
    if (priceRange) {
      try {
        const actualPrice = (f?.price_eur as number) ?? (extracted?.price as number) ?? null;

        // priceDelta: relative difference (actual / avmMid - 1)
        const avmMid = priceRange.mid ?? (priceRange.low + priceRange.high) / 2;
        const priceDelta = actualPrice != null && avmMid ? actualPrice / avmMid - 1 : 0;

        // demandScore: prefer areaDaily.demandScore, fallback to a supply-derived heuristic or 0.5
        const demandScore =
          ad?.demandScore ??
          (areaStats.count ? Math.max(0, Math.min(1, 1 - areaStats.count / 20)) : 0.5);

        // season heuristic: spring/summer (Apr-Sep) => high, winter (Dec-Feb) => low
        const month = new Date().getMonth();
        let season: "high" | "low" | "neutral" = "neutral";
        if (month >= 3 && month <= 8) season = "high";
        if (month === 11 || month === 0 || month === 1) season = "low";

        const tts = estimateTTS({ priceDelta, demandScore, season });
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
      } catch (e) {
        console.warn("Failed to upsert ScoreSnapshot", e);
      }
    }
  }

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
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Raport analiză</h1>
        <div className="flex gap-2">
          {/* client-side refresh button with toast */}
          <RefreshButton analysisId={analysis?.id ?? ""} />
          {/* Report preview (Client) */}
          <ReportPreview data={docData} analysisId={analysis?.id} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left column: listing info */}
        <div className="col-span-8">
          <h2 className="mb-4 text-lg font-medium">Informații anunț</h2>
          {extracted ? (
            <div>
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

            {/* Other metric cards (placeholders when missing) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="font-medium">Se vinde în</div>
                  <div className="text-sm text-muted-foreground">{f?.sell_in_months ?? "—"}</div>
                </div>
              </CardHeader>
              <CardContent>
                {f ? <div>{f?.sell_in_months ?? "—"}</div> : <Skeleton className="h-8 w-full" />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="font-medium">Randament</div>
                  <div className="text-sm text-muted-foreground">{f?.yield_gross ?? "—"}</div>
                </div>
              </CardHeader>
              <CardContent>
                {f ? <div>{f?.yield_gross ?? "—"}</div> : <Skeleton className="h-8 w-full" />}
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
                    {seismic.level !== "none" && (
                      <div className="mt-3 flex items-center gap-3">
                        <Badge variant="destructive">{seismic.level}</Badge>
                        {seismic.sourceUrl ? (
                          <a
                            className="text-sm text-primary underline"
                            href={seismic.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            verifică la sursă
                          </a>
                        ) : (
                          <div className="text-sm text-muted-foreground">verifică la sursă</div>
                        )}
                      </div>
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
    </div>
  );
}
