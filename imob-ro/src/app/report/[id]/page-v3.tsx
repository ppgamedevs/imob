import { Metadata } from "next";
import * as React from "react";

import { AdSlot } from "@/components/ads/AdSlot";
import { SponsoredCard } from "@/components/ads/SponsoredCard";
import { Container } from "@/components/layout/Container";
import { Surface } from "@/components/ui/Surface";

import AvmCard from "./cards/AvmCard";
import CompsCard, { type CompProperty } from "./cards/CompsCard";
import MapCard from "./cards/MapCard";
import QualityCard from "./cards/QualityCard";
import RiskCard from "./cards/RiskCard";
import TtsCard from "./cards/TtsCard";
import YieldCard from "./cards/YieldCard";
// Step 3 components
import Gallery from "./Gallery";
import KpiGrid from "./KpiGrid";
import ReportSummary from "./ReportSummary";
import StickyActions from "./StickyActions";

/**
 * Report Page v3 - Trust-building detail page
 *
 * Layout:
 * - Mobile: Stacked (Gallery → Summary → KpiGrid → Cards → Actions)
 * - Desktop: 2-column (left content + right sticky sidebar with actions + ad)
 *
 * Components:
 * - Gallery: Swipeable carousel with thumbnails
 * - ReportSummary: Header with price, AVM, meta
 * - KpiGrid: 2-col/3-col responsive tiles
 * - 7 narrative cards: Avm, Tts, Yield, Risk, Quality, Comps, Map
 * - StickyActions: Save, Compare, Share, Contact
 * - AdSlot: Right column rectangle (300×250)
 * - SponsoredCard: After Comps (1 max per report)
 */

// Mock data for development - replace with actual data loading
async function loadReportData(id: string) {
  // TODO: Replace with actual database query
  return {
    id,
    title: "Apartament 3 camere, Dorobanti",
    areaName: "Dorobanti",
    priceEur: 185000,
    eurM2: 2600,
    avmBadge: "fair" as const,
    meta: {
      areaM2: 71,
      rooms: 3,
      floor: "4",
      year: 2018,
      distMetroM: 450,
    },
    source: {
      host: "imobiliare.ro",
      url: "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/dorobanti/...",
      faviconUrl: "https://www.imobiliare.ro/favicon.ico",
    },
    updatedAt: new Date(Date.now() - 86400000 * 3), // 3 days ago
    images: [
      { src: "/placeholder-1.jpg", alt: "Living room" },
      { src: "/placeholder-2.jpg", alt: "Kitchen" },
      { src: "/placeholder-3.jpg", alt: "Bedroom" },
      { src: "/placeholder-4.jpg", alt: "Bathroom" },
      { src: "/placeholder-5.jpg", alt: "Balcony" },
    ],
    kpis: {
      avm: { mid: 182000, low: 175000, high: 190000 },
      tts: { bucket: "normal" as const, days: 60 },
      yield: { net: 0.055, rentEur: 850, eurM2Rent: 12 },
      seismic: { class: "none" as const, confidence: 0.85, source: "MDRAP" },
      quality: { label: "Good", score: 75 },
      metro: { distM: 450, station: "Aviatorilor" },
    },
    narratives: {
      avm: {
        avmEur: 182000,
        askingPriceEur: 185000,
        areaMedianEur: 2500 * 71,
        badge: "fair" as const,
      },
      tts: {
        bucket: "normal" as const,
        estimatedDays: 60,
        factors: {
          priceDelta: 1.6,
          seasonality: "medium" as const,
          demand: "high" as const,
        },
      },
      yield: {
        rentEur: 850,
        eurM2Rent: 12,
        areaM2: 71,
        netYield: 0.055,
        areaAvgYield: 0.048,
        priceEur: 185000,
        expenses: {
          maintenanceEur: 100,
          taxesEur: 30,
          managementEur: 70,
        },
      },
      risk: {
        seismicClass: "none" as const,
        confidence: 0.85,
        source: "MDRAP",
        yearBuilt: 2018,
        hasConsolidation: false,
      },
      quality: {
        overallScore: 75,
        completeness: 80,
        photoQuality: {
          count: 5,
          score: 70,
          hasExterior: true,
          hasInterior: true,
          hasFloorPlan: false,
        },
        textQuality: {
          descriptionLength: 450,
          score: 75,
          hasDetails: true,
        },
      },
      comps: [] as CompProperty[], // populated below
      map: {
        propertyLat: 44.475,
        propertyLng: 26.085,
        metroStation: {
          name: "Aviatorilor",
          lat: 44.478,
          lng: 26.082,
          line: "M2",
        },
        areaName: "Dorobanti",
      },
    },
  };
}

