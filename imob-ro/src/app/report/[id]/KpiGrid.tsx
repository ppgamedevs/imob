import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/ui/Surface";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * KpiGrid - Compact KPI tiles grid
 *
 * Features:
 * - Responsive: 2 cols mobile, 3 cols desktop
 * - KPI tiles with labels, values, optional hints
 * - Tone-based styling (success, warning, danger, info)
 * - Info tooltips for explanations
 */

export interface KpiGridProps {
  avm?: {
    mid: number;
    low: number;
    high: number;
  };
  tts?: {
    bucket: string; // "fast" | "normal" | "slow"
    days?: number;
  };
  yield?: {
    net: number; // 0-1 (e.g., 0.065 = 6.5%)
    rentEur?: number;
    eurM2Rent?: number;
  };
  seismic?: {
    class: string; // "RS1" | "RS2" | "RS3" | "none"
    confidence?: number;
    source?: string;
  };
  quality?: {
    label: string; // "Excellent" | "Good" | "Fair" | "Poor"
    score?: number; // 0-100
  };
  metro?: {
    distM: number;
    station?: string;
  };
}

export default function KpiGrid({
  avm,
  tts,
  yield: yieldData,
  seismic,
  quality,
  metro,
}: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {/* AVM Tile */}
      {avm && (
        <KpiTile
          label="Estimare AVM"
          value={formatEur(avm.mid)}
          hint={`${formatEur(avm.low)} - ${formatEur(avm.high)}`}
          tone="info"
          tooltip="Automated Valuation Model: estimare bazată pe proprietăți similare și factorii de piață"
        />
      )}

      {/* TTS Tile */}
      {tts && (
        <KpiTile
          label="Time to Sell"
          value={tts.bucket === "fast" ? "Rapid" : tts.bucket === "slow" ? "Lent" : "Normal"}
          hint={tts.days ? `~${tts.days} zile` : undefined}
          tone={tts.bucket === "fast" ? "success" : tts.bucket === "slow" ? "warning" : "info"}
          tooltip="Estimare a timpului necesar pentru vânzare bazată pe piață și caracteristici"
        />
      )}

      {/* Yield Tile */}
      {yieldData && (
        <KpiTile
          label="Randament Net"
          value={`${(yieldData.net * 100).toFixed(1)}%`}
          hint={yieldData.rentEur ? `~${formatEur(yieldData.rentEur)}/lună` : undefined}
          tone={yieldData.net >= 0.06 ? "success" : yieldData.net >= 0.04 ? "info" : "warning"}
          tooltip="Randament net anual după deducerea cheltuielilor (întreținere, impozite)"
        />
      )}

      {/* Seismic Tile */}
      {seismic && seismic.class !== "none" && (
        <KpiTile
          label="Risc Seismic"
          value={seismic.class}
          hint={
            seismic.confidence ? `${Math.round(seismic.confidence * 100)}% confidence` : undefined
          }
          tone={seismic.class === "RS1" ? "danger" : seismic.class === "RS2" ? "warning" : "info"}
          tooltip="Clasificare risc seismic conform normativelor românești (RS1 = risc ridicat)"
        />
      )}

      {/* Quality Tile */}
      {quality && (
        <KpiTile
          label="Calitate Date"
          value={quality.label}
          hint={quality.score ? `Score: ${quality.score}/100` : undefined}
          tone={
            quality.score
              ? quality.score >= 80
                ? "success"
                : quality.score >= 60
                  ? "info"
                  : "warning"
              : "info"
          }
          tooltip="Completitudine și acuratețe informații: fotografii, descriere, date tehnice"
        />
      )}

      {/* Metro Distance Tile */}
      {metro && (
        <KpiTile
          label="Distanță Metrou"
          value={`${Math.round(metro.distM)} m`}
          hint={metro.station}
          tone={metro.distM <= 500 ? "success" : metro.distM <= 1000 ? "info" : "warning"}
          tooltip="Distanță până la cea mai apropiată stație de metrou"
        />
      )}
    </div>
  );
}

/** KPI Tile Component */
interface KpiTileProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "success" | "warning" | "danger" | "info";
  tooltip?: string;
}

function KpiTile({ label, value, hint, tone = "info", tooltip }: KpiTileProps) {
  const toneStyles = {
    success: "border-success/30 bg-success/5",
    warning: "border-warning/30 bg-warning/5",
    danger: "border-danger/30 bg-danger/5",
    info: "border-border bg-surface",
  };

  const valueStyles = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    info: "text-text",
  };

  return (
    <Surface
      elevation={0}
      rounded="lg"
      className={cn("p-4 transition-shadow duration-med hover:shadow-elev1", toneStyles[tone])}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-xs font-medium text-muted uppercase tracking-wide">{label}</h3>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted hover:text-text transition-colors focus-ring rounded-sm"
                  aria-label={`Informații despre ${label}`}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className={cn("text-2xl font-bold mb-1", valueStyles[tone])}>{value}</div>

      {hint && (
        <div className="text-xs text-muted truncate" title={hint}>
          {hint}
        </div>
      )}
    </Surface>
  );
}

/** Format EUR currency */
function formatEur(value: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
