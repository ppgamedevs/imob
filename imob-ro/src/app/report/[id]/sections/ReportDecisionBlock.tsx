import type { ExecutiveVerdict, Verdict } from "@/lib/report/verdict";

const VERDICT_ACCENT: Record<Verdict, { headline: string }> = {
  RECOMANDAT: { headline: "text-emerald-900" },
  ATENTIE: { headline: "text-amber-950" },
  EVITA: { headline: "text-red-950" },
};

export interface ReportDecisionBlockProps {
  verdict: ExecutiveVerdict;
  propertyTitle: string | null;
  askingPrice: number | null;
  currency: string;
  priceSecondaryLine?: string | null;
  hasPlusTVA?: boolean;
  priceTrustLine: string;
  riskImpactLine: string;
  /** Plain-language why confidence is what it is (not % alone). */
  confidenceNarrative: string;
}

/**
 * Compact decision header: one-line verdict + clarity / impact / confidence.
 * No long paragraphs; listed price is a single factual line only.
 */
export default function ReportDecisionBlock({
  verdict: v,
  propertyTitle,
  askingPrice,
  currency,
  priceSecondaryLine,
  hasPlusTVA,
  priceTrustLine,
  riskImpactLine,
  confidenceNarrative,
}: ReportDecisionBlockProps) {
  const accent = VERDICT_ACCENT[v.verdict];
  const verdictLine = v.headline?.trim() || v.summary?.trim()?.split(/[.!?]\s/)[0]?.trim() || "Verifica detaliile inainte de oferta.";

  const listing =
    askingPrice != null && askingPrice > 0
      ? `${askingPrice.toLocaleString("ro-RO")} ${currency}${hasPlusTVA ? " + TVA" : ""}`
      : null;

  return (
    <section
      className="rounded-2xl bg-white px-5 py-6 md:px-8 md:py-7 shadow-sm ring-1 ring-slate-200/90"
      aria-label="Decizie"
    >
      {propertyTitle ? (
        <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 md:text-left break-words">
          {propertyTitle}
        </p>
      ) : null}

      <h2
        className={`text-[1.375rem] font-bold leading-snug tracking-tight md:text-2xl md:leading-tight ${accent.headline}`}
      >
        {verdictLine}
      </h2>

      {listing ? (
        <p className="mt-3 text-sm text-slate-500">
          Listat: <span className="font-semibold text-slate-800 tabular-nums">{listing}</span>
          {priceSecondaryLine ? (
            <span className="block mt-1 text-slate-500 font-normal">{priceSecondaryLine}</span>
          ) : null}
        </p>
      ) : null}

      <dl className="mt-6 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-3 sm:gap-6">
        <div className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Claritate pret
          </dt>
          <dd className="mt-1.5 text-[13px] font-medium leading-snug text-slate-800 break-words">
            {priceTrustLine}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Impact</dt>
          <dd className="mt-1.5 text-[13px] font-semibold leading-snug text-slate-900 break-words">
            {riskImpactLine}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Incredere</dt>
          <dd className="mt-1.5 space-y-1">
            <p className="text-[13px] font-medium leading-snug text-slate-800">{confidenceNarrative}</p>
            <p className="text-[11px] text-slate-500">
              Scor intern: {v.confidenceLabel} ({v.confidenceScore}%)
            </p>
          </dd>
        </div>
      </dl>
    </section>
  );
}
