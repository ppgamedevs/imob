import { Card, CardContent } from "@/components/ui/card";
import type { ExecutiveVerdict, DealKiller, Verdict } from "@/lib/report/verdict";

interface Props {
  verdict: ExecutiveVerdict;
  priceRange: { low: number; high: number; mid: number } | null;
  askingPrice: number | null;
  currency: string;
  analysisId?: string;
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

const VERDICT_CONFIG: Record<Verdict, { label: string; bg: string; text: string; ring: string; icon: string }> = {
  RECOMANDAT: {
    label: "Recomandat",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
    icon: "✓",
  },
  ATENTIE: {
    label: "Atentie",
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
    icon: "!",
  },
  EVITA: {
    label: "Evita",
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
    <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${style.bg} ${style.text}`}>
      <span className="shrink-0 text-base leading-none mt-0.5">{style.icon}</span>
      <span>{displayText}</span>
    </div>
  );
}

function ConfidenceBar({ score, label }: { score: number; label: string }) {
  const pct = Math.max(0, Math.min(100, score));
  const color =
    pct >= 75 ? "bg-emerald-500"
    : pct >= 50 ? "bg-amber-500"
    : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Nivel incredere analiza</span>
        <span className="font-medium">{label} ({pct}%)</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PriceRangeCard({
  low, high, mid, askingPrice, currency,
}: {
  low: number; high: number; mid: number; askingPrice: number | null; currency: string;
}) {
  const fmt = (n: number) => n.toLocaleString("ro-RO");
  const pctFromMid = askingPrice ? Math.round(((askingPrice - mid) / mid) * 100) : null;

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Interval pret corect</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold">{fmt(low)}</span>
        <span className="text-muted-foreground mx-1">—</span>
        <span className="text-lg font-bold">{fmt(high)}</span>
        <span className="text-sm text-muted-foreground ml-1">{currency}</span>
      </div>
      {askingPrice != null && pctFromMid != null && (
        <div className="text-xs text-muted-foreground">
          Pret cerut: <span className="font-semibold text-foreground">{fmt(askingPrice)} {currency}</span>
          {pctFromMid !== 0 && (
            <span className={`ml-1.5 font-medium ${pctFromMid > 0 ? "text-red-600" : "text-emerald-600"}`}>
              ({pctFromMid > 0 ? "+" : ""}{pctFromMid}% fata de medie)
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
}: Props) {
  const cfg = VERDICT_CONFIG[v.verdict];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Verdict banner */}
        <div className={`flex items-center gap-4 px-5 py-4 ${cfg.bg} ring-1 ring-inset ${cfg.ring}`}>
          <div className={`flex items-center justify-center h-12 w-12 rounded-full text-xl font-bold ${cfg.bg} ${cfg.text} ring-2 ring-inset ${cfg.ring}`}>
            {cfg.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-xl font-bold ${cfg.text}`}>{cfg.label}</div>
            {v.summary ? (
              <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{v.summary}</p>
            ) : (
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {v.reasons.map((r, i) => (
                  <span key={i} className={`text-sm ${cfg.text} opacity-80`}>
                    {i > 0 && <span className="mr-1.5 opacity-50">·</span>}
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Price range */}
          {priceRange && (
            <PriceRangeCard
              low={priceRange.low}
              high={priceRange.high}
              mid={priceRange.mid}
              askingPrice={askingPrice}
              currency={currency}
            />
          )}

          {/* Deal killers */}
          {v.dealKillers.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Riscuri identificate</div>
              <div className="grid gap-1.5">
                {v.dealKillers.map((k, i) => (
                  <DealKillerPill key={i} killer={k} price={askingPrice} />
                ))}
              </div>
            </div>
          )}

          {/* Confidence bar */}
          <ConfidenceBar score={v.confidenceScore} label={v.confidenceLabel} />
        </div>
      </CardContent>
    </Card>
  );
}
