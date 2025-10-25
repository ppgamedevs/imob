"use client";

/**
 * CompareCharts - Visual comparison charts for listings
 *
 * Features:
 * - Bars for €/m², Yield %, TTS days
 * - Color per column
 * - Tooltips with exact values
 * - Deferred hydration until visible
 */

import * as React from "react";

import type { CompareListing } from "@/lib/compare/load";
import { cn } from "@/lib/utils";

export interface CompareChartsProps {
  items: CompareListing[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
];

export function CompareCharts({ items }: CompareChartsProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  if (!isVisible) {
    return (
      <div
        ref={containerRef}
        className="mt-8 h-96 bg-surface border border-border rounded-lg flex items-center justify-center"
      >
        <div className="text-sm text-muted">Se încarcă grafice...</div>
      </div>
    );
  }

  const charts = [
    {
      label: "Preț €/m²",
      values: items.map((i) => i.eurM2 || 0),
      format: (v: number) => `${v.toLocaleString("ro-RO")} €/m²`,
      lower: true,
    },
    {
      label: "Randament net %",
      values: items.map((i) => i.yield?.net || 0),
      format: (v: number) => `${v.toFixed(1)}%`,
      lower: false,
    },
    {
      label: "Timp vânzare (zile)",
      values: items.map((i) => i.tts?.days || 0),
      format: (v: number) => `~${v} zile`,
      lower: true,
    },
  ];

  return (
    <div ref={containerRef} className="mt-8 space-y-8">
      <h3 className="text-lg font-semibold">Comparație vizuală</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {charts.map((chart) => (
          <ChartBar
            key={chart.label}
            label={chart.label}
            values={chart.values}
            labels={items.map((i) => i.title)}
            colors={COLORS}
            format={chart.format}
            lowerIsBetter={chart.lower}
          />
        ))}
      </div>
    </div>
  );
}

interface ChartBarProps {
  label: string;
  values: number[];
  labels: string[];
  colors: string[];
  format: (v: number) => string;
  lowerIsBetter: boolean;
}

function ChartBar({ label, values, labels, colors, format, lowerIsBetter }: ChartBarProps) {
  const maxValue = Math.max(...values.filter((v) => v > 0));
  const bestIdx = lowerIsBetter
    ? values.indexOf(Math.min(...values.filter((v) => v > 0)))
    : values.indexOf(maxValue);

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <h4 className="text-sm font-medium mb-4">{label}</h4>
      <div className="space-y-3">
        {values.map((value, idx) => {
          const percent = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const isBest = idx === bestIdx && value > 0;

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate flex-1 pr-2" title={labels[idx]}>
                  {labels[idx].slice(0, 20)}
                  {labels[idx].length > 20 && "..."}
                </span>
                <span className={cn("font-medium", isBest && "text-success")}>
                  {value > 0 ? format(value) : "—"}
                </span>
              </div>
              {value > 0 && (
                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-slow",
                      isBest && "ring-2 ring-success ring-offset-1",
                    )}
                    style={{
                      width: `${percent}%`,
                      backgroundColor: colors[idx % colors.length],
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-muted">
        <span className="sr-only">
          {lowerIsBetter
            ? `Cel mai mic: ${format(values[bestIdx])}`
            : `Cel mai mare: ${format(values[bestIdx])}`}
        </span>
        {lowerIsBetter ? "↓ Mai mic = mai bun" : "↑ Mai mare = mai bun"}
      </div>
    </div>
  );
}
