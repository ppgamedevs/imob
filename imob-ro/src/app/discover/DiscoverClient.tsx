"use client";

import * as React from "react";
import ListingCard, { ListingCardProps } from "@/components/listing/ListingCard";
import { AdSlot } from "@/components/ads/AdSlot";
import MapPanel, { MapItem } from "./MapPanel";
import type { FilterState } from "./FiltersBar";

/**
 * DiscoverClient - Client-side list+map with ad injection
 * 
 * Features:
 * - Fetch listings based on filters
 * - Deterministic ad injection (sponsored cards at [2,9,16], max 2)
 * - Static AdSlot after item 4
 * - Hover sync with map
 * - Responsive 2-pane layout
 */

export interface DiscoverClientProps {
  /** Initial server-rendered items (optional) */
  initialItems?: ListingCardProps[];
}

type RenderItem = ListingCardProps | { kind: "ad"; id: string };

export default function DiscoverClient({ initialItems = [] }: DiscoverClientProps) {
  const [items, setItems] = React.useState<ListingCardProps[]>(initialItems);
  const [loading, setLoading] = React.useState(false);
  const [highlightId, setHighlightId] = React.useState<string | undefined>();
  const [filters, setFilters] = React.useState<FilterState>({});

  // Fetch listings based on filters
  const fetchListings = React.useCallback(async (filterState: FilterState) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (filterState.area) params.set("area", filterState.area);
      if (filterState.priceMin) params.set("priceMin", String(filterState.priceMin));
      if (filterState.priceMax) params.set("priceMax", String(filterState.priceMax));
      if (filterState.areaM2Min) params.set("areaM2Min", String(filterState.areaM2Min));
      if (filterState.areaM2Max) params.set("areaM2Max", String(filterState.areaM2Max));
      if (filterState.rooms) params.set("rooms", String(filterState.rooms));
      if (filterState.sort) params.set("sort", filterState.sort);

      const response = await fetch(`/api/discover?${params.toString()}`);
      
      if (!response.ok) throw new Error("Failed to fetch listings");
      
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
      // Fallback to mock data in development
      if (process.env.NODE_ENV === "development") {
        setItems(generateMockData());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  React.useEffect(() => {
    fetchListings(filters);
  }, [filters, fetchListings]);

  // Inject ads deterministically
  const renderedItems = React.useMemo((): RenderItem[] => {
    return injectAds(items);
  }, [items]);

  // Convert items to map format
  const mapItems: MapItem[] = React.useMemo(() => {
    return items
      .filter((item) => item.lat && item.lng)
      .map((item) => ({
        id: item.id,
        lat: item.lat!,
        lng: item.lng!,
        priceEur: item.priceEur,
        avmBadge: item.avmBadge,
        title: item.title,
      }));
  }, [items]);

  return (
    <div className="lg:grid lg:grid-cols-[440px_minmax(0,1fr)] lg:gap-4">
      {/* List Panel */}
      <section
        className="border-t border-border lg:border-none lg:h-[calc(100dvh-128px)] lg:overflow-auto"
        aria-label="Listă proprietăți"
      >
        <div className="px-3 lg:px-0">
          {/* Desktop Top Banner Ad */}
          <div className="hidden lg:block mt-2 mb-4">
            <AdSlot id="discover-top" position="top" size="banner" />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-12 text-center text-muted">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              <p className="mt-4">Se încarcă...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && items.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-lg font-medium mb-2">
                Niciun rezultat găsit
              </p>
              <p className="text-sm text-muted">
                Încearcă să modifici filtrele de căutare
              </p>
            </div>
          )}

          {/* Listings Grid */}
          {!loading && items.length > 0 && (
            <ul className="grid grid-cols-1 gap-3 pb-6">
              {renderedItems.map((item, idx) => {
                if ("kind" in item && item.kind === "ad") {
                  return (
                    <li key={item.id}>
                      <AdSlot
                        id={item.id}
                        position="inline"
                        size="rectangle"
                      />
                    </li>
                  );
                }

                const listingItem = item as ListingCardProps;
                return (
                  <li key={listingItem.id}>
                    <ListingCard {...listingItem} onHover={setHighlightId} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Map Panel (Desktop Only) */}
      <aside
        className="sticky top-16 h-[calc(100dvh-64px)] hidden lg:block"
        aria-label="Hartă interactivă"
      >
        <MapPanel items={mapItems} highlightId={highlightId} />
      </aside>
    </div>
  );
}

/**
 * Inject ads deterministically into listing array
 * 
 * Rules:
 * - Sponsored cards at positions [2, 9, 16] (max 2 per page)
 * - Static AdSlot after position 4
 */
function injectAds(items: ListingCardProps[]): RenderItem[] {
  const output: RenderItem[] = [];
  const sponsoredPositions = new Set([2, 9, 16]);
  let sponsoredUsed = 0;
  const maxSponsored = 2;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Try to inject sponsored card
    if (
      sponsoredPositions.has(i) &&
      sponsoredUsed < maxSponsored &&
      item.sponsored
    ) {
      output.push({ ...item, sponsored: true });
      sponsoredUsed++;
      continue;
    }

    // Add organic listing
    output.push(item);

    // Inject static ad after position 4
    if (i === 4) {
      output.push({ kind: "ad", id: `discover-inline-${i}` });
    }
  }

  return output;
}

/**
 * Generate mock data for development
 */
function generateMockData(): ListingCardProps[] {
  const areas = ["Pipera", "Floreasca", "Aviației", "Dorobanți", "Primăverii"];
  const badges: Array<"under" | "fair" | "over"> = ["under", "fair", "over"];

  return Array.from({ length: 20 }, (_, i) => ({
    id: `listing-${i}`,
    groupId: `group-${i}`,
    href: `/report/listing-${i}`,
    mediaUrl: `https://picsum.photos/seed/${i}/800/600`,
    priceEur: Math.round(80000 + Math.random() * 200000),
    eurM2: Math.round(1200 + Math.random() * 800),
    avmBadge: badges[Math.floor(Math.random() * badges.length)],
    tts: Math.random() > 0.5 ? "sub 60 zile" : undefined,
    yieldNet: Math.random() > 0.5 ? Math.random() * 0.08 : undefined,
    seismic: Math.random() > 0.7 ? "RS1" : undefined,
    distMetroM: Math.random() > 0.5 ? Math.round(Math.random() * 2000) : undefined,
    areaM2: Math.round(50 + Math.random() * 100),
    rooms: Math.floor(2 + Math.random() * 3),
    floor: `${Math.floor(Math.random() * 10)}/${Math.floor(Math.random() * 10 + 5)}`,
    yearBuilt: Math.floor(1980 + Math.random() * 40),
    areaName: areas[Math.floor(Math.random() * areas.length)],
    title: `Apartament ${Math.floor(2 + Math.random() * 3)} camere, zona centrală`,
    sourceHost: "imobiliare.ro",
    faviconUrl: "https://www.imobiliare.ro/favicon.ico",
    sponsored: Math.random() > 0.85, // 15% sponsored
    lat: 44.3 + Math.random() * 0.25,
    lng: 25.95 + Math.random() * 0.3,
  }));
}

// Extend ListingCardProps to include lat/lng for map
declare module "@/components/listing/ListingCard" {
  interface ListingCardProps {
    lat?: number;
    lng?: number;
  }
}
