import { Card, CardContent } from "@/components/ui/card";
import type { DealKiller, ExecutiveVerdict, Verdict } from "@/lib/report/verdict";

interface Props {
  verdict: ExecutiveVerdict;
  priceRange: { low: number; high: number; mid: number } | null;
  askingPrice: number | null;
  currency: string;
  originalPrice?: number;
  originalCurrency?: string;
  hasPlusTVA?: boolean;
  vatRate?: number | null;
  priceWithVAT?: number | null;
  quickTake?: string[];
}

function enrichCommissionText(text: string, price: number | null): string {
  if (!price || price <= 0 || !/comision/i.test(text)) return text;
  const pctMatch = text.match(/(\d+)\s*[-–]\s*(\d+)\s*%/);
  if (!pctMatch) return text;
  const lo = parseInt(pctMatch[1], 10);
  const hi = parseInt(pctMatch[2], 10);
  const eurLo = Math.round(price * (lo / 100));
  const eurHi = Math.round(price * (hi / 100));
  const fmt = (n: number) => n.toLocaleString("ro-RO");
  return `${text} (intre ${fmt(eurLo)} EUR si ${fmt(eurHi)} EUR)`;
}

const VERDICT_CONFIG: Record<
  Verdict,
  { label: string; subtitle: string; bg: string; text: string; ring: string; icon: string }
> = {
  RECOMANDAT: {
    label: "Recomandam",
    subtitle: "Proprietate fara riscuri majore",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
    icon: "✓",
  },
  ATENTIE: {
    label: "Recomandam cu rezerve",
    subtitle: "Exista aspecte de verificat",
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
    icon: "!",
  },
  EVITA: {
    label: "Nu recomandam",
    subtitle: "Riscuri semnificative identificate",
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-200",
    icon: "✕",
  },
};

const SEVERITY_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
  critical: { bg: "bg-red-100", text: "text-red-700", icon: "⛔" },
  warning: { bg: "bg-amber-100", text: "text-amber-700", icon: "⚠" },
  info: { bg: "bg-blue-50", text: "text-blue-700", icon: "ℹ" },
};

