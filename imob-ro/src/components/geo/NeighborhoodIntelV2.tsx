"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import IntelScoreCards from "./IntelScoreCards";
import { SignalsPanel, ZoneTypeBadge } from "./SignalsPanel";
import { CompareInput, CompareResult } from "./ComparePanel";
import { compareLocations } from "@/lib/geo/compareLocations";
import {
  POI_CATEGORIES,
  POI_CATEGORY_KEYS,
  type PoiCategoryKey,
} from "@/lib/geo/poiCategories";
import type { OverpassPoi } from "@/lib/geo/overpass";
import type { IntelResult } from "@/lib/geo/intelScoring";
import type { DemandSignals } from "@/lib/geo/signals/querySignals";
import type { ZoneTypeResult } from "@/lib/geo/zoneType";
import type { CommuterResult } from "@/lib/geo/commuterRings";
import type { CompareVerdict } from "@/lib/geo/compareLocations";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

// ---- Types ----

interface Props {
  lat: number;
  lng: number;
  initialRadiusM?: number;
  mode: "report" | "estimate";
}

interface IntelV2Data {
  scores: IntelResult["scores"];
  evidence: IntelResult["evidence"];
  redFlags: string[];
  poisByCategory: Record<PoiCategoryKey, OverpassPoi[]>;
  zoneType: ZoneTypeResult;
  signals: DemandSignals;
  commuter: CommuterResult;
  radius: number;
  center: { lat: number; lng: number };
  cachedAt: string | null;
}

// ---- Helpers ----

const RADIUS_OPTIONS = [
  { value: 500, label: "500m" },
  { value: 1000, label: "1 km" },
  { value: 2000, label: "2 km" },
];

function getCategoryIcon(key: PoiCategoryKey): string {
  const icons: Record<PoiCategoryKey, string> = {
    supermarket: "🛒", transport: "🚇", school: "🎓", medical: "🏥",
    restaurant: "🍽️", park: "🌳", gym: "💪", parking: "🅿️",
  };
  return icons[key] ?? "📍";
}

