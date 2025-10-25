"use client";

/**
 * CompareTable - Side-by-side listing comparison
 *
 * Features:
 * - Sticky column headers
 * - Best-value highlighting per row
 * - Mobile: horizontal scroll with sticky first column
 * - Fixed row heights (no CLS)
 */

import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CompareListing } from "@/lib/compare/load";
import { rankSeismicClass } from "@/lib/compare/load";
import { cn } from "@/lib/utils";

export interface CompareTableProps {
  items: CompareListing[];
  onRemove?: (id: string) => void;
}

type RowDef = {
  key: string;
  label: string;
  better: "lower" | "higher" | "closer" | "custom";
  get: (item: CompareListing) => number | undefined;
  format: (value: number | undefined, item: CompareListing) => React.ReactNode;
};

const formatNumber = (n?: number) => (n !== undefined ? n.toLocaleString("ro-RO") : "—");
const formatPercent = (n?: number) => (n !== undefined ? `${n.toFixed(1)}%` : "—");
const formatDays = (n?: number) => (n !== undefined ? `~${n} zile` : "—");

export function CompareTable({ items, onRemove }: CompareTableProps) {
  const rows: RowDef[] = [
    {
      key: "price",
      label: "Preț (EUR)",
      better: "lower",
      get: (x) => x.priceEur,
      format: (v) => <span className="text-lg font-semibold">{formatNumber(v)}</span>,
    },
    {
      key: "eurm2",
      label: "€/m²",
      better: "lower",
      get: (x) => x.eurM2,
      format: (v) => formatNumber(v),
    },
    {
      key: "avm",
      label: "AVM estimat",
      better: "closer",
      get: (x) => x.avm.mid,
      format: (v, item) => (
        <div className="space-y-1">
          <div>{formatNumber(v)}</div>
          {item.avm.badge && (
            <Badge
              variant={
                item.avm.badge === "under"
                  ? "default"
                  : item.avm.badge === "over"
                    ? "destructive"
                    : "secondary"
              }
              className="text-xs"
            >
              {item.avm.badge === "under"
                ? "Subapreciat"
                : item.avm.badge === "over"
                  ? "Supraapreciat"
                  : "Corect"}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "area",
      label: "Suprafață (m²)",
      better: "higher",
      get: (x) => x.areaM2,
      format: (v) => formatNumber(v),
    },
    {
      key: "rooms",
      label: "Camere",
      better: "custom",
      get: (x) => x.rooms,
      format: (v) => v || "—",
    },
    {
      key: "floor",
      label: "Etaj",
      better: "custom",
      get: () => undefined,
      format: (_, item) => item.floor || "—",
    },
    {
      key: "year",
      label: "An construcție",
      better: "higher",
      get: (x) => x.yearBuilt,
      format: (v) => v || "—",
    },
    {
      key: "metro",
      label: "Distanță metrou (m)",
      better: "lower",
      get: (x) => x.distMetroM,
      format: (v) => formatNumber(v),
    },
    {
      key: "tts",
      label: "Timp vânzare",
      better: "lower",
      get: (x) => x.tts?.days,
      format: (v, item) => (
        <div className="space-y-1">
          <div>{formatDays(v)}</div>
          {item.tts?.bucket && (
            <Badge variant="outline" className="text-xs capitalize">
              {item.tts.bucket}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "yield",
      label: "Randament net",
      better: "higher",
      get: (x) => x.yield?.net,
      format: (v, item) => (
        <div className="space-y-1">
          <div className="font-medium">{formatPercent(v)}</div>
          {item.yield?.rentEur && (
            <div className="text-xs text-muted">
              Chirie: {formatNumber(item.yield.rentEur)}€/lună
            </div>
          )}
        </div>
      ),
    },
    {
      key: "seismic",
      label: "Risc seismic",
      better: "custom",
      get: (x) => rankSeismicClass(x.seismic?.class),
      format: (_, item) => (
        <div className="space-y-1">
          <div className="font-medium">Clasa {item.seismic?.class || "C"}</div>
          {item.seismic?.conf && (
            <div className="text-xs text-muted">Conf: {(item.seismic.conf * 100).toFixed(0)}%</div>
          )}
        </div>
      ),
    },
    {
      key: "quality",
      label: "Calitate date",
      better: "higher",
      get: (x) => x.quality?.score,
      format: (_, item) => (
        <div className="space-y-1">
          <div className="font-medium">{item.quality?.label || "—"}</div>
          {item.quality?.score !== undefined && (
            <div className="text-xs text-muted">{item.quality.score.toFixed(0)}%</div>
          )}
        </div>
      ),
    },
  ];

  const getBestIndex = (row: RowDef): number | null => {
    const values = items.map((item) => row.get(item));
    const validIndices = values.map((v, i) => ({ v, i })).filter((x) => x.v !== undefined);

    if (validIndices.length === 0) return null;

    if (row.better === "lower") {
      return validIndices.reduce((best, curr) => (curr.v! < best.v! ? curr : best)).i;
    } else if (row.better === "higher") {
      return validIndices.reduce((best, curr) => (curr.v! > best.v! ? curr : best)).i;
    } else if (row.better === "custom") {
      // For seismic: lower rank is better
      if (row.key === "seismic") {
        return validIndices.reduce((best, curr) => (curr.v! < best.v! ? curr : best)).i;
      }
    }

    return null;
  };

  return (
    <div className="mt-6 overflow-x-auto -mx-4 px-4">
      <table className="min-w-full border-separate" style={{ borderSpacing: "0 12px" }}>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-bg w-44 text-left text-sm font-semibold px-3 py-2">
              Indicator
            </th>
            {items.map((item, idx) => (
              <th key={item.id} className="min-w-[220px] text-left align-top px-3 py-2">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold leading-tight line-clamp-2">
                        {item.title}
                      </div>
                      <div className="text-xs text-muted mt-1">{item.areaName}</div>
                    </div>
                    {onRemove && items.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(item.id)}
                        className="h-6 w-6 p-0 shrink-0"
                        aria-label="Elimină din comparație"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                  <Link href={item.href} className="text-xs text-primary hover:underline">
                    Deschide raport →
                  </Link>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const bestIdx = getBestIndex(row);
            return (
              <tr key={row.key}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-bg align-top text-sm font-medium px-3 py-4"
                >
                  {row.label}
                </th>
                {items.map((item, idx) => {
                  const value = row.get(item);
                  const isBest = idx === bestIdx && value !== undefined;
                  return (
                    <td
                      key={idx}
                      className={cn(
                        "align-top rounded-lg border border-border bg-surface p-4",
                        "transition-colors duration-fast",
                        isBest && "bg-success/10 border-success/30",
                      )}
                    >
                      {row.format(value, item)}
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {/* Source row */}
          <tr>
            <th
              scope="row"
              className="sticky left-0 z-10 bg-bg align-top text-sm font-medium px-3 py-4"
            >
              Sursă
            </th>
            {items.map((item) => (
              <td
                key={item.id}
                className="align-top rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex items-center gap-2">
                  {item.faviconUrl && (
                    <Image
                      src={item.faviconUrl}
                      alt=""
                      width={16}
                      height={16}
                      className="shrink-0"
                    />
                  )}
                  <span className="text-sm text-muted truncate">
                    {item.sourceHost || "Necunoscut"}
                  </span>
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