function DealKillerPill({ killer, price }: { killer: DealKiller; price: number | null }) {
  const style = SEVERITY_STYLE[killer.severity] ?? SEVERITY_STYLE.info;
  const displayText = enrichCommissionText(killer.text, price);
  return (
    <div
      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${style.bg} ${style.text}`}
    >
      <span className="shrink-0 text-base leading-none mt-0.5">{style.icon}</span>
      <span>{displayText}</span>
    </div>
  );
}

function ConfidenceBar({ score, label }: { score: number; label: string }) {
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Nivel incredere analiza</span>
        <span className="font-medium">
          {label} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PriceRangeCard({
  low,
  high,
  mid,
  askingPrice,
  currency,
  originalPrice,
  originalCurrency,
  hasPlusTVA,
  vatRate,
  priceWithVAT,
}: {
  low: number;
  high: number;
  mid: number;
  askingPrice: number | null;
  currency: string;
  originalPrice?: number;
  originalCurrency?: string;
  hasPlusTVA?: boolean;
  vatRate?: number | null;
  priceWithVAT?: number | null;
}) {
  const fmt = (n: number) => n.toLocaleString("ro-RO");
  const effectivePrice = hasPlusTVA && priceWithVAT ? priceWithVAT : askingPrice;
  const pctFromMid = effectivePrice ? Math.round(((effectivePrice - mid) / mid) * 100) : null;
  const showOriginal = originalPrice && originalCurrency && originalCurrency !== currency;

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Interval pret corect
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold">{fmt(low)}</span>
        <span className="text-muted-foreground mx-1">-</span>
        <span className="text-lg font-bold">{fmt(high)}</span>
        <span className="text-sm text-muted-foreground ml-1">{currency}</span>
      </div>
      {askingPrice != null && pctFromMid != null && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>
            Pret cerut:{" "}
            <span className="font-semibold text-foreground">
              {fmt(askingPrice)} {currency}
            </span>
            {hasPlusTVA && <span className="font-medium text-amber-600 ml-1">+ TVA</span>}
            {showOriginal && (
              <span className="ml-1 text-muted-foreground">
                ({fmt(originalPrice)} {originalCurrency})
              </span>
            )}
          </div>
          {hasPlusTVA && priceWithVAT && vatRate && (
            <div>
              Cu TVA {vatRate}%:{" "}
              <span className="font-semibold text-foreground">
                {fmt(priceWithVAT)} {currency}
              </span>
              {pctFromMid !== 0 && (
                <span
                  className={`ml-1.5 font-medium ${pctFromMid > 0 ? "text-red-600" : "text-emerald-600"}`}
                >
                  ({pctFromMid > 0 ? "+" : ""}
                  {pctFromMid}% fata de medie)
                </span>
              )}
            </div>
          )}
          {(!hasPlusTVA || !priceWithVAT) && pctFromMid !== 0 && (
            <span className={`font-medium ${pctFromMid > 0 ? "text-red-600" : "text-emerald-600"}`}>
              ({pctFromMid > 0 ? "+" : ""}
              {pctFromMid}% fata de medie)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExecutiveSummarySection({
  verdict: v,
  priceRange,
  askingPrice,
  currency,
  originalPrice,
  originalCurrency,
  hasPlusTVA,
  vatRate,
  priceWithVAT,
  quickTake,
}: Props) {
  const cfg = VERDICT_CONFIG[v.verdict];
  const additionalSignals = Math.max(0, v.dealKillers.length - v.highlightedRisks.length);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className={`px-5 py-5 ${cfg.bg} ring-1 ring-inset ${cfg.ring}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div
              className={`flex items-center justify-center h-12 w-12 shrink-0 rounded-full text-xl font-bold ${cfg.bg} ${cfg.text} ring-2 ring-inset ${cfg.ring}`}
            >
              {cfg.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-xl font-bold ${cfg.text}`}>{cfg.label}</div>
              <div className={`text-xs font-medium ${cfg.text} opacity-70 mt-0.5`}>
                {cfg.subtitle}
              </div>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-900">
                {v.headline}
              </p>
            </div>
            <div className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700">
              Incredere {v.confidenceLabel.toLowerCase()} ({v.confidenceScore}%)
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/70 bg-white/80 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Ce trebuie sa stii acum
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-900">{v.mustKnow}</p>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {v.hiddenTruths.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ce nu iti spune anuntul direct
              </div>
              <div className="grid gap-2">
                {v.hiddenTruths.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-lg border bg-muted/20 px-3 py-2 text-sm text-slate-800"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {v.nextChecks.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ce verifici inainte de orice oferta
              </div>
              <div className="grid gap-2">
                {v.nextChecks.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white text-[11px] font-semibold text-blue-700">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {priceRange && (
            <PriceRangeCard
              low={priceRange.low}
              high={priceRange.high}
              mid={priceRange.mid}
              askingPrice={askingPrice}
              currency={currency}
              originalPrice={originalPrice}
              originalCurrency={originalCurrency}
              hasPlusTVA={hasPlusTVA}
              vatRate={vatRate}
              priceWithVAT={priceWithVAT}
            />
          )}

          {v.highlightedRisks.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Semnale prioritare pentru cumparator
              </div>
              <div className="grid gap-1.5">
                {v.highlightedRisks.map((k, i) => (
                  <DealKillerPill key={i} killer={k} price={askingPrice} />
                ))}
              </div>
              {additionalSignals > 0 && (
                <p className="text-xs text-muted-foreground">
                  +{additionalSignals} alte semnale apar detaliate mai jos in raport.
                </p>
              )}
            </div>
          )}

          {quickTake && quickTake.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Repere rapide
              </div>
              <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                {quickTake.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        v.verdict === "RECOMANDAT"
                          ? "bg-emerald-500"
                          : v.verdict === "ATENTIE"
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                    />
                    {b}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="mb-3 text-sm text-muted-foreground">{v.confidenceTone}</p>
            <ConfidenceBar score={v.confidenceScore} label={v.confidenceLabel} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
