import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { TransportSummary } from "@/lib/geo/transport";

type Mode = "METRO" | "TRAM" | "BUS" | "TROLLEY";

interface Props {
  transport: TransportSummary | null;
  /** Legacy: distance from static metro dataset (features.distMetroM) */
  legacyDistMetroM?: number | null;
  legacyNearestMetro?: string | null;
}

const MODE_CONFIG: Record<Mode, { label: string; icon: string; color: string }> = {
  METRO: { label: "Metrou", icon: "🚇", color: "text-blue-700" },
  TRAM: { label: "Tramvai", icon: "🚋", color: "text-green-700" },
  BUS: { label: "Autobuz", icon: "🚌", color: "text-amber-700" },
  TROLLEY: { label: "Troleibuz", icon: "🚎", color: "text-purple-700" },
};

function formatWalk(minutes: number): string {
  if (minutes <= 1) return "1 min";
  return `${minutes} min`;
}

function formatDist(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Excelent";
  if (score >= 60) return "Bun";
  if (score >= 40) return "Acceptabil";
  if (score >= 20) return "Slab";
  return "Foarte slab";
}

export default function TransportSection({ transport, legacyDistMetroM, legacyNearestMetro }: Props) {
  // Use transport data if available, otherwise fall back to legacy
  const hasData = transport && transport.totalNearby > 0;
  const metroStop = transport?.nearestMetro;

  // Fall back to legacy data for metro if DB is empty
  const metroName = metroStop?.name ?? legacyNearestMetro ?? null;
  const metroDistM = metroStop?.distanceM ?? (legacyDistMetroM ? Math.round(legacyDistMetroM) : null);
  const metroWalkMin = metroStop?.walkMinutes ?? (legacyDistMetroM ? Math.round(legacyDistMetroM / 80) : null);

  if (!metroName && !hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transport public</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Locatia exacta nu a fost detectata — datele de transport nu sunt disponibile.
            Adaugati o adresa precisa pentru a vedea statiile din apropiere.
          </p>
        </CardContent>
      </Card>
    );
  }

  const within400m = transport?.within400m ?? { METRO: 0, TRAM: 0, BUS: 0, TROLLEY: 0 };
  const within800m = transport?.within800m ?? { METRO: 0, TRAM: 0, BUS: 0, TROLLEY: 0 };
  const transitScore = transport?.transitScore ?? 0;
  const stops5min = (transport?.stops ?? []).filter((s) => s.walkMinutes <= 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Transport public</CardTitle>
          {hasData && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                transitScore >= 60
                  ? "bg-emerald-100 text-emerald-800"
                  : transitScore >= 35
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {transitScore}/100 — {scoreLabel(transitScore)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metro highlight */}
        {metroName && metroDistM != null && (
          <div
            className={`rounded-lg border p-3 ${
              metroDistM <= 500
                ? "bg-blue-50 border-blue-200"
                : metroDistM <= 1000
                  ? "bg-blue-50/50 border-blue-100"
                  : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🚇</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-blue-800">
                  Metrou: {metroWalkMin != null ? formatWalk(metroWalkMin) : formatDist(metroDistM)} pe jos
                </div>
                <div className="text-xs text-muted-foreground">
                  Statia {metroName} — {formatDist(metroDistM)}
                </div>
              </div>
              {metroDistM <= 500 && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Foarte aproape
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tram highlight if nearby */}
        {transport?.nearestTram && transport.nearestTram.distanceM <= 800 && (
          <div className="flex items-center gap-2 text-sm rounded-lg bg-green-50 border border-green-100 px-3 py-2">
            <span>🚋</span>
            <span className="text-green-800">
              Tramvai: {formatWalk(transport.nearestTram.walkMinutes)} pe jos ({transport.nearestTram.name})
            </span>
          </div>
        )}

        {/* Stops within 5 min walk */}
        {stops5min.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Statii la 5 min pe jos ({stops5min.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {(["METRO", "TRAM", "BUS", "TROLLEY"] as Mode[]).map((mode) => {
                const count = stops5min.filter((s) => s.mode === mode).length;
                if (count === 0) return null;
                const cfg = MODE_CONFIG[mode];
                return (
                  <span
                    key={mode}
                    className="inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs"
                  >
                    <span>{cfg.icon}</span>
                    <span className={`font-medium ${cfg.color}`}>
                      {count} {cfg.label.toLowerCase()}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Density breakdown */}
        {hasData && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">In 400m (~5 min)</div>
              <div className="font-medium">
                {within400m.METRO + within400m.TRAM + within400m.BUS + within400m.TROLLEY} statii
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">In 800m (~10 min)</div>
              <div className="font-medium">
                {within800m.METRO + within800m.TRAM + within800m.BUS + within800m.TROLLEY} statii
              </div>
            </div>
          </div>
        )}

        {/* No metro warning */}
        {!metroName && (
          <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
            Nu a fost identificata o statie de metrou in raza de 2 km. Deplasarea cu masina sau alte mijloace de transport poate fi necesara.
          </div>
        )}

        <p className="text-[10px] text-muted-foreground border-t pt-2">
          Distantele sunt in linie dreapta. Timpul de mers pe jos este estimat la ~80m/min. Datele provin din GTFS si OpenStreetMap.
        </p>
      </CardContent>
    </Card>
  );
}
