"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

// Fix Leaflet default icon path detection (breaks in bundled environments)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const BUCHAREST_CENTER: [number, number] = [44.4268, 26.1025];
const DEFAULT_ZOOM = 12;
const PIN_ZOOM = 16;

const pinIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface ClickHandlerProps {
  onPick: (lat: number, lng: number) => void;
}

function ClickHandler({ onPick }: ClickHandlerProps) {
  useMapEvents({
    click(e) {
      onPick(
        Math.round(e.latlng.lat * 1_000_000) / 1_000_000,
        Math.round(e.latlng.lng * 1_000_000) / 1_000_000,
      );
    },
  });
  return null;
}

function FlyToHandler({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  const prevRef = useRef<string>("");

  useEffect(() => {
    if (lat == null || lng == null) return;
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (key === prevRef.current) return;
    prevRef.current = key;
    map.flyTo([lat, lng], Math.max(map.getZoom(), PIN_ZOOM), { duration: 0.8 });
  }, [lat, lng, map]);

  return null;
}

function DraggableMarker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (!marker) return;
        const pos = marker.getLatLng();
        onChange(
          Math.round(pos.lat * 1_000_000) / 1_000_000,
          Math.round(pos.lng * 1_000_000) / 1_000_000,
        );
      },
    }),
    [onChange],
  );

  return (
    <Marker
      draggable
      position={[lat, lng]}
      icon={pinIcon}
      ref={markerRef}
      eventHandlers={eventHandlers}
    />
  );
}

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  onClear?: () => void;
}

export default function LocationPicker({ lat, lng, onChange, onClear }: LocationPickerProps) {
  const [ready, setReady] = useState(false);

  const handlePick = useCallback(
    (newLat: number, newLng: number) => {
      onChange(newLat, newLng);
    },
    [onChange],
  );

  const center = useMemo<[number, number]>(
    () => (lat != null && lng != null ? [lat, lng] : BUCHAREST_CENTER),
    // Only use initial center, FlyToHandler handles subsequent moves
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="space-y-1.5">
      <div
        className="relative overflow-hidden rounded-xl border border-gray-200"
        style={{ height: 220 }}
      >
        {!ready && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        )}
        <MapContainer
          center={center}
          zoom={lat != null ? PIN_ZOOM : DEFAULT_ZOOM}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
          whenReady={() => setReady(true)}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            crossOrigin="anonymous"
          />
          <ClickHandler onPick={handlePick} />
          <FlyToHandler lat={lat} lng={lng} />
          {lat != null && lng != null && (
            <DraggableMarker lat={lat} lng={lng} onChange={handlePick} />
          )}
        </MapContainer>
      </div>

      {lat != null && lng != null ? (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-emerald-600 font-medium">
            Pin plasat: {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] text-gray-400 hover:text-red-500 underline transition-colors"
            >
              Sterge pin
            </button>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-amber-600">
          Fara pin pe harta, estimarea va fi mai putin precisa.
        </p>
      )}
    </div>
  );
}
