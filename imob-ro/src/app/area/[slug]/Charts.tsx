"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AreaSeries, ChartRange, ChartTab } from "@/lib/areas/dto";
import { filterSeriesByRange, formatNumber } from "@/lib/areas/series";
import { cn } from "@/lib/utils";

export interface ChartsProps {
  series: AreaSeries[];
  areaName: string;
  defaultView?: string;
  defaultRange?: string;
}

type ChartDataPoint = {
  date: string;
  value: number | null;
  label: string;
};

export default function Charts({ series, areaName, defaultView, defaultRange }: ChartsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = React.useState<ChartTab>((defaultView as ChartTab) || "price");
  const [activeRange, setActiveRange] = React.useState<ChartRange>(
    (defaultRange as ChartRange) || "6m",
  );

  const handleTabChange = (value: string) => {
    setActiveTab(value as ChartTab);
    updateUrl(value as ChartTab, activeRange);
  };

  const handleRangeChange = (value: ChartRange) => {
    setActiveRange(value);
    updateUrl(activeTab, value);
  };

  const updateUrl = (tab: ChartTab, range: ChartRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", tab);
    params.set("range", range);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Filter series by range
  const filteredSeries = filterSeriesByRange(series, activeRange);

  // Prepare data for active tab
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    switch (activeTab) {
      case "price":
        return filteredSeries.map((s) => ({
          date: s.date,
          value: s.eurM2 ?? null,
          label: s.eurM2 ? `${formatNumber(s.eurM2)} €/m²` : "—",
        }));
      case "rent":
        return filteredSeries.map((s) => ({
          date: s.date,
          value: s.rentEurM2 ?? null,
          label: s.rentEurM2 ? `${formatNumber(s.rentEurM2)} €/m²` : "—",
        }));
      case "yield":
        return filteredSeries.map((s) => ({
          date: s.date,
          value: s.yieldNet ? s.yieldNet * 100 : null,
          label: s.yieldNet ? `${(s.yieldNet * 100).toFixed(1)}%` : "—",
        }));
      case "tts":
        return filteredSeries.map((s) => ({
          date: s.date,
          value: s.ttsDays ?? null,
          label: s.ttsDays ? `${s.ttsDays} zile` : "—",
        }));
      case "supply":
        return filteredSeries.map((s) => ({
          date: s.date,
          value: s.supply ?? null,
          label: s.supply ? `${s.supply} anunțuri` : "—",
        }));
      default:
        return [];
    }
  }, [activeTab, filteredSeries]);

  // Chart labels
  const chartLabels: Record<ChartTab, string> = {
    price: "Preț median €/m²",
    rent: "Chirie medie €/m²",
    yield: "Randament net %",
    tts: "Timp până la vânzare (zile)",
    supply: "Anunțuri active",
  };

  return (
    <div className="container py-8">
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h2 className="text-xl font-bold text-fg">Evoluție {areaName}</h2>

          {/* Range Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant={activeRange === "3m" ? "default" : "outline"}
              size="sm"
              onClick={() => handleRangeChange("3m")}
            >
              3 luni
            </Button>
            <Button
              variant={activeRange === "6m" ? "default" : "outline"}
              size="sm"
              onClick={() => handleRangeChange("6m")}
            >
              6 luni
            </Button>
            <Button
              variant={activeRange === "12m" ? "default" : "outline"}
              size="sm"
              onClick={() => handleRangeChange("12m")}
            >
              12 luni
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="price">Preț</TabsTrigger>
            <TabsTrigger value="rent">Chirie</TabsTrigger>
            <TabsTrigger value="yield">Randament</TabsTrigger>
            <TabsTrigger value="tts">TTS</TabsTrigger>
            <TabsTrigger value="supply">Stoc</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="text-sm text-muted mb-4">{chartLabels[activeTab]}</div>
            <LineChart data={chartData} areaName={areaName} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Simple SVG Line Chart with interactivity
interface LineChartProps {
  data: ChartDataPoint[];
  areaName: string;
}

function LineChart({ data, areaName }: LineChartProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Filter out null values for min/max calculation
  const validData = data.filter((d) => d.value !== null) as (ChartDataPoint & { value: number })[];

  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted">
        Date insuficiente pentru această perioadă
      </div>
    );
  }

  const minValue = Math.min(...validData.map((d) => d.value));
  const maxValue = Math.max(...validData.map((d) => d.value));
  const valueRange = maxValue - minValue || 1;

  // Scale functions
  const xScale = (index: number) => (index / (data.length - 1)) * chartWidth;
  const yScale = (value: number) => chartHeight - ((value - minValue) / valueRange) * chartHeight;

  // Generate path
  const pathPoints = validData
    .map((d, i) => {
      const originalIndex = data.indexOf(d);
      const x = xScale(originalIndex);
      const y = yScale(d.value);
      return `${i === 0 ? "M" : "L"} ${x},${y}`;
    })
    .join(" ");

  // Handle mouse move for tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - padding.left;
    const relativeX = x / chartWidth;
    const index = Math.round(relativeX * (data.length - 1));
    if (index >= 0 && index < data.length) {
      setHoveredIndex(index);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const hoveredPoint = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        role="img"
        aria-label={`Line chart for ${areaName}`}
      >
        {/* Grid lines */}
        <g stroke="currentColor" strokeWidth="1" className="text-border opacity-30">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + ratio * chartHeight;
            return (
              <line key={ratio} x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} />
            );
          })}
        </g>

        {/* Y-axis labels */}
        <g className="text-muted text-xs">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const value = minValue + (1 - ratio) * valueRange;
            const y = padding.top + ratio * chartHeight;
            return (
              <text
                key={ratio}
                x={padding.left - 10}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fill="currentColor"
              >
                {formatNumber(value)}
              </text>
            );
          })}
        </g>

        {/* Line path */}
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          <path
            d={pathPoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary"
          />

          {/* Hovered point */}
          {hoveredPoint && hoveredPoint.value !== null && (
            <>
              <circle
                cx={xScale(hoveredIndex!)}
                cy={yScale(hoveredPoint.value)}
                r="4"
                fill="currentColor"
                className="text-primary"
              />
              <line
                x1={xScale(hoveredIndex!)}
                y1={0}
                x2={xScale(hoveredIndex!)}
                y2={chartHeight}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 2"
                className="text-muted opacity-50"
              />
            </>
          )}
        </g>

        {/* X-axis labels (dates) */}
        <g className="text-muted text-xs">
          {data
            .filter((_, i) => i % Math.ceil(data.length / 6) === 0)
            .map((d, i) => {
              const originalIndex = data.indexOf(d);
              const x = padding.left + xScale(originalIndex);
              return (
                <text key={i} x={x} y={height - 10} textAnchor="middle" fill="currentColor">
                  {new Date(d.date).toLocaleDateString("ro-RO", { month: "short", day: "numeric" })}
                </text>
              );
            })}
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-3 py-2 shadow-lg pointer-events-none">
          <div className="text-xs text-muted mb-1">
            {new Date(hoveredPoint.date).toLocaleDateString("ro-RO", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="text-sm font-medium text-fg">{hoveredPoint.label}</div>
        </div>
      )}
    </div>
  );
}
