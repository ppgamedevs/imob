import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdSlot } from "@/components/ads/AdSlot";
import { Container } from "@/components/layout/Container";
import { loadAreaPage } from "@/lib/areas/load";
import { formatChange, formatNumber } from "@/lib/areas/series";

import BestNow from "./BestNow";
import Charts from "./Charts";
import CompareAreas from "./CompareAreas";
import FaqSeo from "./FaqSeo";
import Hero from "./Hero";
import KpiGrid from "./KpiGrid";
import TilesMini from "./TilesMini";

export const revalidate = 900; // 15 minutes

interface AreaPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; range?: string }>;
}

export async function generateMetadata({ params }: AreaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadAreaPage(slug);

  if (!data) {
    return {
      title: "Zonă negăsită – imob.ro",
    };
  }

  const { kpis } = data;
  const change30dText = formatChange(kpis.medianEurM2Change30d);

  const title = `${kpis.name} — Prețuri, Chirii, Randament | București | imob.ro`;
  const description = `${kpis.name}, București: preț median ${formatNumber(kpis.medianEurM2)} €/m² (${change30dText} în 30 zile)${
    kpis.medianRentEurM2 ? `, chirie ${formatNumber(kpis.medianRentEurM2)} €/m²` : ""
  }${
    kpis.yieldNet ? `, randament ${(kpis.yieldNet * 100).toFixed(1)}%` : ""
  }. Analize AVM, TTS, și risc seismic pentru ${kpis.listingsNow} proprietăți.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/area/${slug}`,
    },
    openGraph: {
      title: `${kpis.name} — Date imobiliare în timp real`,
      description,
      url: `/area/${slug}`,
      type: "website",
      images: [
        {
          url: `/api/og/area?slug=${slug}`,
          width: 1200,
          height: 630,
          alt: `${kpis.name} statistici imobiliare`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og/area?slug=${slug}`],
    },
  };
}

export default async function AreaPage({ params, searchParams }: AreaPageProps) {
  const { slug } = await params;
  const { view = "price", range = "6m" } = await searchParams;

  const data = await loadAreaPage(slug);

  if (!data) {
    notFound();
  }

  const { kpis, series, tiles, best, neighbors, faq } = data;

  // Generate JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: kpis.name,
    address: {
      "@type": "PostalAddress",
      addressLocality: kpis.name,
      addressRegion: "București",
      addressCountry: "RO",
    },
    geo: tiles.bounds
      ? {
          "@type": "GeoCoordinates",
          latitude: (tiles.bounds[1] + tiles.bounds[3]) / 2,
          longitude: (tiles.bounds[0] + tiles.bounds[2]) / 2,
        }
      : undefined,
    aggregateRating:
      kpis.listingsNow > 0
        ? {
            "@type": "AggregateOffer",
            offerCount: kpis.listingsNow,
            priceCurrency: "EUR",
            offers: best.slice(0, 3).map((listing) => ({
              "@type": "Offer",
              price: listing.priceEur,
              priceCurrency: "EUR",
              url: `https://imob.ro${listing.href}`,
              availability: "https://schema.org/InStock",
            })),
          }
        : undefined,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "București",
        item: "https://imob.ro/area",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: kpis.name,
        item: `https://imob.ro/area/${slug}`,
      },
    ],
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="min-h-screen">
        {/* Hero Section */}
        <Hero kpis={kpis} series={series} />

        {/* Top Banner Ad */}
        <div className="border-b border-border">
          <Container className="py-4">
            <AdSlot id="area-top" position="top" size="banner" />
          </Container>
        </div>

        {/* KPI Grid */}
        <Container className="py-8">
          <KpiGrid kpis={kpis} />
        </Container>

        {/* Charts Section */}
        <div className="bg-surface/50 border-y border-border py-8">
          <Container>
            <Charts
              series={series}
              areaName={kpis.name}
              defaultView={view as any}
              defaultRange={range as any}
            />
          </Container>
        </div>

        {/* Tiles Mini-Heatmap */}
        <Container className="py-8">
          <TilesMini tiles={tiles} areaName={kpis.name} slug={slug} />
        </Container>

        {/* Best Listings Now */}
        <div className="bg-surface/50 border-y border-border py-8">
          <Container>
            <BestNow listings={best} areaName={kpis.name} slug={slug} />
          </Container>
        </div>

        {/* Inline Rectangle Ad */}
        <Container className="py-6">
          <div className="flex justify-center">
            <AdSlot id="area-inline" position="inline" size="rectangle" />
          </div>
        </Container>

        {/* Compare Areas */}
        <Container className="py-8">
          <CompareAreas currentSlug={slug} currentName={kpis.name} neighbors={neighbors} />
        </Container>

        {/* FAQ + SEO */}
        <div className="bg-surface/50 border-t border-border py-8">
          <Container>
            <FaqSeo areaName={kpis.name} faq={faq || []} />
          </Container>
        </div>
      </main>
    </>
  );
}