// Generate mock comps
const mockComps: CompProperty[] = [
  {
    id: "comp1",
    title: "Ap 3 cam Dorobanti",
    imageUrl: "/placeholder-comp-1.jpg",
    priceEur: 180000,
    eurM2: 2535,
    areaM2: 71,
    rooms: 3,
    distanceM: 120,
    similarity: 0.92,
    sourceHost: "imobiliare.ro",
  },
  {
    id: "comp2",
    title: "Apartament 3 camere renovat",
    imageUrl: "/placeholder-comp-2.jpg",
    priceEur: 190000,
    eurM2: 2676,
    areaM2: 71,
    rooms: 3,
    distanceM: 200,
    similarity: 0.88,
    sourceHost: "olx.ro",
  },
  {
    id: "comp3",
    title: "3 cam zona Aviatorilor",
    imageUrl: "/placeholder-comp-3.jpg",
    priceEur: 175000,
    eurM2: 2465,
    areaM2: 71,
    rooms: 3,
    distanceM: 350,
    similarity: 0.85,
    sourceHost: "storia.ro",
  },
  {
    id: "comp4",
    title: "Dorobanti 3 camere etaj 2",
    imageUrl: "/placeholder-comp-4.jpg",
    priceEur: 188000,
    eurM2: 2648,
    areaM2: 71,
    rooms: 3,
    distanceM: 180,
    similarity: 0.9,
    sourceHost: "publi24.ro",
  },
];

type Props = { params: Promise<{ id: string }> };

