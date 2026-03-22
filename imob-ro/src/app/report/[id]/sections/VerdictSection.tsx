import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FairPriceResult } from "@/lib/report/pricing";
import { priceNextStep, priceWhatThisMeans } from "@/lib/report/trust-copy";

import ReportClarityBadge, { SectionTrustFooter } from "./ReportClarityBadge";

interface Props {
  priceRange: { low: number; high: number; mid: number; conf: number } | null;
  actualPrice?: number | null;
  confidence?: { level: string; score: number } | null;
  compsFair?: FairPriceResult | null;
  currency?: string;
  /** For trust copy (comparables count in analysis). */
  compsCount?: number;
}

function fmt(n: number, currency = "EUR") {
  return `${n.toLocaleString("ro-RO")} ${currency}`;
}

function ConfidenceDot({ level }: { level: string }) {
  const color =
    level === "high"
      ? "bg-emerald-500"
      : level === "medium"
        ? "bg-amber-500"
        : "bg-red-400";
  const label =
    level === "high"
      ? "Ridicata"
      : level === "medium"
        ? "Medie"
        : "Scazuta";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function EurM2Distribution({
  values,
  median,
  q1,
  q3,
  askingEurM2,
}: {
  values: number[];
  median: number;
  q1: number | null;
  q3: number | null;
  askingEurM2: number | null;
}) {
  if (values.length < 2) return null;

  const min = values[0];
  const max = values[values.length - 1];
  const range = max - min;
  if (range <= 0) return null;

  const pad = range * 0.08;
  const lo = min - pad;
  const span = range + pad * 2;
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - lo) / span) * 100));

  const BIN_COUNT = 20;
  const binWidth = span / BIN_COUNT;
  const bins = new Array(BIN_COUNT).fill(0) as number[];
  for (const v of values) {
    const idx = Math.min(BIN_COUNT - 1, Math.floor((v - lo) / binWidth));
    bins[idx]++;
  }
  const maxBin = Math.max(...bins, 1);

  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground font-medium">
        Distributie EUR/mp comparabile
      </div>
      <div className="relative">
        {/* Histogram bars */}
        <div className="flex items-end gap-px h-10">
          {bins.map((count, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-blue-200 transition-all"
              style={{ height: `${(count / maxBin) * 100}%`, minHeight: count > 0 ? "2px" : 0 }}
            />
          ))}
        </div>

        {/* IQR overlay */}
        {q1 != null && q3 != null && (
          <div
            className="absolute top-0 bottom-0 bg-blue-400/20 border-x border-blue-400/50"
            style={{ left: `${pos(q1)}%`, width: `${pos(q3) - pos(q1)}%` }}
          />
        )}

        {/* Axis */}
        <div className="relative h-3 mt-0.5">
          {/* Median tick */}
          <div
            className="absolute top-0 w-0.5 h-2.5 bg-blue-600 rounded"
            style={{ left: `${pos(median)}%` }}
          />
          {/* Asking price tick */}
          {askingEurM2 != null && askingEurM2 >= lo && askingEurM2 <= lo + span && (
            <div
              className="absolute top-0 w-0.5 h-2.5 bg-red-500 rounded"
              style={{ left: `${pos(askingEurM2)}%` }}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-3 rounded bg-blue-600" /> Mediana
          </span>
          {askingEurM2 != null && (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-1.5 w-3 rounded bg-red-500" /> Pret cerut
            </span>
          )}
          {q1 != null && q3 != null && (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-1.5 w-3 rounded bg-blue-400/40 border border-blue-400/60" /> Q1-Q3
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TopCompsMini({
  comps,
  currency,
}: {
  comps: { title?: string | null; eurM2: number; distanceM: number; matchType: string }[];
  currency: string;
}) {
  if (comps.length === 0) return null;
  const shown = comps.slice(0, 5);

  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground font-medium">
        Top comparabile ({comps.length} total)
      </div>
      <div className="space-y-1">
        {shown.map((c, i) => (
          <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-muted/50 last:border-0">
            <span className="truncate max-w-[60%] text-muted-foreground">
              {c.matchType === "tight" && (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
              )}
              {c.title || `Comp ${i + 1}`}
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="font-medium">{Math.round(c.eurM2).toLocaleString("ro-RO")} {currency}/mp</span>
              {c.distanceM < 9999 && (
                <span className="text-muted-foreground">{c.distanceM}m</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VerdictSection({
  priceRange,
  actualPrice,
  confidence,
  compsFair,
  currency = "EUR",
  compsCount = 0,
}: Props) {
  const fair = compsFair && compsFair.compsUsed > 0 ? compsFair : null;
  const range = fair
    ? { low: fair.fairMin, high: fair.fairMax, mid: fair.fairMid }
    : priceRange;

  const confLevel = fair?.confidence?.level ?? confidence?.level ?? null;

  if (!range) {
    return (
      <Card className="border-0 shadow-sm ring-1 ring-slate-200/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Putem avea incredere in pret?</CardTitle>
          <CardDescription>
            Nu avem inca un interval estimat robust pentru acest anunt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <ReportClarityBadge kind="unknown" />
            <span className="text-muted-foreground">Estimare pret indisponibila.</span>
          </div>
          <SectionTrustFooter
            whatThisMeans="Fara interval estimat, nu poti compara automat cu piata."
            nextStep={priceNextStep(compsCount)}
          />
        </CardContent>
      </Card>
    );
  }

  const { low, high, mid } = range;

  const askingEurM2 =
    actualPrice && compsFair?.comps?.[0]
      ? actualPrice / (compsFair.comps[0].areaM2 || 50)
      : null;

  const hasRobust = !!(fair && fair.compsUsed >= 3 && range.mid > 0);
  const eurM2Display =
    actualPrice && fair?.comps?.[0]?.areaM2
      ? Math.round(actualPrice / fair.comps[0].areaM2)
      : askingEurM2
        ? Math.round(askingEurM2)
        : null;

  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200/80">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Putem avea incredere in pret?</CardTitle>
            <CardDescription className="mt-1">
              Intervalul de mai jos este un <strong>model</strong>, nu o garantie.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {fair && (
              <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-200 bg-blue-50/80">
                {fair.compsUsed} comparabile
              </Badge>
            )}
            {confLevel && <ConfidenceDot level={confLevel} />}
            <ReportClarityBadge kind="estimated" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Verdict pill lives above the fold in ReportPriceFairnessBlock */}

        {/* Range display */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Minim estimat</div>
            <div className="font-semibold">{fmt(low, currency)}</div>
            {fair?.q1EurM2 && (
              <div className="text-[10px] text-muted-foreground">{fair.q1EurM2.toLocaleString("ro-RO")} {currency}/mp</div>
            )}
          </div>
          <div>
            <div className="text-muted-foreground">Estimare medie</div>
            <div className="font-semibold">{fmt(mid, currency)}</div>
            {fair?.medianEurM2 ? (
              <div className="text-[10px] text-muted-foreground">{fair.medianEurM2.toLocaleString("ro-RO")} {currency}/mp</div>
            ) : null}
          </div>
          <div>
            <div className="text-muted-foreground">Maxim estimat</div>
            <div className="font-semibold">{fmt(high, currency)}</div>
            {fair?.q3EurM2 && (
              <div className="text-[10px] text-muted-foreground">{fair.q3EurM2.toLocaleString("ro-RO")} {currency}/mp</div>
            )}
          </div>
        </div>

        {/* Asking price */}
        {actualPrice != null && (
          <div className="pt-3 border-t border-slate-100 text-sm space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <ReportClarityBadge kind="confirmed" />
              <span className="text-muted-foreground">Pret cerut (din anunt): </span>
              <span className="font-semibold">{fmt(actualPrice, currency)}</span>
            </div>
            {eurM2Display != null && (
              <p className="text-xs text-muted-foreground pl-1">
                ≈ {eurM2Display.toLocaleString("ro-RO")} {currency}/mp{" "}
                <span className="italic">(~ estimat din pret si suprafata din anunt)</span>
              </p>
            )}
          </div>
        )}

        {/* EUR/m² distribution histogram */}
        {fair && fair.eurM2Values.length >= 3 && (
          <div className="pt-3 border-t">
            <EurM2Distribution
              values={fair.eurM2Values}
              median={fair.medianEurM2}
              q1={fair.q1EurM2}
              q3={fair.q3EurM2}
              askingEurM2={
                actualPrice && fair.comps[0]?.areaM2
                  ? Math.round(actualPrice / fair.comps[0].areaM2)
                  : askingEurM2 ? Math.round(askingEurM2) : null
              }
            />
          </div>
        )}

        {/* Top comps mini list */}
        {fair && fair.comps.length > 0 && (
          <div className="pt-3 border-t">
            <TopCompsMini comps={fair.comps} currency={currency} />
          </div>
        )}

        {/* Confidence / dispersion note */}
        {fair && fair.dispersion > 0.25 && (
          <div className="text-xs text-amber-600 bg-amber-50 rounded p-2">
            Dispersie mare in preturile comparabilelor (CoV: {fair.dispersion}). Intervalul estimat este mai larg.
          </div>
        )}

        {confLevel === "low" && (
          <div className="text-xs text-amber-600 bg-amber-50 rounded p-2">
            Estimare orientativa - date insuficiente in zona. Rezultatele pot varia semnificativ.
          </div>
        )}

        {/* AVM fallback note when comps are used */}
        {fair && priceRange && Math.abs(fair.fairMid - priceRange.mid) > priceRange.mid * 0.15 && (
          <div className="text-[10px] text-muted-foreground">
            Estimarea pe baza de comparabile difera cu {Math.abs(Math.round(((fair.fairMid - priceRange.mid) / priceRange.mid) * 100))}% fata de estimarea statistica de zona.
          </div>
        )}

        <SectionTrustFooter
          whatThisMeans={priceWhatThisMeans(hasRobust, compsCount, confLevel)}
          nextStep={priceNextStep(compsCount)}
        />
      </CardContent>
    </Card>
  );
}