function formatDist(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

// ---- Component ----

export default function NeighborhoodIntelV2({
  lat, lng, initialRadiusM = 1000, mode,
}: Props) {
  const [radius, setRadius] = useState(initialRadiusM);
  const [data, setData] = useState<IntelV2Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("intel");
  const [highlightedPoi, setHighlightedPoi] = useState<string | null>(null);
  const [enabledLayers, setEnabledLayers] = useState<Set<PoiCategoryKey>>(
    () => new Set(["supermarket", "transport", "school", "park"]),
  );
  const [showCommuter, setShowCommuter] = useState(false);

  // Compare state
  const [compareData, setCompareData] = useState<IntelV2Data | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareVerdict, setCompareVerdict] = useState<CompareVerdict | null>(null);

  const fetchIntelV2 = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/geo/intel-v2?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      if (!json?.scores) throw new Error("Invalid response");
      setData(json as IntelV2Data);
    } catch {
      setError("Nu am putut incarca datele. Incercati din nou.");
    } finally {
      setLoading(false);
    }
  }, [lat, lng, radius]);

  useEffect(() => {
    if (lat && lng) fetchIntelV2();
  }, [fetchIntelV2, lat, lng]);

  const handleCompare = useCallback(async (bLat: number, bLng: number) => {
    setCompareLoading(true);
    try {
      const res = await fetch(`/api/geo/intel-v2?lat=${bLat}&lng=${bLng}&radius=${radius}`);
      if (!res.ok) throw new Error("Fetch failed");
      const bData: IntelV2Data = await res.json();
      setCompareData(bData);

      if (data) {
        const verdict = compareLocations(
          { scores: data.scores, evidence: data.evidence, redFlags: data.redFlags },
          { scores: bData.scores, evidence: bData.evidence, redFlags: bData.redFlags },
          data.signals,
          bData.signals,
          data.zoneType,
          bData.zoneType,
        );
        setCompareVerdict(verdict);
      }
    } catch {
      // silent
    } finally {
      setCompareLoading(false);
    }
  }, [data, radius]);

  const mapPois = useMemo(() => {
    if (!data?.poisByCategory) return [];
    const pois: OverpassPoi[] = [];
    for (const key of enabledLayers) {
      const catPois = data.poisByCategory[key];
      if (catPois) pois.push(...catPois);
    }
    return pois;
  }, [data, enabledLayers]);

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
    return Object.values(data.poisByCategory).reduce((s, a) => s + a.length, 0);
  }, [data]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            Harta inteligenta
            {totalPois > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                ({totalPois} POI)
              </span>
            )}
            {data?.cachedAt && (
              <span className="text-[10px] font-normal text-muted-foreground">
                (cache)
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Commuter toggle */}
            <button
              onClick={() => setShowCommuter((p) => !p)}
              className={`px-2 py-1 text-[11px] font-medium rounded-md border transition-colors ${
                showCommuter ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-500"
              }`}
            >
              🚶 Isocrona
            </button>
            {/* Radius */}
            <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
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
                  <span className={active ? "text-gray-500" : "text-gray-300"}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Map */}
        <div className="relative" style={{ height: mode === "report" ? 400 : 340 }}>
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-sm text-muted-foreground">
              {error}
              <button onClick={fetchIntelV2} className="ml-2 text-blue-600 hover:underline">Reincearca</button>
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

        {/* Metro commute quick card */}
        {data?.commuter?.nearestMetro && (
          <div className="mx-4 mt-3 rounded-lg border bg-blue-50 border-blue-200 p-2.5 flex items-center gap-3">
            <span className="text-lg">🚇</span>
            <div className="text-xs">
              <span className="font-medium text-blue-900">
                {data.commuter.nearestMetro.stationName}
              </span>
              <span className="text-blue-700 ml-1">
                {formatDist(data.commuter.nearestMetro.distanceM)} (~{data.commuter.nearestMetro.walkMinutes} min pe jos)
              </span>
            </div>
            {data.commuter.provider === "fallback" && (
              <span className="text-[9px] text-blue-500 ml-auto">(estimat)</span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="px-4 pt-3 pb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-0.5 gap-0.5 bg-muted/50">
              <TabsTrigger value="intel" className="text-xs px-2.5 py-1.5 data-[state=active]:shadow-sm">
                Scoruri
              </TabsTrigger>
              <TabsTrigger value="zone" className="text-xs px-2.5 py-1.5 data-[state=active]:shadow-sm">
                Tip zona
              </TabsTrigger>
              <TabsTrigger value="signals" className="text-xs px-2.5 py-1.5 data-[state=active]:shadow-sm">
                Semnale
              </TabsTrigger>
              {POI_CATEGORY_KEYS.map((key) => {
                const cat = POI_CATEGORIES[key];
                const count = data?.poisByCategory?.[key]?.length ?? 0;
                return (
                  <TabsTrigger key={key} value={key} className="text-xs px-2.5 py-1.5 data-[state=active]:shadow-sm">
                    {getCategoryIcon(key)} {cat.labelRo}
                    {count > 0 && <span className="ml-1 text-[10px] text-muted-foreground">{count}</span>}
                  </TabsTrigger>
                );
              })}
              <TabsTrigger value="compare" className="text-xs px-2.5 py-1.5 data-[state=active]:shadow-sm">
                Compara
              </TabsTrigger>
            </TabsList>

            <TabsContent value="intel" className="mt-3">
              <IntelScoreCards
                intel={data ? { scores: data.scores, evidence: data.evidence, redFlags: data.redFlags } : null}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="zone" className="mt-3">
              {data?.zoneType ? (
                <ZoneTypeBadge zone={data.zoneType} />
              ) : loading ? (
                <div className="h-24 bg-gray-100 rounded animate-pulse" />
              ) : null}
            </TabsContent>

            <TabsContent value="signals" className="mt-3">
              {data?.signals ? (
                <SignalsPanel signals={data.signals} />
              ) : loading ? (
                <div className="h-32 bg-gray-100 rounded animate-pulse" />
              ) : null}
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

            <TabsContent value="compare" className="mt-3 space-y-4">
              <CompareInput onCompare={handleCompare} loading={compareLoading} />
              {compareVerdict && (
                <CompareResult
                  verdict={compareVerdict}
                  labelA="Locatia A"
                  labelB="Locatia B"
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="px-4 pb-3 space-y-1">
          <p className="text-[10px] text-muted-foreground">
            Date OpenStreetMap via Overpass API. Distantele sunt in linie dreapta. Scorurile si clasificarea zonei sunt calculate automat pe baza densitatii si proximitatii punctelor de interes.
          </p>
          <p className="text-[10px] text-muted-foreground">
            Semnalele de piata sunt bazate pe date interne (anunturi analizate, estimari, cautari) si pot fi imprecise in zone cu volum redus de date.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- POI List ----

function PoiList({
  pois, categoryKey, highlightedPoi, onPoiClick, loading,
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
        {[0, 1, 2].map((i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
      </div>
    );
  }

  if (pois.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Niciun punct de interes ({cat.labelRo}) in raza selectata.
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[280px] overflow-y-auto">
      {pois.map((poi) => (
        <button
          key={poi.id}
          onClick={() => onPoiClick(highlightedPoi === poi.id ? null : poi.id)}
          className={`w-full text-left flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
            highlightedPoi === poi.id
              ? "bg-blue-50 border border-blue-200"
              : "hover:bg-gray-50 border border-transparent"
          }`}
        >
          <span className="shrink-0 h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
          <span className="flex-1 truncate">{poi.name ?? poi.subType ?? "Fara nume"}</span>
          <span className="shrink-0 text-xs font-medium text-muted-foreground">{formatDist(poi.distanceM)}</span>
        </button>
      ))}
    </div>
  );
}
