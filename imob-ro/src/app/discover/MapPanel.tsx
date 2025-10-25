"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * MapPanel - SVG-based map with markers
 *
 * Features:
 * - Heat tile visualization (SVG grid)
 * - Property markers with clustering
 * - Highlight sync from list hover
 * - Keyboard accessible markers
 */

export interface MapPanelProps {
  /** Property items with coordinates */
  items: MapItem[];

  /** Highlighted property ID */
  highlightId?: string;
}

export interface MapItem {
  id: string;
  lat: number;
  lng: number;
  priceEur?: number;
  avmBadge?: "under" | "fair" | "over";
  title?: string;
}

export default function MapPanel({ items, highlightId }: MapPanelProps) {
  const [hoveredId, setHoveredId] = React.useState<string | undefined>();
  const svgRef = React.useRef<SVGSVGElement>(null);

  // Bucharest bounds (approximate)
  const bounds = {
    minLat: 44.3,
    maxLat: 44.55,
    minLng: 25.95,
    maxLng: 26.25,
  };

  // Convert lat/lng to SVG coordinates
  const latLngToSvg = React.useCallback(
    (lat: number, lng: number) => {
      const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 800;
      const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 600;
      return { x, y };
    },
    [bounds],
  );

  // Generate heat tiles (placeholder grid)
  const tiles = React.useMemo(() => {
    const tileSize = 40;
    const cols = Math.ceil(800 / tileSize);
    const rows = Math.ceil(600 / tileSize);

    return Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => ({
        x: col * tileSize,
        y: row * tileSize,
        size: tileSize,
        opacity: Math.random() * 0.3 + 0.05, // Placeholder density
      })),
    ).flat();
  }, []);

  return (
    <div className="relative w-full h-full bg-muted rounded-lg overflow-hidden">
      <svg
        ref={svgRef}
        viewBox="0 0 800 600"
        className="w-full h-full"
        role="img"
        aria-label="Hartă proprietăți București"
      >
        {/* Heat Tiles */}
        <g className="heat-tiles">
          {tiles.map((tile, i) => (
            <rect
              key={i}
              x={tile.x}
              y={tile.y}
              width={tile.size}
              height={tile.size}
              fill="hsl(var(--brand-h), var(--brand-s), var(--brand-l))"
              opacity={tile.opacity}
            />
          ))}
        </g>

        {/* Property Markers */}
        <g className="markers">
          {items.map((item) => {
            const { x, y } = latLngToSvg(item.lat, item.lng);
            const isHighlighted = item.id === highlightId || item.id === hoveredId;

            const markerColor =
              item.avmBadge === "under"
                ? "var(--color-success)"
                : item.avmBadge === "over"
                  ? "var(--color-danger)"
                  : "var(--color-primary)";

            return (
              <g
                key={item.id}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(undefined)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`Proprietate ${item.title || item.id}, ${item.priceEur ? `${item.priceEur}€` : ""}`}
              >
                {/* Highlight Ring */}
                {isHighlighted && (
                  <circle
                    cx={x}
                    cy={y}
                    r={10}
                    fill="none"
                    stroke={markerColor}
                    strokeWidth={2}
                    opacity={0.8}
                    className="animate-pulse"
                  />
                )}

                {/* Marker Dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHighlighted ? 6 : 4}
                  fill={markerColor}
                  opacity={isHighlighted ? 1 : 0.8}
                  className="transition-all duration-fast"
                />

                {/* Tooltip (on hover) */}
                {isHighlighted && (
                  <g>
                    <rect
                      x={x + 12}
                      y={y - 20}
                      width={120}
                      height={40}
                      fill="var(--color-surface)"
                      stroke="var(--color-border)"
                      strokeWidth={1}
                      rx={4}
                      filter="url(#shadow)"
                    />
                    <text
                      x={x + 18}
                      y={y - 8}
                      fontSize="12"
                      fill="var(--color-text)"
                      fontWeight="600"
                    >
                      {item.priceEur ? `${item.priceEur.toLocaleString("ro-RO")} €` : "N/A"}
                    </text>
                    <text x={x + 18} y={y + 6} fontSize="10" fill="var(--color-muted)">
                      {item.title?.substring(0, 15) || item.id}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* Shadow Filter Definition */}
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.2" />
          </filter>
        </defs>
      </svg>

      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          type="button"
          className={cn(
            "w-10 h-10 rounded-lg bg-surface border border-border",
            "flex items-center justify-center",
            "hover:bg-muted transition-colors focus-ring",
          )}
          aria-label="Zoom in"
        >
          <span className="text-lg font-bold">+</span>
        </button>
        <button
          type="button"
          className={cn(
            "w-10 h-10 rounded-lg bg-surface border border-border",
            "flex items-center justify-center",
            "hover:bg-muted transition-colors focus-ring",
          )}
          aria-label="Zoom out"
        >
          <span className="text-lg font-bold">−</span>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-surface/95 backdrop-blur-sm rounded-lg p-3 border border-border text-xs">
        <div className="font-semibold mb-2">Legendă</div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span>Underpriced</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>Fair</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danger" />
            <span>Overpriced</span>
          </div>
        </div>
      </div>
    </div>
  );
}
