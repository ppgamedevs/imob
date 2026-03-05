"use client";

import type { DemandSignals, TrendDirection, Confidence } from "@/lib/geo/signals/querySignals";
import type { ZoneTypeResult, ZoneTypeKey } from "@/lib/geo/zoneType";

// ---- Signals Panel ----

function TrendArrow({ direction, pct }: { direction: TrendDirection; pct: number }) {
  if (direction === "up")
    return <span className="text-emerald-600 font-medium text-xs">&#9650; +{Math.abs(pct)}%</span>;
  if (direction === "down")
    return <span className="text-red-600 font-medium text-xs">&#9660; {pct}%</span>;
  return <span className="text-gray-500 font-medium text-xs">&#8212; stabil</span>;
}

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const styles: Record<Confidence, string> = {
    ridicata: "bg-emerald-100 text-emerald-800 border-emerald-200",
    medie: "bg-amber-100 text-amber-800 border-amber-200",
    scazuta: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[confidence]}`}>
      Incredere: {confidence}
    </span>
  );
}

function Meter({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold">{value}<span className="font-normal text-muted-foreground">/100</span></span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function SignalsPanel({ signals }: { signals: DemandSignals }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Semnale de piata</h3>
        <ConfidenceBadge confidence={signals.confidence} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Demand */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Cerere</span>
            <TrendArrow direction={signals.demandTrend} pct={signals.demandTrendPct} />
          </div>
          <Meter value={signals.demandIndex} color="bg-blue-500" label="Index cerere" />
          <div className="text-[10px] text-muted-foreground">
            Bazat pe {signals.nEvents30d} evenimente / 30 zile
          </div>
        </div>

        {/* Supply */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Oferta</span>
            <TrendArrow direction={signals.supplyTrend} pct={signals.supplyTrendPct} />
          </div>
          <Meter value={signals.supplyIndex} color="bg-purple-500" label="Index oferta" />
          <div className="text-[10px] text-muted-foreground">
            {signals.nListings} anunturi active in zona
          </div>
        </div>
      </div>

      {/* Price trend */}
      {(signals.medianPriceM2_30d != null || signals.medianPriceM2_90d != null) && (
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium">Trend pret EUR/mp</span>
            {signals.priceTrend && (
              <TrendArrow direction={signals.priceTrend} pct={signals.priceTrendPct ?? 0} />
            )}
          </div>
          <div className="flex items-baseline gap-4 text-sm">
            {signals.medianPriceM2_30d != null && (
              <div>
                <span className="font-bold">{signals.medianPriceM2_30d.toLocaleString("ro-RO")}</span>
                <span className="text-xs text-muted-foreground ml-1">EUR/mp (30 zile)</span>
              </div>
            )}
            {signals.medianPriceM2_90d != null && (
              <div>
                <span className="font-semibold text-muted-foreground">{signals.medianPriceM2_90d.toLocaleString("ro-RO")}</span>
                <span className="text-xs text-muted-foreground ml-1">EUR/mp (90 zile)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disclaimers */}
      {signals.disclaimers.length > 0 && (
        <div className="text-[10px] text-muted-foreground space-y-0.5">
          {signals.disclaimers.map((d, i) => (
            <div key={i} className="flex items-start gap-1">
              <span className="shrink-0 mt-0.5">*</span>
              <span>{d}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Zone Type Badge ----

const ZONE_STYLES: Record<ZoneTypeKey, { bg: string; text: string; border: string; icon: string }> = {
  familie: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", icon: "👨\u200D👩\u200D👧" },
  studenti: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200", icon: "🎓" },
  corporate: { bg: "bg-slate-50", text: "text-slate-800", border: "border-slate-200", icon: "💼" },
  nightlife: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200", icon: "🌙" },
  investitie: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", icon: "📈" },
  in_crestere: { bg: "bg-green-50", text: "text-green-800", border: "border-green-200", icon: "🚀" },
  stagnanta: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", icon: "📉" },
};

export function ZoneTypeBadge({ zone }: { zone: ZoneTypeResult }) {
  const style = ZONE_STYLES[zone.zoneType] ?? ZONE_STYLES.stagnanta;

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{style.icon}</span>
          <div>
            <div className={`text-sm font-bold ${style.text}`}>{zone.labelRo}</div>
            <ConfidenceBadge confidence={zone.confidence} />
          </div>
        </div>
      </div>

      {/* Evidence */}
      {zone.evidence.length > 0 && (
        <ul className="space-y-0.5">
          {zone.evidence.map((e, i) => (
            <li key={i} className="text-xs flex items-start gap-1.5">
              <span className="shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-gray-700">{e}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Warnings */}
      {zone.warnings.length > 0 && (
        <ul className="space-y-0.5">
          {zone.warnings.map((w, i) => (
            <li key={i} className="text-xs flex items-start gap-1.5 text-amber-700">
              <span className="shrink-0 mt-0.5">*</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
