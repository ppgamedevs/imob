import * as React from 'react';
import Link from 'next/link';
import { Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AreaTilesSummary } from '@/lib/areas/dto';
import { formatNumber } from '@/lib/areas/series';

export interface TilesMiniProps {
  tiles: AreaTilesSummary;
  areaName: string;
  slug: string;
}

export default function TilesMini({ tiles, areaName, slug }: TilesMiniProps) {
  const { bounds, cells, metro, gridSize } = tiles;

  if (cells.length === 0) {
    return (
      <div className="container py-8">
        <div className="rounded-lg border border-border bg-surface p-8">
          <div className="text-center text-muted">
            Date insuficiente pentru harta termică
          </div>
        </div>
      </div>
    );
  }

  // Calculate color scale (min/max eurM2)
  const validCells = cells.filter((c) => c.eurM2 !== undefined && c.eurM2 !== null);
  const minPrice = Math.min(...validCells.map((c) => c.eurM2!));
  const maxPrice = Math.max(...validCells.map((c) => c.eurM2!));
  const priceRange = maxPrice - minPrice || 1;

  // Color interpolation (green → yellow → red)
  const getColor = (eurM2: number | undefined | null): string => {
    if (eurM2 === undefined || eurM2 === null) return '#e5e7eb'; // gray for no data

    const ratio = (eurM2 - minPrice) / priceRange;

    // RGB interpolation: green (34, 197, 94) → yellow (234, 179, 8) → red (239, 68, 68)
    let r: number, g: number, b: number;
    if (ratio < 0.5) {
      // green → yellow
      const t = ratio * 2;
      r = Math.round(34 + (234 - 34) * t);
      g = Math.round(197 + (179 - 197) * t);
      b = Math.round(94 + (8 - 94) * t);
    } else {
      // yellow → red
      const t = (ratio - 0.5) * 2;
      r = Math.round(234 + (239 - 234) * t);
      g = Math.round(179 + (68 - 179) * t);
      b = Math.round(8 + (68 - 8) * t);
    }

    return `rgb(${r}, ${g}, ${b})`;
  };

  // SVG dimensions
  const cellSize = 40;
  const cellGap = 2;
  const svgWidth = gridSize.cols * (cellSize + cellGap);
  const svgHeight = gridSize.rows * (cellSize + cellGap);

  // Metro station positions (relative to grid)
  const [minLng, minLat, maxLng, maxLat] = bounds;
  const lngRange = maxLng - minLng || 0.01;
  const latRange = maxLat - minLat || 0.01;

  const getMetroPosition = (lat: number, lng: number) => {
    const x = ((lng - minLng) / lngRange) * svgWidth;
    const y = svgHeight - ((lat - minLat) / latRange) * svgHeight; // flip Y axis
    return { x, y };
  };

  const discoverUrl = `/discover?areas=${slug}#map`;

  return (
    <div className="container py-8">
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-fg mb-1">Hartă termică {areaName}</h2>
            <p className="text-sm text-muted">Prețuri medii pe zone (€/m²)</p>
          </div>
          <Button asChild>
            <Link href={discoverUrl}>
              <Map className="h-4 w-4 mr-2" />
              Deschide pe hartă
            </Link>
          </Button>
        </div>

        {/* Heatmap Grid */}
        <div className="flex justify-center mb-6">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="max-w-full h-auto"
            role="img"
            aria-label={`Heatmap showing price distribution in ${areaName}`}
          >
            {/* Grid cells */}
            {cells.map((cell, idx) => {
              const x = cell.x * (cellSize + cellGap);
              const y = cell.y * (cellSize + cellGap);
              const color = getColor(cell.eurM2);
              const hasData = cell.eurM2 !== undefined && cell.eurM2 !== null;

              return (
                <g key={idx}>
                  <rect
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    fill={color}
                    stroke="#fff"
                    strokeWidth="1"
                    opacity={hasData ? 0.9 : 0.2}
                  >
                    {hasData && (
                      <title>
                        {formatNumber(cell.eurM2!)} €/m² ({cell.count || 0} anunțuri)
                      </title>
                    )}
                  </rect>
                  {hasData && cell.count && cell.count > 0 && (
                    <text
                      x={x + cellSize / 2}
                      y={y + cellSize / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="10"
                      fill="#fff"
                      fontWeight="600"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {formatNumber(cell.eurM2!)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Metro stations overlay */}
            {metro.map((station, idx) => {
              const { x, y } = getMetroPosition(station.lat, station.lng);
              return (
                <g key={idx}>
                  <circle
                    cx={x}
                    cy={y}
                    r="6"
                    fill="#1e40af"
                    stroke="#fff"
                    strokeWidth="2"
                  >
                    <title>{station.name}</title>
                  </circle>
                  <text
                    x={x}
                    y={y - 12}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#1e40af"
                    fontWeight="600"
                  >
                    {station.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted">Mai ieftin</div>
            <div className="flex h-4 w-32 rounded overflow-hidden">
              <div className="flex-1 bg-green-500" />
              <div className="flex-1 bg-yellow-500" />
              <div className="flex-1 bg-red-500" />
            </div>
            <div className="text-xs text-muted">Mai scump</div>
          </div>
          <div className="text-xs text-muted">
            {formatNumber(minPrice)} – {formatNumber(maxPrice)} €/m²
          </div>
        </div>

        {/* Metro legend (if available) */}
        {metro.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-700 border-2 border-white" />
              <span className="text-xs text-muted">Stație de metrou</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
