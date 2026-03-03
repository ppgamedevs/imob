import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  askingPrice: number | null;
  avmLow: number | null;
  avmMid: number | null;
  avmHigh: number | null;
  notarialTotal: number | null;
  notarialZone: string | null;
  notarialYear: number | null;
  showNotarial: boolean;
  currency?: string;
}

function fmt(n: number | null | undefined, currency = "EUR"): string {
  if (n == null) return "-";
  return `${Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(n)} ${currency}`;
}

function pct(asking: number, reference: number): string {
  const diff = Math.round(((asking - reference) / reference) * 100);
  if (diff > 0) return `+${diff}%`;
  if (diff < 0) return `${diff}%`;
  return "0%";
}

export default function PriceAnchorsSection({
  askingPrice,
  avmLow,
  avmMid,
  avmHigh,
  notarialTotal,
  notarialZone,
  notarialYear,
  showNotarial,
  currency = "EUR",
}: Props) {
  const hasAvm = avmMid != null;
  const hasNotarial = showNotarial && notarialTotal != null;

  if (!hasAvm && !askingPrice) return null;

  const anchors: { value: number; label: string; color: string; subLabel?: string }[] = [];

  if (hasNotarial && notarialTotal) {
    anchors.push({
      value: notarialTotal,
      label: "Valoare notariala",
      color: "#94a3b8",
      subLabel: notarialZone ? `${notarialZone} (${notarialYear})` : undefined,
    });
  }

  if (avmLow != null) {
    anchors.push({ value: avmLow, label: "Estimare minima", color: "#22c55e" });
  }
  if (avmMid != null) {
    anchors.push({ value: avmMid, label: "Estimare piata", color: "#3b82f6" });
  }
  if (avmHigh != null) {
    anchors.push({ value: avmHigh, label: "Estimare maxima", color: "#f59e0b" });
  }
  if (askingPrice != null) {
    anchors.push({ value: askingPrice, label: "Pret cerut", color: "#ef4444" });
  }

  anchors.sort((a, b) => a.value - b.value);

  const min = anchors[0]?.value ?? 0;
  const max = anchors[anchors.length - 1]?.value ?? 1;
  const range = max - min || 1;
  const padding = range * 0.1;
  const barMin = min - padding;
  const barMax = max + padding;
  const barRange = barMax - barMin || 1;

  const overpricing =
    askingPrice != null && avmMid != null
      ? Math.round(((askingPrice - avmMid) / avmMid) * 100)
      : null;

  let verdictLabel = "";
  let verdictColor = "";
  if (overpricing != null) {
    if (overpricing > 10) {
      verdictLabel = "Supraevaluat";
      verdictColor = "bg-red-100 text-red-800";
    } else if (overpricing > 3) {
      verdictLabel = "Usor peste piata";
      verdictColor = "bg-amber-100 text-amber-800";
    } else if (overpricing >= -3) {
      verdictLabel = "Pret corect";
      verdictColor = "bg-green-100 text-green-800";
    } else {
      verdictLabel = "Sub piata";
      verdictColor = "bg-blue-100 text-blue-800";
    }
  }

  const negotiationMargin =
    askingPrice != null && avmMid != null && askingPrice > avmMid
      ? askingPrice - avmMid
      : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Analiza pret</CardTitle>
          {verdictLabel && (
            <Badge variant="outline" className={`text-xs ${verdictColor}`}>
              {verdictLabel}
              {overpricing != null && overpricing !== 0 && (
                <span className="ml-1 font-normal">
                  ({overpricing > 0 ? "+" : ""}{overpricing}%)
                </span>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Visual bar */}
        <div className="relative h-10 bg-muted/40 rounded-lg overflow-visible">
          {/* AVM range band */}
          {avmLow != null && avmHigh != null && (
            <div
              className="absolute top-0 bottom-0 bg-blue-100/60 rounded"
              style={{
                left: `${((avmLow - barMin) / barRange) * 100}%`,
                width: `${((avmHigh - avmLow) / barRange) * 100}%`,
              }}
            />
          )}

          {/* Anchor markers */}
          {anchors.map((a) => {
            const pos = ((a.value - barMin) / barRange) * 100;
            return (
              <div
                key={a.label}
                className="absolute top-0 bottom-0 flex flex-col items-center"
                style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
              >
                <div
                  className="w-0.5 h-full rounded-full"
                  style={{ backgroundColor: a.color }}
                />
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {anchors.map((a) => (
            <div key={a.label} className="flex items-start gap-2">
              <div
                className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: a.color }}
              />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{a.label}</div>
                <div className="font-semibold text-sm">{fmt(a.value, currency)}</div>
                {a.subLabel && (
                  <div className="text-[10px] text-muted-foreground truncate">{a.subLabel}</div>
                )}
                {askingPrice != null && a.label !== "Pret cerut" && (
                  <div className="text-[10px] text-muted-foreground">
                    {pct(askingPrice, a.value)} fata de pret cerut
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Negotiation margin */}
        {negotiationMargin != null && negotiationMargin > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Marja de negociere estimata</span>
              <span className="font-semibold text-sm text-emerald-700">
                {fmt(negotiationMargin, currency)}
              </span>
            </div>
          </div>
        )}

        {/* Notarial context (only for paid) */}
        {hasNotarial && notarialTotal && avmMid && (
          <div className="text-xs text-muted-foreground bg-slate-50 rounded p-2.5">
            Valoarea notariala ({fmt(notarialTotal, currency)}) este valoarea minima fiscala
            folosita de notari pentru calculul taxelor. Pretul real de piata este de obicei
            {" "}{Math.round(((avmMid - notarialTotal) / notarialTotal) * 100)}% mai mare.
          </div>
        )}

        {!hasNotarial && showNotarial === false && (
          <div className="text-xs text-muted-foreground bg-slate-50 rounded p-2.5 flex items-center gap-2">
            <span className="text-amber-500">&#9733;</span>
            <span>
              Valoarea notariala si marja de negociere detaliata sunt disponibile cu planul Standard.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
