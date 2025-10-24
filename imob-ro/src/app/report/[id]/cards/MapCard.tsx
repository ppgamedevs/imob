import * as React from "react";
import { MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MapCard - Location map with metro station
 * 
 * Shows:
 * - Small SVG map similar to MapPanel but compact
 * - Property marker
 * - Nearest metro station highlighted
 * - Distance line between them
 */

export interface MapCardProps {
  propertyLat: number;
  propertyLng: number;
  metroStation?: {
    name: string;
    lat: number;
    lng: number;
    line: string; // e.g., "M1", "M2", "M3"
  };
  areaName: string;
}

export default function MapCard({
  propertyLat,
  propertyLng,
  metroStation,
  areaName,
}: MapCardProps) {
  // Bucharest bounds (same as MapPanel)
  const bounds = {
    minLat: 44.3,
    maxLat: 44.55,
    minLng: 25.95,
    maxLng: 26.25,
  };

  const width = 400;
  const height = 300;

  // Convert lat/lng to SVG coordinates
  const latToY = (lat: number) =>
    ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * height;
  const lngToX = (lng: number) =>
    ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width;

  const propertyX = lngToX(propertyLng);
  const propertyY = latToY(propertyLat);

  const metroX = metroStation ? lngToX(metroStation.lng) : 0;
  const metroY = metroStation ? latToY(metroStation.lat) : 0;

  const distanceM = metroStation
    ? calculateDistance(propertyLat, propertyLng, metroStation.lat, metroStation.lng)
    : 0;

  const metroLineColors: Record<string, string> = {
    M1: "#FFD100", // Yellow
    M2: "#003399", // Blue
    M3: "#EE1C23", // Red
    M4: "#00A651", // Green
    M5: "#FFA500", // Orange
  };

  const metroColor = metroStation
    ? metroLineColors[metroStation.line] || "#888"
    : "#888";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Locație & Acces Metrou</h2>
        <p className="text-sm text-muted">
          {areaName}, București
        </p>
      </div>

      {/* Map SVG */}
      <div className="relative w-full aspect-[4/3] bg-muted/20 rounded-lg overflow-hidden border border-border">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full"
          role="img"
          aria-label="Hartă locație proprietate"
        >
          {/* Background grid (light) */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.05"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid)" />

          {/* Distance line (if metro exists) */}
          {metroStation && (
            <line
              x1={propertyX}
              y1={propertyY}
              x2={metroX}
              y2={metroY}
              stroke="currentColor"
              strokeOpacity="0.3"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          )}

          {/* Metro Station */}
          {metroStation && (
            <g>
              {/* Outer ring */}
              <circle
                cx={metroX}
                cy={metroY}
                r={12}
                fill={metroColor}
                fillOpacity={0.2}
              />
              {/* Inner circle */}
              <circle cx={metroX} cy={metroY} r={6} fill={metroColor} />
              {/* Label */}
              <text
                x={metroX}
                y={metroY - 18}
                textAnchor="middle"
                className="text-xs font-medium fill-current"
              >
                {metroStation.name}
              </text>
            </g>
          )}

          {/* Property Marker (on top) */}
          <g>
            {/* Pulse ring */}
            <circle
              cx={propertyX}
              cy={propertyY}
              r={16}
              className="fill-primary"
              fillOpacity={0.2}
            >
              <animate
                attributeName="r"
                from="12"
                to="20"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                from="0.6"
                to="0"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
            {/* Main marker */}
            <circle cx={propertyX} cy={propertyY} r={8} className="fill-primary" />
            <circle
              cx={propertyX}
              cy={propertyY}
              r={8}
              className="fill-none stroke-bg"
              strokeWidth="2"
            />
          </g>
        </svg>
      </div>

      {/* Distance Info */}
      {metroStation && (
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: metroColor }}
            />
            <span className="text-sm font-medium">
              {metroStation.line} - {metroStation.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Navigation className="h-4 w-4 text-muted" />
            <span className="font-medium">{Math.round(distanceM)} m</span>
          </div>
        </div>
      )}

      {/* Walking Time Estimate */}
      {metroStation && (
        <div className="text-sm text-muted text-center">
          <MapPin className="h-4 w-4 inline mr-1" />
          ~{Math.ceil(distanceM / 80)} minute mers pe jos
          <span className="text-xs ml-1">(80m/min)</span>
        </div>
      )}

      {/* Info */}
      <div className="p-3 bg-muted/30 rounded-lg text-sm">
        <p className="text-muted">
          {metroStation ? (
            <>
              Proprietatea este la <strong>{Math.round(distanceM)}m</strong> de
              metroul <strong>{metroStation.name}</strong>.{" "}
              {distanceM <= 500
                ? "Acces excelent la transport în comun."
                : distanceM <= 1000
                ? "Acces bun la transport în comun."
                : "Distanță mai mare, consideră și alte mijloace de transport."}
            </>
          ) : (
            <>
              Nu există stații de metrou în proximitate imediată. Verifică
              alte opțiuni de transport public (autobuz, tramvai).
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/** Calculate distance between two lat/lng points in meters (Haversine) */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
