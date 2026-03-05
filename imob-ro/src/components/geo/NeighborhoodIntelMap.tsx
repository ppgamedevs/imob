"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import IntelScoreCards from "./IntelScoreCards";
import {
  POI_CATEGORIES,
  POI_CATEGORY_KEYS,
  type PoiCategoryKey,
} from "@/lib/geo/poiCategories";
import type { OverpassPoi } from "@/lib/geo/overpass";
import type { IntelResult } from "@/lib/geo/intelScoring";

// Lazy-load the Leaflet map to avoid SSR issues
const MapView = dynamic(() => import("./MapView"), { ssr: false });

// ---- Types ----

interface Props {
  lat: number;
  lng: number;
  initialRadiusM?: number;
  mode: "report" | "estimate";
}

interface IntelResponse extends IntelResult {
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>;
  radius: number;
  center: { lat: number; lng: number };
}

// ---- Constants ----

const RADIUS_OPTIONS = [
  { value: 500, label: "500m" },
  { value: 1000, label: "1 km" },
  { value: 2000, label: "2 km" },
];

// ---- Helpers ----

function formatDist(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function getCategoryIcon(key: PoiCategoryKey): string {
  const icons: Record<PoiCategoryKey, string> = {
    supermarket: "🛒",
    transport: "🚇",
    school: "🎓",
    medical: "🏥",
    restaurant: "🍽️",
    park: "🌳",
    gym: "💪",
    parking: "🅿️",
  };
  return icons[key] ?? "📍";
}

// ---- Component ----

export default function NeighborhoodIntelMap({
  lat,
  lng,
  initialRadiusM = 1000,
  mode,
}: Props) {
  const [radius, setRadius] = useState(initialRadiusM);
  const [data, setData] = useState<IntelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<PoiCategoryKey | "intel">("intel");
  const [highlightedPoi, setHighlightedPoi] = useState<string | null>(null);
  const [enabledLayers, setEnabledLayers] = useState<Set<PoiCategoryKey>>(
    () => new Set(["supermarket", "transport", "school", "park"]),
  );

  // Fetch intel data
  const fetchIntel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/geo/intel?lat=${lat}&lng=${lng}&radius=${radius}`,
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json: IntelResponse = await res.json();
      setData(json);
    } catch {
      setError("Nu am putut incarca datele despre zona. Incercati din nou.");
    } finally {
      setLoading(false);
    }
  }, [lat, lng, radius]);

  useEffect(() => {
    if (lat && lng) fetchIntel();
  }, [fetchIntel, lat, lng]);

  // Active POIs for the map
  const mapPois = useMemo(() => {
    if (!data?.poisByCategory) return [];
    const pois: OverpassPoi[] = [];
    for (const key of enabledLayers) {
      const catPois = data.poisByCategory[key];
      if (catPois) pois.push(...catPois);
    }
    return pois;
  }, [data, enabledLayers]);

  // POI list for the sidebar
  const activePois = useMemo(() => {
    if (!data?.poisByCategory || activeCategory === "intel") return [];
    return data.poisByCategory[activeCategory] ?? [];
  }, [data, activeCategory]);

  const toggleLayer = useCallback((key: PoiCategoryKey) => {
    setEnabledLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const totalPois = useMemo(() => {
    if (!data?.poisByCategory) return 0;
    return Object.values(data.poisByCategory).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
  }, [data]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            Harta si inteligenta de cartier
            {totalPois > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                ({totalPois} puncte de interes)
              </span>
            )}
          </CardTitle>

          {/* Radius selector */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRadius(opt.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  radius === opt.value
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Layer toggles */}
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {POI_CATEGORY_KEYS.map((key) => {
            const cat = POI_CATEGORIES[key];
            const count = data?.poisByCategory?.[key]?.length ?? 0;
            const active = enabledLayers.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                  active
                    ? "border-gray-300 bg-white text-gray-800 shadow-sm"
                    : "border-transparent bg-gray-100 text-gray-400"
                }`}
              >
                <span>{getCategoryIcon(key)}</span>
                <span>{cat.labelRo}</span>
                {count > 0 && (
                  <span className={`${active ? "text-gray-500" : "text-gray-300"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Map */}
        <div className="relative" style={{ height: mode === "report" ? 380 : 320 }}>
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-sm text-muted-foreground">
              {error}
              <button
                onClick={fetchIntel}
                className="ml-2 text-blue-600 hover:underline"
              >
                Reincearca
              </button>
            </div>
          ) : (
            <MapView
              lat={lat}
              lng={lng}
              radius={radius}
              pois={mapPois}
              highlightedPoi={highlightedPoi}
              onPoiClick={setHighlightedPoi}
              loading={loading}
            />
          )}
        </div>

        {/* Tabs: Intel scores + per-category lists */}
        <div className="px-4 pt-3 pb-4">
          <Tabs
            value={activeCategory}
            onValueChange={(v) => setActiveCategory(v as PoiCategoryKey | "intel")}
          >
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-0.5 gap-0.5 bg-muted/50">
              <TabsTrigger value="intel" className="text-xs px-2.5 py-1.5 data-[state=active]:shadow-sm">
                Scoruri
              </TabsTrigger>
              {POI_CATEGORY_KEYS.map((key) => {
                const cat = POI_CATEGORIES[key];
                const count = data?.poisByCategory?.[key]?.length ?? 0;
                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="text-xs px-2.5 py-1.5 data-[state=active]:shadow-sm"
                  >
                    {getCategoryIcon(key)} {cat.labelRo}
                    {count > 0 && (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="intel" className="mt-3">
              <IntelScoreCards
                intel={
                  data
                    ? {
                        scores: data.scores,
                        evidence: data.evidence,
                        redFlags: data.redFlags,
                      }
                    : null
                }
                loading={loading}
              />
            </TabsContent>

            {POI_CATEGORY_KEYS.map((key) => (
              <TabsContent key={key} value={key} className="mt-3">
                <PoiList
                  pois={data?.poisByCategory?.[key] ?? []}
                  categoryKey={key}
                  highlightedPoi={highlightedPoi}
                  onPoiClick={setHighlightedPoi}
                  loading={loading}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="px-4 pb-3">
          <p className="text-[10px] text-muted-foreground">
            Date OpenStreetMap via Overpass API. Distantele sunt in linie dreapta. Scorurile sunt calculate automat pe baza densitatii si proximitatii punctelor de interes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- POI List sub-component ----

function PoiList({
  pois,
  categoryKey,
  highlightedPoi,
  onPoiClick,
  loading,
}: {
  pois: OverpassPoi[];
  categoryKey: PoiCategoryKey;
  highlightedPoi: string | null;
  onPoiClick: (id: string | null) => void;
  loading: boolean;
}) {
  const cat = POI_CATEGORIES[categoryKey];

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (pois.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Niciun punct de interes gasit in aceasta categorie ({cat.labelRo}) in raza selectata.
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[280px] overflow-y-auto">
      {pois.map((poi) => (
        <button
          key={poi.id}
          onClick={() =>
            onPoiClick(highlightedPoi === poi.id ? null : poi.id)
          }
          className={`w-full text-left flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
            highlightedPoi === poi.id
              ? "bg-blue-50 border border-blue-200"
              : "hover:bg-gray-50 border border-transparent"
          }`}
        >
          <span
            className="shrink-0 h-2 w-2 rounded-full"
            style={{ backgroundColor: cat.color }}
          />
          <span className="flex-1 truncate">
            {poi.name ?? poi.subType ?? "Fara nume"}
          </span>
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            {formatDist(poi.distanceM)}
          </span>
        </button>
      ))}
    </div>
  );
}
