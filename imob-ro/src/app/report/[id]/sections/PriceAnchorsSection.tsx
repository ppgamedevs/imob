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

  type Anchor = { value: number; label: string; color: string; dotBorder: string; subLabel?: string };
  const anchors: Anchor[] = [];

  if (hasNotarial && notarialTotal) {
    anchors.push({
      value: notarialTotal,
      label: "Valoare notariala",
      color: "bg-slate-400",
      dotBorder: "border-slate-500",
      subLabel: notarialZone ? `${notarialZone} (${notarialYear})` : undefined,
    });
  }
  if (avmLow != null) {
    anchors.push({ value: avmLow, label: "Estimare minima", color: "bg-emerald-500", dotBorder: "border-emerald-600" });
  }
  if (avmMid != null) {
    anchors.push({ value: avmMid, label: "Estimare piata", color: "bg-blue-500", dotBorder: "border-blue-600" });
  }
  if (avmHigh != null) {
    anchors.push({ value: avmHigh, label: "Estimare maxima", color: "bg-amber-500", dotBorder: "border-amber-600" });
  }
  if (askingPrice != null) {
    anchors.push({ value: askingPrice, label: "Pret cerut", color: "bg-red-500", dotBorder: "border-red-600" });
  }
  anchors.sort((a, b) => a.value - b.value);

  const noEstimate = !hasAvm && askingPrice != null;

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
        {noEstimate ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-center">
              <div className="text-sm font-medium text-muted-foreground">
                Nu am suficiente date pentru estimarea pretului
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Pret cerut: <span className="font-semibold text-foreground">{fmt(askingPrice, currency)}</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Sunt necesare mai multe comparabile in zona pentru o estimare corecta.
              </div>
            </div>

            {/* Show notarial price as reference when AVM is unavailable */}
            {hasNotarial && notarialTotal != null && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start gap-2.5">
                  <div className="mt-1 w-3 h-3 rounded-full shrink-0 bg-slate-400" />
                  <div>
                    <div className="text-xs text-muted-foreground">Valoare notariala (referinta fiscala)</div>
                    <div className="font-semibold text-sm">{fmt(notarialTotal, currency)}</div>
                    {notarialZone && (
                      <div className="text-[10px] text-muted-foreground">{notarialZone} ({notarialYear})</div>
                    )}
                    <div className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
                      Aceasta este valoarea minima fiscala din grila notariala, folosita la calculul taxelor. Pretul real de piata este de obicei semnificativ mai mare.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Visual bar with inline labels */}
            {anchors.length > 1 && (() => {
              const min = anchors[0].value;
              const max = anchors[anchors.length - 1].value;
              const range = max - min || 1;
              const padding = range * 0.1;
              const barMin = min - padding;
              const barMax = max + padding;
              const barRange = barMax - barMin || 1;

              return (
                <div className="relative pt-6 pb-2">
                  <div className="relative h-3 bg-gradient-to-r from-emerald-100 via-blue-100 to-amber-100 rounded-full">
                    {avmLow != null && avmHigh != null && (
                      <div
                        className="absolute top-0 bottom-0 bg-blue-200/60 rounded-full"
                        style={{
                          left: `${((avmLow - barMin) / barRange) * 100}%`,
                          width: `${((avmHigh - avmLow) / barRange) * 100}%`,
                        }}
                      />
                    )}
                    {anchors.map((a, idx) => {
                      const pos = ((a.value - barMin) / barRange) * 100;
                      const isTop = idx % 2 === 0;
                      return (
                        <div
                          key={a.label}
                          className="absolute flex flex-col items-center"
                          style={{ left: `${pos}%`, transform: "translateX(-50%)", top: "-4px" }}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border-2 ${a.color} ${a.dotBorder} shadow-sm`}
                          />
                          <div className={`absolute whitespace-nowrap text-[10px] font-medium ${
                            isTop ? "-top-6" : "top-6"
                          }`}>
                            {fmt(a.value, currency)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Anchor cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {anchors.map((a) => (
                <div key={a.label} className="flex items-start gap-2.5 p-2 rounded-lg bg-muted/30">
                  <div className={`mt-1 w-3 h-3 rounded-full shrink-0 ${a.color}`} />
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">{a.label}</div>
                    <div className="font-semibold text-sm">{fmt(a.value, currency)}</div>
                    {a.subLabel && (
                      <div className="text-[10px] text-muted-foreground truncate">{a.subLabel}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

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

        {/* Notarial context */}
        {hasNotarial && notarialTotal && avmMid && (
          <div className="text-xs text-muted-foreground bg-slate-50 rounded p-2.5">
            Valoarea notariala ({fmt(notarialTotal, currency)}) este valoarea minima fiscala
            folosita de notari pentru calculul taxelor. Pretul real de piata este de obicei
            {" "}{Math.round(((avmMid - notarialTotal) / notarialTotal) * 100)}% mai mare.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
