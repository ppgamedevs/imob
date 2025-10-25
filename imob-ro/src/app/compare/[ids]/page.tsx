/**
 * Compare Listings Page
 *
 * Side-by-side comparison of up to 4 properties.
 * URL format: /compare/id1,id2,id3,...
 */

import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as React from "react";

import { AdSlot } from "@/components/ads/AdSlot";
import { AreaCompareCharts } from "@/components/compare/AreaCompareCharts";
import { CompareCharts } from "@/components/compare/CompareCharts";
import { CompareTable } from "@/components/compare/CompareTable";
import { Button } from "@/components/ui/button";
import { loadCompareListings } from "@/lib/compare/load";

interface PageProps {
  params: Promise<{
    ids: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const ids = resolvedParams.ids.split(",").slice(0, 4);
  const items = await loadCompareListings(ids);

  return {
    title: `Compară ${items.length} proprietăți | imob.ro`,
    description: `Comparație side-by-side: preț, €/m², AVM, randament, timp vânzare pentru ${items.length} proprietăți selectate.`,
  };
}

export default async function CompareListingsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const ids = resolvedParams.ids.split(",").slice(0, 4);
  const items = await loadCompareListings(ids);

  if (!items.length) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Compară proprietăți ({items.length})
          </h1>
          <p className="text-sm text-muted hidden md:block">
            Valorile cele mai bune sunt evidențiate în verde
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/discover">+ Adaugă</Link>
          </Button>
          <Button variant="outline" size="sm">
            📤 Partajează
          </Button>
          <Button variant="outline" size="sm">
            📄 PDF
          </Button>
        </div>
      </div>

      {/* Top Ad */}
      <AdSlot id="cmp-top" position="top" size="banner" />

      {/* Gallery Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group block space-y-2 focus-ring rounded-lg"
          >
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <Image
                src={item.mediaUrl || "/placeholder-listing.jpg"}
                alt={item.title}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
            <div className="text-sm font-medium line-clamp-2">{item.title}</div>
            <div className="text-xs text-muted">{item.areaName}</div>
          </Link>
        ))}
      </div>

      {/* Compare Table */}
      <CompareTable items={items} />

      {/* Charts */}
      <CompareCharts items={items} />

      {/* Inline Ad */}
      <AdSlot id="cmp-inline" position="inline" size="rectangle" />

      {/* Footer CTA */}
      <div className="bg-surface border border-border rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">Vrei să compari mai multe proprietăți?</h3>
        <p className="text-sm text-muted mb-4">
          Navighează în secțiunea Descoperă și adaugă proprietăți în comparator
        </p>
        <Button asChild>
          <Link href="/discover">Explorează proprietăți</Link>
        </Button>
      </div>
    </main>
  );
}
