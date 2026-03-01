import React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import estimatePriceRange, { type AreaStats } from "@/lib/ml/avm";
import estimateTTS from "@/lib/ml/tts";
import { computeYield, estimateRent, type YieldResult } from "@/lib/ml/yield";
import { matchSeismic } from "@/lib/risk/seismic";
import type { NormalizedFeatures } from "@/lib/types/pipeline";

import CompsClientBlock from "./CompsClientBlock";
import { Poller } from "./poller";
import MethodologySection from "./sections/MethodologySection";
import NegotiationSection from "./sections/NegotiationSection";
import SeismicSection from "./sections/SeismicSection";
import SellerChecklist from "./sections/SellerChecklist";
import TtsSection from "./sections/TtsSection";
import VerdictSection from "./sections/VerdictSection";
import { ViewTracker } from "./ViewTracker";

export const revalidate = 300;

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
  let seismic: { level: "RS1" | "RS2" | "None"; sourceUrl?: string | null } = { level: "None" };

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

  // Compute derived values for sections
  const overpricingPct = actualPrice && priceRange?.mid
    ? Math.round(((actualPrice - priceRange.mid) / priceRange.mid) * 100)
    : null;

  const seismicExplain = scoreExplain?.seismic as Record<string, unknown> | undefined;

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
                <CardDescription>{extracted.addressRaw ?? "-"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Pret</div>
                    <div className="font-semibold">{extracted.price ? `${extracted.price.toLocaleString("ro-RO")} ${extracted.currency ?? "EUR"}` : "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Suprafata</div>
                    <div className="font-semibold">{extracted.areaM2 ? `${extracted.areaM2} mp` : "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Camere</div>
                    <div className="font-semibold">{extracted.rooms ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">An / Etaj</div>
                    <div className="font-semibold">{extracted.yearBuilt ?? "-"} / {extracted.floor ?? "-"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
            sourceUrl={seismic.sourceUrl}
          />

          <NegotiationSection
            overpricingPct={overpricingPct}
            yearBuilt={extracted?.yearBuilt ?? f?.yearBuilt}
            suggestedLow={compsStats?.q1 && f?.areaM2 ? Math.round(compsStats.q1 * f.areaM2) : null}
            suggestedHigh={compsStats?.median && f?.areaM2 ? Math.round(compsStats.median * f.areaM2) : null}
          />

          <SellerChecklist
            yearBuilt={extracted?.yearBuilt ?? f?.yearBuilt}
            hasFloor={extracted?.floor != null || f?.level != null}
            seismicAttention={seismic.level === "RS1" || seismic.level === "RS2"}
          />

          <MethodologySection
            baselineEurM2={avmExplain?.baselineEurM2 as number ?? null}
            adjustments={avmExplain?.adjustments as Record<string, number> ?? null}
            compsCount={comps.length}
            outlierCount={compsExplain?.outlierCount as number ?? null}
          />
        </div>
      </div>

      <Poller active={analysis?.status !== "done" && analysis?.status !== "error"} />
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
