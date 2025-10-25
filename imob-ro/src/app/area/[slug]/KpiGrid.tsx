import { AlertTriangle, Clock, DollarSign, Home, TrendingDown, TrendingUp } from "lucide-react";
import * as React from "react";

import type { AreaKpis } from "@/lib/areas/dto";
import { formatChange, formatNumber } from "@/lib/areas/series";
import { cn } from "@/lib/utils";

export interface KpiGridProps {
  kpis: AreaKpis;
}

interface KpiTileProps {
  icon: React.ElementType;
  label: string;
  value: string | React.ReactNode;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  subtitle?: string;
  className?: string;
}

function KpiTile({
  icon: Icon,
  label,
  value,
  change,
  changeType,
  subtitle,
  className,
}: KpiTileProps) {
  return (
    <div className={cn("p-4 rounded-lg border border-border bg-surface", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted" />
        <span className="text-sm text-muted">{label}</span>
      </div>
      <div className="text-2xl font-bold text-fg mb-1">{value}</div>
      {change && (
        <div
          className={cn(
            "text-sm font-medium flex items-center gap-1",
            changeType === "positive"
              ? "text-green-600 dark:text-green-400"
              : changeType === "negative"
                ? "text-red-600 dark:text-red-400"
                : "text-muted",
          )}
        >
          {changeType === "positive" && <TrendingUp className="h-3 w-3" />}
          {changeType === "negative" && <TrendingDown className="h-3 w-3" />}
          {change}
        </div>
      )}
      {subtitle && <div className="text-xs text-muted mt-1">{subtitle}</div>}
    </div>
  );
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
          subtitle="În ultimele 30 zile"
        />

        {/* 12-Month Change */}
        <KpiTile
          icon={TrendingUp}
          label="Creștere 12 luni"
          value={formatChange(kpis.medianEurM2Change12m)}
          changeType={priceChangeType}
          subtitle="An la an"
        />

        {/* Rent */}
        {kpis.medianRentEurM2 ? (
          <KpiTile
            icon={DollarSign}
            label="Chirie medie"
            value={`${formatNumber(kpis.medianRentEurM2)} €/m²`}
            subtitle="Pe lună"
          />
        ) : (
          <KpiTile icon={DollarSign} label="Chirie medie" value="—" subtitle="Date insuficiente" />
        )}

        {/* Yield */}
        {kpis.yieldNet ? (
          <KpiTile
            icon={TrendingUp}
            label="Randament net"
            value={`${(kpis.yieldNet * 100).toFixed(1)}%`}
            changeType={
              kpis.yieldNet > 0.06 ? "positive" : kpis.yieldNet < 0.04 ? "negative" : "neutral"
            }
            subtitle="Anual estimat"
          />
        ) : (
          <KpiTile icon={TrendingUp} label="Randament net" value="—" subtitle="Date insuficiente" />
        )}

        {/* TTS */}
        {kpis.ttsMedianDays ? (
          <KpiTile
            icon={Clock}
            label="Timp până la vânzare"
            value={`${kpis.ttsMedianDays} zile`}
            changeType={
              kpis.ttsMedianDays < 60
                ? "positive"
                : kpis.ttsMedianDays > 120
                  ? "negative"
                  : "neutral"
            }
            subtitle="Median (TTS)"
          />
        ) : (
          <KpiTile
            icon={Clock}
            label="Timp până la vânzare"
            value="—"
            subtitle="Date insuficiente"
          />
        )}

        {/* Seismic */}
        <div className="p-4 rounded-lg border border-border bg-surface">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-muted" />
            <span className="text-sm text-muted">Risc seismic</span>
          </div>
          {seismicBar ? seismicBar : <div className="text-2xl font-bold text-fg mb-1">—</div>}
          <div className="text-xs text-muted mt-2">Distribuția în zonă</div>
        </div>
      </div>
    </div>
  );
}
