import { AlertTriangle, Clock, DollarSign, Home, TrendingDown, TrendingUp } from "lucide-react";
import * as React from "react";

import { KpiTile } from "@/components/ui/kpi-tile";
import type { AreaKpis } from "@/lib/areas/dto";
import { formatChange, formatNumber } from "@/lib/areas/series";
import { cn } from "@/lib/utils";

export interface KpiGridProps {
  kpis: AreaKpis;
}

export default function KpiGrid({ kpis }: KpiGridProps) {
  // Determine change type for 12-month change
  const priceChangeType =
    kpis.medianEurM2Change12m > 0
      ? "positive"
      : kpis.medianEurM2Change12m < 0
        ? "negative"
        : "neutral";

  // Seismic mix visualization (if available)
  const seismicBar = kpis.seismicMix ? (
    <div className="space-y-2">
      <div className="flex items-center gap-2 h-4">
        {kpis.seismicMix.none > 0 && (
          <div
            className="h-full bg-green-500 rounded-sm"
            style={{ width: `${kpis.seismicMix.none * 100}%` }}
            title={`Fără risc: ${(kpis.seismicMix.none * 100).toFixed(0)}%`}
          />
        )}
        {kpis.seismicMix.RS3 > 0 && (
          <div
            className="h-full bg-yellow-500 rounded-sm"
            style={{ width: `${kpis.seismicMix.RS3 * 100}%` }}
            title={`RS3 (risc scăzut): ${(kpis.seismicMix.RS3 * 100).toFixed(0)}%`}
          />
        )}
        {kpis.seismicMix.RS2 > 0 && (
          <div
            className="h-full bg-orange-500 rounded-sm"
            style={{ width: `${kpis.seismicMix.RS2 * 100}%` }}
            title={`RS2 (risc mediu): ${(kpis.seismicMix.RS2 * 100).toFixed(0)}%`}
          />
        )}
        {kpis.seismicMix.RS1 > 0 && (
          <div
            className="h-full bg-red-500 rounded-sm"
            style={{ width: `${kpis.seismicMix.RS1 * 100}%` }}
            title={`RS1 (risc ridicat): ${(kpis.seismicMix.RS1 * 100).toFixed(0)}%`}
          />
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Fără risc</span>
        <span>RS1</span>
      </div>
    </div>
  ) : null;

  return (
    <div className="container py-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Median Price */}
        <KpiTile
          icon={Home}
          label="Preț median"
          value={`${formatNumber(kpis.medianEurM2)} €/m²`}
          size="md"
        />

        {/* 12-Month Change */}
        <KpiTile
          icon={TrendingUp}
          label="Creștere 12 luni"
          value={formatChange(kpis.medianEurM2Change12m)}
          deltaVariant={priceChangeType as any}
          size="md"
        />

        {/* Rent */}
        {kpis.medianRentEurM2 ? (
          <KpiTile
            icon={DollarSign}
            label="Chirie medie"
            value={`${formatNumber(kpis.medianRentEurM2)} €/m²`}
            size="md"
          />
        ) : (
          <KpiTile icon={DollarSign} label="Chirie medie" value="—" size="md" />
        )}

        {/* Yield */}
        {kpis.yieldNet ? (
          <KpiTile
            icon={TrendingUp}
            label="Randament net"
            value={`${(kpis.yieldNet * 100).toFixed(1)}%`}
            deltaVariant={
              kpis.yieldNet > 0.06 ? "positive" : kpis.yieldNet < 0.04 ? "negative" : "neutral"
            }
            size="md"
          />
        ) : (
          <KpiTile icon={TrendingUp} label="Randament net" value="—" size="md" />
        )}

        {/* TTS */}
        {kpis.ttsMedianDays ? (
          <KpiTile
            icon={Clock}
            label="Timp până la vânzare"
            value={`${kpis.ttsMedianDays} zile`}
            deltaVariant={
              kpis.ttsMedianDays < 60
                ? "positive"
                : kpis.ttsMedianDays > 120
                  ? "negative"
                  : "neutral"
            }
            size="md"
          />
        ) : (
          <KpiTile icon={Clock} label="Timp până la vânzare" value="—" size="md" />
        )}

        {/* Seismic */}
        <div className="p-4 rounded-[var(--r-md)] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-[var(--elev1)]">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-[rgb(var(--primary))]" />
            <span className="text-[var(--fs-sm)] text-[rgb(var(--muted))] font-medium">
              Risc seismic
            </span>
          </div>
          {seismicBar ? (
            seismicBar
          ) : (
            <div className="text-2xl font-bold text-[rgb(var(--text))] mb-1">—</div>
          )}
          <div className="text-[var(--fs-xs)] text-[rgb(var(--muted))] mt-2">
            Distribuția în zonă
          </div>
        </div>
      </div>
    </div>
  );
}
