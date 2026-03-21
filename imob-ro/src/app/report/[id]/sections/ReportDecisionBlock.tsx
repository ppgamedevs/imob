import type { ExecutiveVerdict, Verdict } from "@/lib/report/verdict";

const VERDICT_PHRASE: Record<
  Verdict,
  { title: string; ring: string; bg: string; accent: string; pill: string }
> = {
  RECOMANDAT: {
    title: "Alegere rezonabila",
    ring: "ring-emerald-300/60",
    bg: "from-emerald-50 via-white to-white",
    accent: "text-emerald-950",
    pill: "bg-emerald-100 text-emerald-900 ring-emerald-200/80",
  },
  ATENTIE: {
    title: "Merita atentie sporita",
    ring: "ring-amber-300/60",
    bg: "from-amber-50 via-white to-white",
    accent: "text-amber-950",
    pill: "bg-amber-100 text-amber-950 ring-amber-200/80",
  },
  EVITA: {
    title: "Riscuri semnificative",
    ring: "ring-red-300/60",
    bg: "from-red-50 via-white to-white",
    accent: "text-red-950",
    pill: "bg-red-100 text-red-950 ring-red-200/80",
  },
};

function truncateExplanation(raw: string, maxChars: number): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length <= maxChars) return t;
  const cut = t.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

export interface ReportDecisionBlockProps {
  verdict: ExecutiveVerdict;
  propertyTitle: string | null;
  /** Listed asking price in listing currency */
  askingPrice: number | null;
  currency: string;
  /** e.g. RON->EUR hint line */
  priceSecondaryLine?: string | null;
  hasPlusTVA?: boolean;
  priceTrustLine: string;
  riskImpactLine: string;
}

export default function ReportDecisionBlock({
  verdict: v,
  propertyTitle,
  askingPrice,
  currency,
  priceSecondaryLine,
  hasPlusTVA,
  priceTrustLine,
  riskImpactLine,
}: ReportDecisionBlockProps) {
  const cfg = VERDICT_PHRASE[v.verdict];
  const headline = v.headline?.trim() || cfg.title;
  const explanationSource = v.summary?.trim() || v.mustKnow?.trim() || "";
  const explanation = explanationSource ? truncateExplanation(explanationSource, 220) : null;

  const priceMain =
    askingPrice != null && askingPrice > 0
      ? `${askingPrice.toLocaleString("ro-RO")} ${currency}`
      : "Pret indisponibil in date";

  return (
    <section
      className={`relative h-full overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-br ${cfg.bg} p-6 shadow-lg shadow-gray-200/30 ring-2 ${cfg.ring} md:p-8`}
      aria-label="Rezumat decizie"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/40 blur-2xl" aria-hidden />

      {propertyTitle ? (
        <p className="relative mb-5 line-clamp-1 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 md:text-left">
          {propertyTitle}
        </p>
      ) : null}

      <div className="relative space-y-6">
        <header>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Verdict</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ${cfg.pill}`}
            >
              {cfg.title}
            </span>
          </div>
          <h2
            className={`mt-3 text-[1.65rem] font-extrabold leading-[1.15] tracking-tight text-gray-950 md:text-4xl md:leading-[1.1] ${cfg.accent}`}
          >
            {headline}
          </h2>
          {explanation ? (
            <p className="mt-3 max-w-prose text-[15px] leading-snug text-gray-700 line-clamp-2 md:text-base">
              {explanation}
            </p>
          ) : null}
        </header>

        <div className="rounded-xl border border-gray-200/90 bg-white/85 p-4 shadow-sm backdrop-blur-sm md:p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">Pret listat</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-gray-950 md:text-3xl">
            {priceMain}
            {hasPlusTVA ? (
              <span className="ml-2 align-middle text-sm font-bold text-amber-700">+ TVA</span>
            ) : null}
          </p>
          {priceSecondaryLine ? (
            <p className="mt-1 text-sm text-gray-600">{priceSecondaryLine}</p>
          ) : null}
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
              Validare pret
            </p>
            <p className="mt-1.5 text-[14px] font-medium leading-snug text-gray-800">{priceTrustLine}</p>
          </div>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200/70 bg-white/60 px-4 py-3">
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Impact</dt>
            <dd className="mt-1 text-[14px] font-semibold leading-snug text-gray-900">{riskImpactLine}</dd>
          </div>
          <div className="rounded-lg border border-gray-200/70 bg-white/60 px-4 py-3 flex flex-col justify-center">
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
              Incredere analiza
            </dt>
            <dd className="mt-1.5">
              <span className="inline-flex items-center rounded-full bg-gray-900 px-3 py-1 text-[12px] font-semibold text-white">
                {v.confidenceLabel} · {v.confidenceScore}%
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
