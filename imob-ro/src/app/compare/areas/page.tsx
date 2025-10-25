/**
 * Compare Areas Page
 *
 * Side-by-side comparison of 2-4 neighborhoods.
 * URL format: /compare/areas?left=slug1&right=slug2&third=slug3&fourth=slug4
 */

import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as React from "react";

import { AdSlot } from "@/components/ads/AdSlot";
import { AreaCompareCharts } from "@/components/compare/AreaCompareCharts";
import { Button } from "@/components/ui/button";
import { loadCompareAreas } from "@/lib/compare/load-areas";

interface PageProps {
  searchParams: Promise<{
    left?: string;
    right?: string;
    third?: string;
    fourth?: string;
  }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const slugs = [
    resolvedParams.left,
    resolvedParams.right,
    resolvedParams.third,
    resolvedParams.fourth,
  ].filter(Boolean) as string[];

  const items = await loadCompareAreas(slugs);

  return {
    title: `Compară ${items.length} zone | imob.ro`,
    description: `Comparație zone: preț/m², chirie, randament, schimbare 12 luni pentru ${items.map((i) => i.name).join(", ")}.`,
  };
}

export default async function CompareAreasPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const slugs = [
    resolvedParams.left,
    resolvedParams.right,
    resolvedParams.third,
    resolvedParams.fourth,
  ].filter(Boolean) as string[];

  const items = await loadCompareAreas(slugs.slice(0, 4));

  if (!items.length) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Compară zone ({items.length})</h1>
          <p className="text-sm text-muted">Indicatori cheie pentru fiecare zonă din București</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/area">+ Schimbă zone</Link>
          </Button>
          <Button variant="outline" size="sm">
            📤 Partajează
          </Button>
        </div>
      </div>

      {/* Top Ad */}
      <AdSlot id="cmpa-top" position="top" size="banner" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((area) => (
          <Link
            key={area.slug}
            href={`/area/${area.slug}`}
            className="bg-surface border border-border rounded-lg p-4 hover:border-primary transition-colors focus-ring"
          >
            <h3 className="font-semibold mb-3">{area.name}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">€/m²:</span>
                <span className="font-medium">{area.medianEurM2.toLocaleString("ro-RO")}</span>
              </div>
              {area.change12m !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted">Δ 12m:</span>
                  <span className={area.change12m > 0 ? "text-success" : "text-danger"}>
                    {area.change12m > 0 ? "+" : ""}
                    {area.change12m.toFixed(1)}%
                  </span>
                </div>
              )}
              {area.yieldNet !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted">Randament:</span>
                  <span className="font-medium">{area.yieldNet.toFixed(1)}%</span>
                </div>
              )}
              {area.ttsMedianDays !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted">TTS:</span>
                  <span className="font-medium">~{area.ttsMedianDays} zile</span>
                </div>
              )}
              {area.listingsCount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted">Anunțuri:</span>
                  <span className="text-muted text-xs">{area.listingsCount}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <AreaCompareCharts items={items} />

      {/* Inline Ad */}
      <AdSlot id="cmpa-inline" position="inline" size="rectangle" />

      {/* Detailed Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Detalii comparative</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left px-4 py-3 text-sm font-semibold">Zonă</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Preț €/m²</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Chirie €/m²</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Randament</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Schimbare 12m</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">TTS median</th>
              </tr>
            </thead>
            <tbody>
              {items.map((area, idx) => (
                <tr key={area.slug} className={idx % 2 === 0 ? "bg-surface" : "bg-muted/10"}>
                  <td className="px-4 py-3 text-sm font-medium">{area.name}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    {area.medianEurM2.toLocaleString("ro-RO")} €
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-muted">
                    {area.rentEurM2?.toLocaleString("ro-RO") || "—"} €
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    {area.yieldNet?.toFixed(1) || "—"}%
                  </td>
                  <td
                    className={`px-4 py-3 text-sm text-right font-medium ${
                      area.change12m && area.change12m > 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {area.change12m !== undefined
                      ? `${area.change12m > 0 ? "+" : ""}${area.change12m.toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-muted">
                    ~{area.ttsMedianDays || 60} zile
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-surface border border-border rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">Explorează mai multe zone</h3>
        <p className="text-sm text-muted mb-4">
          Descoperă toate zonele din București cu statistici detaliate
        </p>
        <Button asChild>
          <Link href="/area">Vezi toate zonele</Link>
        </Button>
      </div>
    </main>
  );
}
