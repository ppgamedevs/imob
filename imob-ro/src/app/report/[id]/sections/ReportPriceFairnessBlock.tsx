import type { PriceVerdictPill } from "@/lib/report/price-verdict-badge";
import { formatDeltaAsPercent } from "@/lib/report/price-verdict-badge";

const TONE_CLASSES: Record<
  PriceVerdictPill["tone"],
  { pill: string; estimateBox: string; estimateLabel: string; estimateAccent: string }
> = {
  green: {
    pill: "border-emerald-200/90 bg-emerald-50 text-emerald-950",
    estimateBox: "bg-emerald-50/60 ring-emerald-100/80",
    estimateLabel: "text-emerald-800/80",
    estimateAccent: "text-emerald-900",
  },
  yellow: {
    pill: "border-amber-200/90 bg-amber-50 text-amber-950",
    estimateBox: "bg-amber-50/50 ring-amber-100/70",
    estimateLabel: "text-amber-900/80",
    estimateAccent: "text-amber-950",
  },
  red: {
    pill: "border-rose-200/90 bg-rose-50 text-rose-950",
    estimateBox: "bg-rose-50/50 ring-rose-100/80",
    estimateLabel: "text-rose-900/80",
    estimateAccent: "text-rose-950",
  },
};

export interface ReportPriceFairnessBlockProps {
  verdict: PriceVerdictPill;
  listedPrice: number;
  estimatedMid: number;
  currency: string;
  hasPlusTVA?: boolean;
  /** Shown under EUR list price (e.g. original RON) */
  listedExtraLine?: string | null;
}

/**
 * Homepage-style price grid + verdict pill (hero-report-preview parity).
 */
export default function ReportPriceFairnessBlock({
  verdict,
  listedPrice,
  estimatedMid,
  currency,
  hasPlusTVA,
  listedExtraLine,
}: ReportPriceFairnessBlockProps) {
  const tone = TONE_CLASSES[verdict.tone];
  const listedFmt = `${listedPrice.toLocaleString("ro-RO")} ${currency}${hasPlusTVA ? " + TVA" : ""}`;
  const estFmt = `${Math.round(estimatedMid).toLocaleString("ro-RO")} ${currency}`;
  const deltaPctLabel = formatDeltaAsPercent(verdict.delta);

  return (
    <section
      className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,.04),0_12px_40px_-12px_rgba(15,23,42,.08)] ring-1 ring-black/[0.03]"
      aria-label="Verdict pret fata de estimare"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
        Raport pret vs estimare
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-gray-50/80 px-3.5 py-3 ring-1 ring-inset ring-gray-100">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Preț listat</p>
          <p className="mt-0.5 text-[20px] font-semibold tabular-nums tracking-tight text-gray-900">
            {listedFmt}
          </p>
          {listedExtraLine ? (
            <p className="mt-1 text-[11px] text-gray-500 tabular-nums">{listedExtraLine}</p>
          ) : null}
        </div>
        <div className={`rounded-xl px-3.5 py-3 ring-1 ring-inset ${tone.estimateBox}`}>
          <p className={`text-[11px] font-medium uppercase tracking-wide ${tone.estimateLabel}`}>
            Estimare echitabilă
          </p>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-2">
            <span
              className={`text-[20px] font-semibold tabular-nums tracking-tight ${tone.estimateAccent}`}
            >
              {estFmt}
            </span>
            <span
              className={`text-[13px] font-semibold tabular-nums ${
                verdict.delta >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
              title="(estimare − preț listat) / preț listat"
            >
              {deltaPctLabel}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <span
          className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-[12px] font-semibold ${tone.pill}`}
        >
          {verdict.label}
        </span>
        <p className="text-[13px] leading-snug text-gray-600 sm:max-w-xl">{verdict.explanation}</p>
      </div>
    </section>
  );
}
