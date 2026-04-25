import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  computePriceVerdictPill,
  formatDeltaAsPercent,
} from "@/lib/report/price-verdict-badge";
import ReportClarityBadge, { SectionTrustFooter } from "./ReportClarityBadge";

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

function anchorClarity(label: string): "confirmed" | "estimated" {
  if (/notarial/i.test(label)) return "confirmed";
  if (/Pret cerut/i.test(label)) return "confirmed";
  return "estimated";
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

  // Show section if we have market estimate, listing price, OR notarial anchor alone
  if (!hasAvm && !askingPrice && !hasNotarial) return null;

  const fairPill =
    askingPrice != null && askingPrice > 0 && avmMid != null && avmMid > 0
      ? computePriceVerdictPill(askingPrice, avmMid)
      : null;

  const verdictLabel = fairPill?.label ?? "";
  const verdictColor = fairPill
    ? fairPill.tone === "green"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : fairPill.tone === "yellow"
        ? "bg-amber-50 text-amber-950 border-amber-200"
        : "bg-rose-50 text-rose-950 border-rose-200"
    : "";

  const negotiationMargin =
    askingPrice != null && avmMid != null && askingPrice > avmMid
      ? askingPrice - avmMid
      : null;

  type Anchor = { value: number; label: string; color: string; dotBorder: string; subLabel?: string };
  const anchors: Anchor[] = [];

  if (hasNotarial && notarialTotal != null) {
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
    <Card className="border-0 shadow-sm ring-1 ring-slate-200/80">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Unde se pozitioneaza pretul?</CardTitle>
            <CardDescription className="mt-1 max-w-prose">
              ~ = estimat din model. ✔ = din anunt sau reper fiscal. Nu e pret „corect” unic - e un
              reper pentru decizie.
            </CardDescription>
          </div>
          {verdictLabel && fairPill && (
            <Badge variant="outline" className={`text-xs shrink-0 ${verdictColor}`}>
              {verdictLabel}
              <span className="ml-1 font-normal tabular-nums">
                ({formatDeltaAsPercent(fairPill.delta)})
              </span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {noEstimate ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-amber-50/60 p-4 ring-1 ring-amber-100/80">
              <div className="flex flex-wrap items-center gap-2">
                <ReportClarityBadge kind="unknown" />
                <span className="text-sm font-medium text-amber-950">
                  Nu avem suficiente comparabile pentru o estimare automata in zona.
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-700">
                Pret listat (din anunt):{" "}
                <span className="font-semibold tabular-nums">{fmt(askingPrice, currency)}</span>{" "}
                <ReportClarityBadge kind="confirmed" />
              </div>
              <SectionTrustFooter
                className="mt-3 bg-white/80"
                whatThisMeans="Fara estimare, nu stii daca listarea e la piata sau nu - nu te baza doar pe pretul din anunt."
                nextStep="Dacă vrei o opinie de valoare formală, cere o evaluare ANEVAR sau alătură 3-4 anunțuri verificate manual ca reper, pe lângă semnalul de aici."
              />
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
                <div key={a.label} className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50/80 ring-1 ring-slate-100">
                  <div className={`mt-1 w-3 h-3 rounded-full shrink-0 ${a.color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{a.label}</span>
                      <ReportClarityBadge kind={anchorClarity(a.label)} />
                    </div>
                    <div className="font-semibold text-sm">{fmt(a.value, currency)}</div>
                    {a.subLabel && (
                      <div className="text-[10px] text-muted-foreground break-words">{a.subLabel}</div>
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
        {hasNotarial && notarialTotal != null && avmMid != null && (
          <div className="text-xs text-muted-foreground bg-slate-50/80 rounded-lg p-2.5 ring-1 ring-slate-100">
            Valoarea notariala ({fmt(notarialTotal, currency)}) este valoarea minima fiscala
            folosita de notari pentru calculul taxelor. Pretul real de piata este de obicei
            {" "}{Math.round(((avmMid - notarialTotal) / notarialTotal) * 100)}% mai mare.
          </div>
        )}

        {showNotarial && !hasNotarial && (hasAvm || askingPrice != null) && (
          <p className="text-xs text-muted-foreground rounded-lg bg-amber-50/50 p-2.5 ring-1 ring-amber-100/80">
            Grila notariala nu a putut fi afisata (lipsa potrivire zona / mp in baza de date sau analiza
            veche). Re-ruleaza analiza cu adresa si suprafata complete, sau verifica daca sectorul e
            acoperit in grila.
          </p>
        )}

      </CardContent>
    </Card>
  );
}
