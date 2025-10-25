"use client";

/**
 * AreaCompareCharts - Visual comparison for areas
 *
 * Features:
 * - Grouped bars for €/m², Rent €/m², Yield %
 * - Line chart for 12-month change
 * - Deferred hydration
 */

import * as React from "react";

import type { AreaCompare } from "@/lib/compare/load-areas";
import { cn } from "@/lib/utils";

export interface AreaCompareChartsProps {
  items: AreaCompare[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
];

export function AreaCompareCharts({ items }: AreaCompareChartsProps) {
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

  const metrics = [
    {
      label: "Preț median €/m²",
      values: items.map((i) => i.medianEurM2),
      format: (v: number) => `${v.toLocaleString("ro-RO")} €`,
    },
    {
      label: "Chirie estimată €/m²",
      values: items.map((i) => i.rentEurM2 || 0),
      format: (v: number) => `${v.toLocaleString("ro-RO")} €`,
    },
    {
      label: "Randament net %",
      values: items.map((i) => i.yieldNet || 0),
      format: (v: number) => `${v.toFixed(1)}%`,
    },
    {
      label: "Schimbare 12 luni %",
      values: items.map((i) => i.change12m || 0),
      format: (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`,
    },
  ];

  return (
    <div ref={containerRef} className="mt-8 space-y-8">
      <h3 className="text-lg font-semibold">Comparație zone</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {metrics.map((metric) => (
          <MetricChart
            key={metric.label}
            label={metric.label}
            values={metric.values}
            names={items.map((i) => i.name)}
            colors={COLORS}
            format={metric.format}
          />
        ))}
      </div>
    </div>
  );
}

interface MetricChartProps {
  label: string;
  values: number[];
  names: string[];
  colors: string[];
  format: (v: number) => string;
}

function MetricChart({ label, values, names, colors, format }: MetricChartProps) {
  const maxValue = Math.max(...values.map(Math.abs).filter((v) => v > 0));
  const hasNegative = values.some((v) => v < 0);

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <h4 className="text-sm font-medium mb-4">{label}</h4>
      <div className="space-y-3">
        {values.map((value, idx) => {
          const percent = maxValue > 0 ? (Math.abs(value) / maxValue) * 100 : 0;
          const isNegative = value < 0;

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate flex-1 pr-2" title={names[idx]}>
                  {names[idx]}
                </span>
                <span
                  className={cn(
                    "font-medium",
                    isNegative && "text-danger",
                    value > 0 && "text-success",
                  )}
                >
                  {value !== 0 ? format(value) : "—"}
                </span>
              </div>
              {value !== 0 && (
                <div
                  className={cn(
                    "h-2 rounded-full overflow-hidden",
                    hasNegative ? "bg-transparent" : "bg-muted/30",
                  )}
                >
                  <div
                    className="h-full rounded-full transition-all duration-slow"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: isNegative
                        ? "hsl(var(--danger))"
                        : colors[idx % colors.length],
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
