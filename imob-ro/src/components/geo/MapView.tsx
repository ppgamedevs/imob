"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { POI_CATEGORIES, type PoiCategoryKey } from "@/lib/geo/poiCategories";
import type { OverpassPoi } from "@/lib/geo/overpass";

// Fix Leaflet default icon path detection (breaks in bundled environments)
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Props {
  lat: number;
  lng: number;
  radius: number;
  pois: OverpassPoi[];
  highlightedPoi: string | null;
  onPoiClick: (id: string | null) => void;
  loading: boolean;
}

const SUBJECT_ICON = L.divIcon({
  html: `<div style="
    background: #1e40af;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
  "></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function createPoiIcon(color: string, highlighted: boolean): L.DivIcon {
  const size = highlighted ? 14 : 10;
  const borderW = highlighted ? 3 : 2;
  return L.divIcon({
    html: `<div style="
      background: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: ${borderW}px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      ${highlighted ? "transform: scale(1.3);" : ""}
    "></div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function formatDist(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function MapUpdater({ lat, lng, radius }: { lat: number; lng: number; radius: number }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLng(lat, lng).toBounds(radius * 2);
    map.fitBounds(bounds, { padding: [20, 20], maxZoom: 17 });
  }, [map, lat, lng, radius]);
  return null;
}

function HighlightFocus({
  pois,
  highlightedPoi,
}: {
  pois: OverpassPoi[];
  highlightedPoi: string | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!highlightedPoi) return;
    const poi = pois.find((p) => p.id === highlightedPoi);
    if (poi) {
      map.panTo([poi.lat, poi.lng], { animate: true });
    }
  }, [map, pois, highlightedPoi]);
  return null;
}

export default function MapView({
  lat,
  lng,
  radius,
  pois,
  highlightedPoi,
  onPoiClick,
  loading,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);

  const poiIcons = useMemo(() => {
    const cache = new Map<string, L.DivIcon>();
    for (const poi of pois) {
      const cat = POI_CATEGORIES[poi.category];
      const color = cat?.color ?? "#6b7280";
      const isHighlighted = poi.id === highlightedPoi;
      const key = `${color}-${isHighlighted}`;
      if (!cache.has(key)) {
        cache.set(key, createPoiIcon(color, isHighlighted));
      }
    }
    return cache;
  }, [pois, highlightedPoi]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        className="h-full w-full z-0"
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          crossOrigin="anonymous"
        />

        <MapUpdater lat={lat} lng={lng} radius={radius} />
        <HighlightFocus pois={pois} highlightedPoi={highlightedPoi} />

        {/* Radius circle */}
        <Circle
          center={[lat, lng]}
          radius={radius}
          pathOptions={{
            color: "#3b82f6",
            fillColor: "#3b82f6",
            fillOpacity: 0.06,
            weight: 1.5,
            dashArray: "6 4",
          }}
        />

        {/* Subject marker */}
        <Marker position={[lat, lng]} icon={SUBJECT_ICON}>
          <Popup>
            <span className="text-xs font-medium">Proprietatea analizata</span>
          </Popup>
        </Marker>

        {/* POI markers */}
        {pois.map((poi) => {
          const cat = POI_CATEGORIES[poi.category];
          const color = cat?.color ?? "#6b7280";
          const isHighlighted = poi.id === highlightedPoi;
          const iconKey = `${color}-${isHighlighted}`;
          const icon = poiIcons.get(iconKey) ?? createPoiIcon(color, false);

          return (
            <Marker
              key={poi.id}
              position={[poi.lat, poi.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onPoiClick(isHighlighted ? null : poi.id),
              }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-medium">
                    {poi.name ?? poi.subType ?? "POI"}
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    {cat?.labelRo} &middot; {formatDist(poi.distanceM)}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
            Se incarca harta...
          </div>
        </div>
      )}
    </div>
  );
}