export default async function ReportPageV3({ params }: Props) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const report = await loadReportData(id);
  // Add mock comps to narratives
  report.narratives.comps = mockComps;

  return (
    <Container width="wide">
      {/* Mobile: Stacked layout */}
      <div className="lg:hidden space-y-6 pb-24">
        {/* Gallery */}
        <Gallery images={report.images} title={report.title} />

        {/* Summary */}
        <Surface elevation={1} rounded="lg" className="p-4">
          <ReportSummary
            title={report.title}
            areaName={report.areaName}
            priceEur={report.priceEur}
            eurM2={report.eurM2}
            avmBadge={report.avmBadge}
            meta={report.meta}
            source={report.source}
            updatedAt={report.updatedAt}
          />
        </Surface>

        {/* KPI Grid */}
        <KpiGrid {...report.kpis} />

        {/* Narrative Cards */}
        <Surface elevation={1} rounded="lg" className="p-4">
          <AvmCard {...report.narratives.avm} />
        </Surface>

        <Surface elevation={1} rounded="lg" className="p-4">
          <TtsCard {...report.narratives.tts} />
        </Surface>

        <Surface elevation={1} rounded="lg" className="p-4">
          <YieldCard {...report.narratives.yield} />
        </Surface>

        <Surface elevation={1} rounded="lg" className="p-4">
          <RiskCard {...report.narratives.risk} />
        </Surface>

        <Surface elevation={1} rounded="lg" className="p-4">
          <QualityCard {...report.narratives.quality} />
        </Surface>

        <Surface elevation={1} rounded="lg" className="p-4">
          <CompsCard
            comps={report.narratives.comps}
            subjectPriceEur={report.priceEur}
            subjectEurM2={report.eurM2}
          />
        </Surface>

        {/* Sponsored Card (after Comps) */}
        <SponsoredCard
          listing={{
            id: "sponsored-mobile-1",
            title: "Apartament 3 camere premium - Primaverii",
            price: 250000,
            area: 80,
            rooms: 3,
            neighborhood: "Primaverii",
            image: "/placeholder-sponsored.jpg",
            url: "https://partner-agency.ro/listing-123",
            sponsorId: "partner-agency",
          }}
          position={7}
        />

        <Surface elevation={1} rounded="lg" className="p-4">
          <MapCard {...report.narratives.map} />
        </Surface>

        {/* Sticky actions fixed at bottom */}
        <StickyActions propertyId={report.id} propertyTitle={report.title} />
      </div>

      {/* Desktop: 2-column layout */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
        {/* Left Column: Main Content */}
        <div className="space-y-6">
          {/* Gallery */}
          <Gallery images={report.images} title={report.title} />

          {/* Summary */}
          <Surface elevation={1} rounded="lg" className="p-6">
            <ReportSummary
              title={report.title}
              areaName={report.areaName}
              priceEur={report.priceEur}
              eurM2={report.eurM2}
              avmBadge={report.avmBadge}
              meta={report.meta}
              source={report.source}
              updatedAt={report.updatedAt}
            />
          </Surface>

          {/* KPI Grid */}
          <KpiGrid {...report.kpis} />

          {/* Narrative Cards */}
          <Surface elevation={1} rounded="lg" className="p-6">
            <AvmCard {...report.narratives.avm} />
          </Surface>

          <Surface elevation={1} rounded="lg" className="p-6">
            <TtsCard {...report.narratives.tts} />
          </Surface>

          <Surface elevation={1} rounded="lg" className="p-6">
            <YieldCard {...report.narratives.yield} />
          </Surface>

          <Surface elevation={1} rounded="lg" className="p-6">
            <RiskCard {...report.narratives.risk} />
          </Surface>

          <Surface elevation={1} rounded="lg" className="p-6">
            <QualityCard {...report.narratives.quality} />
          </Surface>

          <Surface elevation={1} rounded="lg" className="p-6">
            <CompsCard
              comps={report.narratives.comps}
              subjectPriceEur={report.priceEur}
              subjectEurM2={report.eurM2}
            />
          </Surface>

          {/* Sponsored Card (after Comps) */}
          <SponsoredCard
            listing={{
              id: "sponsored-desktop-1",
              title: "Apartament 3 camere premium - Primaverii",
              price: 250000,
              area: 80,
              rooms: 3,
              neighborhood: "Primaverii",
              image: "/placeholder-sponsored.jpg",
              url: "https://partner-agency.ro/listing-123",
              sponsorId: "partner-agency",
            }}
            position={7}
          />

          <Surface elevation={1} rounded="lg" className="p-6">
            <MapCard {...report.narratives.map} />
          </Surface>
        </div>

        {/* Right Column: Sticky Sidebar */}
        <div className="space-y-6">
          {/* Sticky wrapper */}
          <div className="sticky top-4 space-y-6">
            {/* Actions */}
            <Surface elevation={1} rounded="lg" className="p-4">
              <StickyActions propertyId={report.id} propertyTitle={report.title} />
            </Surface>

            {/* Ad Slot (Rectangle 300×250) */}
            <AdSlot
              id="report-rect-1"
              position="sidebar"
              size="rectangle"
              adUrl="https://partner-agency.ro/banner-300x250.jpg"
              clickUrl="https://track.imob.ro/click/sidebar-1"
            />

            {/* Related listings (placeholder) */}
            <Surface elevation={1} rounded="lg" className="p-4">
              <h3 className="text-sm font-semibold mb-3">Proprietăți Similare</h3>
              <div className="space-y-3 text-sm text-muted">
                <div className="p-2 border border-border rounded hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="font-medium text-text">Ap 3 cam Dorobanti</div>
                  <div className="text-xs">€175,000 · 2,465 €/m²</div>
                </div>
                <div className="p-2 border border-border rounded hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="font-medium text-text">Apartament renovat zona</div>
                  <div className="text-xs">€190,000 · 2,676 €/m²</div>
                </div>
                <div className="p-2 border border-border rounded hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="font-medium text-text">3 cam Aviatorilor</div>
                  <div className="text-xs">€188,000 · 2,648 €/m²</div>
                </div>
              </div>
            </Surface>
          </div>
        </div>
      </div>
    </Container>
  );
}

// Metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  if (!id) {
    return { title: "Report Not Found" };
  }

  const report = await loadReportData(id);

  return {
    title: `${report.title} - ${report.areaName}`,
    description: `${report.title} in ${report.areaName}. Price: €${report.priceEur.toLocaleString()}. ${report.meta.areaM2}m², ${report.meta.rooms} rooms. Built ${report.meta.year}.`,
    openGraph: {
      title: report.title,
      description: `€${report.priceEur.toLocaleString()} · ${report.meta.areaM2}m² · ${report.meta.rooms} cam`,
      images: report.images.length > 0 ? [{ url: report.images[0].src }] : [],
    },
  };
}
