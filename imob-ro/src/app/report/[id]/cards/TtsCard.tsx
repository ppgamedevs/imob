import * as React from "react";
import { Clock, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * TtsCard - Time to Sell explanation
 * 
 * Shows:
 * - TTS bucket (fast/normal/slow)
 * - Estimated days on market
 * - Factors affecting TTS (price delta, seasonality)
 * - Actionable advice
 */

export interface TtsCardProps {
  bucket: "fast" | "normal" | "slow";
  estimatedDays?: number;
  factors?: {
    priceDelta?: number; // % vs market
    seasonality?: "high" | "medium" | "low";
    demand?: "high" | "medium" | "low";
  };
  advice?: string;
}

export default function TtsCard({
  bucket,
  estimatedDays,
  factors,
  advice,
}: TtsCardProps) {
  const bucketConfig = {
    fast: {
      label: "Vânzare Rapidă",
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success/30",
      range: "< 30 zile",
      icon: TrendingUp,
    },
    normal: {
      label: "Durată Normală",
      color: "text-info",
      bgColor: "bg-info/10",
      borderColor: "border-info/30",
      range: "30-90 zile",
      icon: Clock,
    },
    slow: {
      label: "Vânzare Lentă",
      color: "text-warning",
      bgColor: "bg-warning/10",
      borderColor: "border-warning/30",
      range: "> 90 zile",
      icon: TrendingDown,
    },
  };

  const config = bucketConfig[bucket];
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Time to Sell</h2>
        <p className="text-sm text-muted">
          Estimare durată până la vânzare bazată pe piață
        </p>
      </div>

      {/* Bucket Display */}
      <div
        className={cn(
          "p-4 rounded-lg border",
          config.bgColor,
          config.borderColor
        )}
      >
        <div className="flex items-center gap-3 mb-2">
          <Icon className={cn("h-6 w-6", config.color)} />
          <div>
            <div className={cn("text-lg font-bold", config.color)}>
              {config.label}
            </div>
            <div className="text-sm text-muted">{config.range}</div>
          </div>
        </div>
        {estimatedDays && (
          <div className="text-2xl font-bold mt-2">
            ~{estimatedDays} <span className="text-base font-normal text-muted">zile</span>
          </div>
        )}
      </div>

      {/* Factors */}
      {factors && (
        <div className="space-y-3">
          <div className="text-sm font-medium">Factori de Influență:</div>

          {/* Price Delta */}
          {factors.priceDelta !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Preț vs Piață:</span>
              <span
                className={cn(
                  "font-medium",
                  factors.priceDelta > 5 && "text-danger",
                  factors.priceDelta < -5 && "text-success",
                  Math.abs(factors.priceDelta) <= 5 && "text-info"
                )}
              >
                {factors.priceDelta > 0 ? "+" : ""}
                {factors.priceDelta.toFixed(1)}%
              </span>
            </div>
          )}

          {/* Seasonality */}
          {factors.seasonality && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Sezon:
              </span>
              <Badge variant="outline" className="capitalize">
                {factors.seasonality === "high"
                  ? "Sezon bun"
                  : factors.seasonality === "low"
                  ? "Sezon slab"
                  : "Sezon mediu"}
              </Badge>
            </div>
          )}

          {/* Demand */}
          {factors.demand && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Cerere Zonă:</span>
              <Badge
                variant="outline"
                className={cn(
                  factors.demand === "high" && "border-success/50 text-success",
                  factors.demand === "low" && "border-warning/50 text-warning"
                )}
              >
                {factors.demand === "high"
                  ? "Ridicată"
                  : factors.demand === "low"
                  ? "Scăzută"
                  : "Medie"}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Advice */}
      <div className="p-3 bg-muted/30 rounded-lg text-sm">
        <div className="font-medium mb-1">Recomandare:</div>
        <div className="text-muted">
          {advice ||
            (bucket === "fast"
              ? "Proprietatea are șanse mari să se vândă rapid. Fii pregătit pentru negocieri."
              : bucket === "slow"
              ? "Vânzarea poate dura. Consideră ajustarea prețului sau îmbunătățiri vizuale (fotografii, descriere)."
              : "Durată normală de vânzare pentru această zonă și preț. Monitorizează piața.")}
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="space-y-2">
        <div className="text-xs text-muted">Interval Estimat</div>
        <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
          {/* Fast zone (0-30 days) */}
          <div
            className="absolute left-0 top-0 h-full bg-success/30 border-r border-success/50"
            style={{ width: "33.33%" }}
          />
          {/* Normal zone (30-90 days) */}
          <div
            className="absolute left-[33.33%] top-0 h-full bg-info/30 border-r border-info/50"
            style={{ width: "33.33%" }}
          />
          {/* Slow zone (90+ days) */}
          <div
            className="absolute left-[66.66%] top-0 h-full bg-warning/30"
            style={{ width: "33.34%" }}
          />
          {/* Current indicator */}
          {estimatedDays && (
            <div
              className={cn(
                "absolute top-0 h-full w-1 transition-all duration-med",
                config.color.replace("text-", "bg-")
              )}
              style={{
                left: `${Math.min(100, (estimatedDays / 120) * 100)}%`,
              }}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-muted">
          <span>0</span>
          <span>30</span>
          <span>60</span>
          <span>90+</span>
        </div>
      </div>
    </div>
  );
}
