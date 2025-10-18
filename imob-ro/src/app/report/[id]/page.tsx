"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

import { ListingCard } from "@/components/listing-card";
import RefreshButton from "@/components/refresh-button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { prisma } from "@/lib/db";
import estimatePriceRange from "@/lib/ml/avm";

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

    // persist ScoreSnapshot
    if (priceRange) {
      try {
        await prisma.scoreSnapshot.upsert({
          where: { analysisId: analysis!.id },
          create: {
            analysisId: analysis!.id,
            avmLow: priceRange.low,
            avmHigh: priceRange.high,
            avmConf: priceRange.conf,
            ttsBucket: "unknown",
          },
          update: {
            avmLow: priceRange.low,
            avmHigh: priceRange.high,
            avmConf: priceRange.conf,
            ttsBucket: "unknown",
          },
        });
      } catch (e) {
        console.warn("Failed to upsert ScoreSnapshot", e);
      }
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Raport analiză</h1>
        <div className="flex gap-2">
          {/* client-side refresh button with toast */}
          <RefreshButton analysisId={analysis?.id ?? ""} />
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
                      <img
                        src={String(p)}
                        alt={`photo-${i}`}
                        className="h-full w-full object-cover"
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

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="font-medium">Stare din poze</div>
                  <div className="text-sm text-muted-foreground">{f?.photo_condition ?? "—"}</div>
                </div>
              </CardHeader>
              <CardContent>
                {f ? <div>{f?.photo_condition ?? "—"}</div> : <Skeleton className="h-8 w-full" />}
              </CardContent>
            </Card>

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
          </div>
        </div>
      </div>
    </div>
  );
}
