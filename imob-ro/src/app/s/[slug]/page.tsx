import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { scrubReportData, type ShareOptions } from "@/lib/share/scrub";

import { LeadForm } from "./lead";
import { ShareCTAs } from "./ShareCTAs";

export const dynamic = "force-dynamic";

async function loadBySlug(slug: string) {
  const sl = await prisma.shortLink.findUnique({ where: { slug } });
  if (!sl?.analysisId) return null;

  const a = await prisma.analysis.findUnique({
    where: { id: sl.analysisId },
    include: {
      extractedListing: true,
      featureSnapshot: true,
      scoreSnapshot: true,
      trustSnapshot: true,
    },
  });

  return { a, sl };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const data = await loadBySlug(resolvedParams.slug);

  if (!data?.a) {
    return { robots: { index: false } };
  }

  const title = data.a.extractedListing?.title
    ? `${data.a.extractedListing.title} — Analiză ImobIntel`
    : "Analiză imobiliară — ImobIntel";
  const desc =
    "Estimare preț, timp de vânzare, randament și risc seismic. Partajat prin ImobIntel.";
  const ogImageUrl = `/api/og/report/${data.a.id}`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: [{ url: ogImageUrl }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImageUrl],
    },
  };
}

export default async function SharePage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const data = await loadBySlug(params.slug);

  if (!data?.a || !data?.sl) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-semibold">Link invalid sau expirat</h1>
          <p className="text-muted-foreground">Acest raport nu mai este disponibil.</p>
        </div>
      </div>
    );
  }

  const { a, sl } = data;

  // Check if link is disabled or expired
  if (!sl.enabled || (sl.expiresAt && sl.expiresAt < new Date())) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-semibold">Link expirat</h1>
          <p className="text-muted-foreground">Acest raport nu mai este disponibil.</p>
        </div>
      </div>
    );
  }

  // Apply privacy scrubbing
  const opts = (sl.options as ShareOptions) || {};
  const scr = scrubReportData({ ...a }, opts);

  const f: any = scr.featureSnapshot?.features ?? {};

  const s: any = scr.scoreSnapshot ?? {};
  const photos: string[] = Array.isArray(scr.extractedListing?.photos)
    ? (scr.extractedListing?.photos as string[])
    : [];

  // Tracking pixel (fire-and-forget)
  const trackUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/share/track?slug=${encodeURIComponent(params.slug)}`;
  fetch(trackUrl, { cache: "no-store" }).catch(() => {});

  // Log view (best-effort, non-blocking)
  await prisma.reportUsage
    .create({
      data: {
        userId: "",
        analysisId: a.id,
        action: "VIEW_SHARE",
        meta: { slug: params.slug },
      },
    })
    .catch(() => {});

  // Share Insights (highlight badges)
  const insights: string[] = [];
  if (s.priceBadge === "Underpriced") insights.push("⭐ Underpriced");
  if (s.ttsBucket && parseInt(s.ttsBucket) <= 30) insights.push("⚡ TTS rapid (<30 zile)");
  if (s.yieldNet && s.yieldNet > 0.05) insights.push("💰 Yield >5%");
  if (a.trustSnapshot?.badge === "High") insights.push("✓ Trust High");

  return (
    <div className="relative min-h-screen bg-background">
      {insights.length > 0 && (
        <div className="mx-auto mb-4 max-w-6xl p-4 md:p-6 md:pb-0">
          <div className="flex flex-wrap gap-2">
            {insights.map((badge, i) => (
              <div
                key={i}
                className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600"
              >
                {badge}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl p-4 md:p-6 pb-12">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <h1 className="mb-2 line-clamp-2 text-2xl font-semibold md:text-3xl">
              {scr.extractedListing?.title ?? "Raport imobiliar"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {scr.extractedListing?.addressRaw || (opts.scrub ? f.areaSlug : a.sourceUrl)}
            </p>
          </div>
          <ShareCTAs analysisId={a.id} slug={params.slug} />
        </header>

        {/* Photo Gallery */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
            {photos.slice(0, 6).map((src, i) => (
              <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} className="w-full h-full object-cover" alt="" />
              </div>
            ))}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {/* AVM Price */}
          <div className="border rounded-xl p-4 bg-card">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Preț estimat
            </div>
            <div className="text-2xl font-semibold mb-1">
              {s.avmMid ? `${s.avmMid.toLocaleString("ro-RO")} €` : "—"}
            </div>
            {s.avmLow && s.avmHigh && (
              <div className="text-sm text-muted-foreground">
                Interval: {s.avmLow.toLocaleString("ro-RO")}–{s.avmHigh.toLocaleString("ro-RO")} €
              </div>
            )}
            <div className="text-xs mt-2">
              Încredere: {s.avmConf != null ? `${Math.round((s.avmConf || 0) * 100)}%` : "—"}
            </div>
          </div>

          {/* Time to Sell */}
          <div className="border rounded-xl p-4 bg-card">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Time to sell
            </div>
            <div className="text-2xl font-semibold mb-1">
              {s.ttsBucket ? `~${s.ttsBucket} zile` : "—"}
            </div>
            <div className="text-xs text-muted-foreground">Estimare bazată pe piață</div>
          </div>

          {/* Yield */}
          <div className="border rounded-xl p-4 bg-card">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Randament net
            </div>
            <div className="text-2xl font-semibold mb-1">
              {s.yieldNet != null ? `${(s.yieldNet * 100).toFixed(1)}%` : "—"}
            </div>
            {s.estRent && (
              <div className="text-sm text-muted-foreground">
                Chirie: {s.estRent.toLocaleString("ro-RO")} €/lună
              </div>
            )}
          </div>
        </div>

        {/* Property Details */}
        <div className="border rounded-xl p-4 bg-card mb-6">
          <div className="text-sm font-medium mb-3">Detalii proprietate</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs mb-1">Suprafață</div>
              <div className="font-medium">{f.areaM2 ? `${f.areaM2} m²` : "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-1">Camere</div>
              <div className="font-medium">{f.rooms ?? "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-1">Etaj</div>
              <div className="font-medium">{f.level ?? "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-1">An construcție</div>
              <div className="font-medium">{f.yearBuilt ?? "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-1">Distanță metrou</div>
              <div className="font-medium">
                {f.distMetroM != null ? `${Math.round(f.distMetroM)} m` : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-1">Risc seismic</div>
              <div className="font-medium">{s.riskClass ?? "—"}</div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="mb-8">
          <LeadForm analysisId={a.id} />
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground text-center border-t pt-4">
          Sursă anunț:{" "}
          {a.sourceUrl ? (
            <Link className="underline hover:text-foreground" href={a.sourceUrl} target="_blank">
              Vezi anunț original
            </Link>
          ) : (
            "—"
          )}
        </div>
      </div>
    </div>
  );
}
