"use client";
import { useCallback, useEffect, useState } from "react";

import type { CompItem } from "./CompsCarousel";
import { CompsCarousel } from "./CompsCarousel";
import { CompsMap } from "./CompsMap";
import type { SeismicPoint, POIPoint, TransportPoint } from "./CompsMap";

// ---- POI layer config ----

const POI_LAYERS = [
  { key: "nightlife", label: "Baruri / Restaurante", icon: "🍷", activeColor: "border-purple-200 bg-purple-50 text-purple-700", dotColor: "#9333ea" },
  { key: "parks", label: "Parcuri", icon: "🌳", activeColor: "border-green-200 bg-green-50 text-green-700", dotColor: "#16a34a" },
  { key: "family", label: "Scoli / Gradinite", icon: "🎓", activeColor: "border-blue-200 bg-blue-50 text-blue-700", dotColor: "#2563eb" },
] as const;

type POILayerKey = (typeof POI_LAYERS)[number]["key"];

// ---- Component ----

export default function CompsClientBlock({
  comps,
  center,
  listMode = "full",
}: {
  comps: CompItem[];
  center?: { lat?: number | null; lng?: number | null };
  /** `full` = carousel + map; `map` = map and layers only (when list is a table above). */
  listMode?: "full" | "map";
}) {
  const showCarousel = listMode === "full";
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Seismic state
  const [showSeismic, setShowSeismic] = useState(false);
  const [seismicData, setSeismicData] = useState<SeismicPoint[] | null>(null);
  const [seismicLoading, setSeismicLoading] = useState(false);

  // POI state
  const [activePoiLayers, setActivePoiLayers] = useState<Set<POILayerKey>>(new Set());
  const [poiCache, setPoiCache] = useState<Record<string, POIPoint[]>>({});
  const [poiLoading, setPoiLoading] = useState<Set<string>>(new Set());

  // Transport state
  const [showTransport, setShowTransport] = useState(false);
  const [transportData, setTransportData] = useState<TransportPoint[] | null>(null);
  const [transportLoading, setTransportLoading] = useState(false);

  const hasCoords = !!(center?.lat && center?.lng);

  // ---- Seismic loading ----
  const loadSeismic = useCallback(async () => {
    if (!hasCoords || seismicData) return;
    setSeismicLoading(true);
    try {
      const res = await fetch(
        `/api/seismic/nearby?lat=${center!.lat}&lng=${center!.lng}&radius=1000`,
      );
      if (!res.ok) throw new Error("fetch failed");
      const json = (await res.json()) as {
        buildings: SeismicPoint[];
      };
      setSeismicData(json.buildings);
    } catch {
      setSeismicData([]);
    } finally {
      setSeismicLoading(false);
    }
  }, [hasCoords, center, seismicData]);

  useEffect(() => {
    if (showSeismic && !seismicData && !seismicLoading) {
      loadSeismic();
    }
  }, [showSeismic, seismicData, seismicLoading, loadSeismic]);

  // ---- POI loading ----
  const loadPoiLayer = useCallback(
    async (layer: POILayerKey) => {
      if (!hasCoords || poiCache[layer] || poiLoading.has(layer)) return;
      setPoiLoading((prev) => new Set(prev).add(layer));
      try {
        const res = await fetch(
          `/api/poi/nearby?lat=${center!.lat}&lng=${center!.lng}&layer=${layer}&radius=1000`,
        );
        if (!res.ok) throw new Error("fetch failed");
        const json = (await res.json()) as { pois: POIPoint[] };
        setPoiCache((prev) => ({ ...prev, [layer]: json.pois }));
      } catch {
        setPoiCache((prev) => ({ ...prev, [layer]: [] }));
      } finally {
        setPoiLoading((prev) => {
          const next = new Set(prev);
          next.delete(layer);
          return next;
        });
      }
    },
    [hasCoords, center, poiCache, poiLoading],
  );

  const togglePoiLayer = useCallback(
    (layer: POILayerKey) => {
      setActivePoiLayers((prev) => {
        const next = new Set(prev);
        if (next.has(layer)) {
          next.delete(layer);
        } else {
          next.add(layer);
          if (!poiCache[layer]) loadPoiLayer(layer);
        }
        return next;
      });
    },
    [poiCache, loadPoiLayer],
  );

  // ---- Transport loading ----
  const loadTransport = useCallback(async () => {
    if (!hasCoords || transportData) return;
    setTransportLoading(true);
    try {
      const res = await fetch(
        `/api/transport/nearby?lat=${center!.lat}&lng=${center!.lng}&radius=1000`,
      );
      if (!res.ok) throw new Error("fetch failed");
      const json = (await res.json()) as { stops: TransportPoint[] };
      setTransportData(json.stops);
    } catch {
      setTransportData([]);
    } finally {
      setTransportLoading(false);
    }
  }, [hasCoords, center, transportData]);

  useEffect(() => {
    if (showTransport && !transportData && !transportLoading) {
      loadTransport();
    }
  }, [showTransport, transportData, transportLoading, loadTransport]);

  // Merge all active POI data
  const mergedPois: POIPoint[] = [];
  for (const layer of activePoiLayers) {
    const items = poiCache[layer];
    if (items) mergedPois.push(...items);
  }

  return (
    <div>
      {showCarousel ? <CompsCarousel items={comps} onHover={setHoverId} /> : null}
      <div className={showCarousel ? "mt-3" : ""}>
        <CompsMap
          items={comps.map((c) => ({ id: c.id, lat: c.lat, lng: c.lng }))}
          center={center}
          hoverId={hoverId}
          seismicBuildings={seismicData ?? undefined}
          showSeismic={showSeismic}
          poiPoints={mergedPois.length > 0 ? mergedPois : undefined}
          activePoiLayers={[...activePoiLayers]}
          transportPoints={transportData ?? undefined}
          showTransport={showTransport}
        />
      </div>
      {hasCoords && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {/* Seismic toggle */}
          <button
            type="button"
            onClick={() => setShowSeismic((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              showSeismic
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M5,0 L10,5 L5,10 L0,5 Z" fill={showSeismic ? "#dc2626" : "#9ca3af"} />
            </svg>
            Risc seismic
            {seismicLoading && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {seismicData && showSeismic && (
              <span className="text-[10px] opacity-70">({seismicData.length})</span>
            )}
          </button>

          {/* POI layer toggles */}
          {POI_LAYERS.map((layer) => {
            const isActive = activePoiLayers.has(layer.key);
            const isLoading = poiLoading.has(layer.key);
            const count = poiCache[layer.key]?.length;
            return (
              <button
                key={layer.key}
                type="button"
                onClick={() => togglePoiLayer(layer.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? layer.activeColor
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                  <circle cx="4" cy="4" r="3.5" fill={isActive ? layer.dotColor : "#9ca3af"} />
                </svg>
                {layer.label}
                {isLoading && (
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {count != null && isActive && (
                  <span className="text-[10px] opacity-70">({count})</span>
                )}
              </button>
            );
          })}

          {/* Transport toggle */}
          <button
            type="button"
            onClick={() => setShowTransport((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              showTransport
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
              <rect x="1" y="1" width="6" height="6" rx="1" fill={showTransport ? "#d97706" : "#9ca3af"} />
            </svg>
            Transport
            {transportLoading && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {transportData && showTransport && (
              <span className="text-[10px] opacity-70">({transportData.length})</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
