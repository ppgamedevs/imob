import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * AvmCard - AVM explanation with sparkline
 *
 * Shows:
 * - AVM estimate vs asking price
 * - Simple sparkline comparing to area median
 * - Badge explanation (why under/fair/over)
 */

export interface AvmCardProps {
  avmEur: number;
  askingPriceEur: number;
  areaMedianEur: number;
  badge: "under" | "fair" | "over";
  explanation?: string;
}

export default function AvmCard({
  avmEur,
  askingPriceEur,
  areaMedianEur,
  badge,
  explanation,
}: AvmCardProps) {
  const delta = ((askingPriceEur - avmEur) / avmEur) * 100;
  const deltaAbs = Math.abs(delta);
  const isUnder = badge === "under";
  const isOver = badge === "over";

  const badgeConfig = {
    under: {
      label: "Underpriced",
      className: "bg-success/15 text-success border-success/30",
      icon: TrendingDown,
      message: "Preț mai mic decât valoarea estimată",
    },
    fair: {
      label: "Fair Price",
      className: "bg-warning/15 text-warning border-warning/30",
      icon: Minus,
      message: "Preț apropiat de valoarea de piață",
    },
    over: {
      label: "Overpriced",
      className: "bg-danger/15 text-danger border-danger/30",
      icon: TrendingUp,
      message: "Preț mai mare decât valoarea estimată",
    },
  };

  const config = badgeConfig[badge];
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Valoare Estimată (AVM)</h2>
        <p className="text-sm text-muted">Estimare bazată pe proprietăți similare din zonă</p>
      </div>

      {/* Price Comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-muted mb-1">Preț Solicitat</div>
          <div className="text-xl font-bold">{formatEur(askingPriceEur)}</div>
        </div>
        <div>
          <div className="text-xs text-muted mb-1">Estimare AVM</div>
          <div className="text-xl font-bold text-primary">{formatEur(avmEur)}</div>
        </div>
      </div>

      {/* Badge and Delta */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <Badge className={config.className}>
          <Icon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
        <span
          className={cn("text-sm font-medium", isUnder && "text-success", isOver && "text-danger")}
        >
          {delta > 0 ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
      </div>

      {/* Explanation */}
      <div className="text-sm text-muted">{explanation || config.message}</div>

      {/* Simple Sparkline */}
      <div className="space-y-2">
        <div className="text-xs text-muted">Comparație cu Zona</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-med",
                isUnder && "bg-success",
                badge === "fair" && "bg-warning",
                isOver && "bg-danger",
              )}
              style={{
                width: `${Math.min(100, Math.max(0, (askingPriceEur / areaMedianEur) * 100))}%`,
              }}
            />
          </div>
          <span className="text-xs text-muted whitespace-nowrap">
            Medie: {formatEur(areaMedianEur)}
          </span>
        </div>
      </div>

      {/* Advice */}
      {deltaAbs >= 10 && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
          {isOver && (
            <>
              <strong>Recomandare:</strong> Prețul este semnificativ mai mare decât valoarea
              estimată. Poți negocia un preț mai bun.
            </>
          )}
          {isUnder && (
            <>
              <strong>Atenție:</strong> Prețul este foarte atractiv comparativ cu piața. Verifică
              motivul (stare, probleme legale, urgență vânzător).
            </>
          )}
        </div>
      )}
    </div>
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
