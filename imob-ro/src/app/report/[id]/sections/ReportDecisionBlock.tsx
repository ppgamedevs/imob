import type { ExecutiveVerdict, Verdict } from "@/lib/report/verdict";

import { cn } from "@/lib/utils";

const VERDICT_ACCENT: Record<Verdict, { headline: string }> = {
  RECOMANDAT: { headline: "text-emerald-900" },
  ATENTIE: { headline: "text-amber-950" },
  EVITA: { headline: "text-red-950" },
};

const SELLER_BADGE: Record<string, { emoji: string; label: string; className: string }> = {
  agentie: {
    emoji: "🏢",
    label: "Agenție",
    className: "bg-violet-50 text-violet-900 ring-violet-200/80",
  },
  proprietar: {
    emoji: "👤",
    label: "Proprietar",
    className: "bg-sky-50 text-sky-900 ring-sky-200/80",
  },
  dezvoltator: {
    emoji: "🏗",
    label: "Dezvoltator",
    className: "bg-amber-50 text-amber-950 ring-amber-200/80",
  },
};

const PRICE_BADGE_TONE: Record<string, string> = {
  Subevaluat: "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
  Corect: "bg-slate-100 text-slate-800 ring-slate-200/80",
  Supraevaluat: "bg-rose-50 text-rose-900 ring-rose-200/80",
};

function normalizePriceBadge(raw: string | null | undefined): string {
  if (!raw) return "";
  const t = raw.trim();
  if (/subevaluat/i.test(t) && !/ușor|usor/i.test(t)) return "Subevaluat";
  if (/supraevaluat/i.test(t) && !/ușor|usor/i.test(t)) return "Supraevaluat";
  if (/ușor|usor/i.test(t) && /sub/i.test(t)) return "Subevaluat";
  if (/ușor|usor/i.test(t) && /supra/i.test(t)) return "Supraevaluat";
  if (/corect/i.test(t)) return "Corect";
  return t.length > 18 ? t.slice(0, 17) + "…" : t;
}

export interface ReportDecisionBlockProps {
  verdict: ExecutiveVerdict;
  /** Main line: e.g. zone + typology */
  propertyTitle: string | null;
  askingPrice: number | null;
  currency: string;
  priceSecondaryLine?: string | null;
  hasPlusTVA?: boolean;
  /** EUR/m² for listing (same currency as asking) */
  eurPerM2?: number | null;
  areaM2?: number | null;
  sellerType?: string | null;
  /** From price fairness pill label */
  pricePositionLabel?: string | null;
}

/**
 * Decision header: left = title + verdict line; right = price block + badges.
 */
export default function ReportDecisionBlock({
  verdict: v,
  propertyTitle,
  askingPrice,
  currency,
  priceSecondaryLine,
  hasPlusTVA,
  eurPerM2,
  areaM2,
  sellerType,
  pricePositionLabel,
}: ReportDecisionBlockProps) {
  const accent = VERDICT_ACCENT[v.verdict];
  const verdictLine =
    v.headline?.trim() ||
    v.summary?.trim()?.split(/[.!?]\s/)[0]?.trim() ||
    "Evaluare disponibilă în raport.";

  const listing =
    askingPrice != null && askingPrice > 0
      ? `${askingPrice.toLocaleString("ro-RO")} ${currency}${hasPlusTVA ? " + TVA" : ""}`
      : null;

  const sellerKey = (sellerType ?? "").toLowerCase();
  const seller = SELLER_BADGE[sellerKey];

  const badgeShort = normalizePriceBadge(pricePositionLabel);
  const badgeCls =
    PRICE_BADGE_TONE[badgeShort] ?? "bg-slate-100 text-slate-800 ring-slate-200/80";

  return (
    <section
      className="rounded-2xl bg-white px-5 py-6 md:px-8 md:py-7 shadow-sm ring-1 ring-slate-200/90"
      aria-label="Decizie"
    >
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
        <div className="min-w-0 flex-1">
          {propertyTitle ? (
            <h1 className="text-lg font-semibold leading-snug tracking-tight text-slate-900 md:text-xl break-words">
              {propertyTitle}
            </h1>
          ) : null}
          <p
            className={cn(
              "mt-3 text-[1.05rem] font-semibold leading-snug md:text-lg line-clamp-2",
              accent.headline,
            )}
          >
            {verdictLine}
          </p>
        </div>

        <div className="shrink-0 lg:max-w-[min(100%,20rem)] lg:text-right">
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {seller ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                  seller.className,
                )}
              >
                <span aria-hidden>{seller.emoji}</span>
                {seller.label}
              </span>
            ) : null}
          </div>

          {listing ? (
            <>
              <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-slate-900 md:text-4xl">
                {listing}
              </p>
              {priceSecondaryLine ? (
                <p className="mt-1 text-xs text-slate-500">{priceSecondaryLine}</p>
              ) : null}
              <div className="mt-2 space-y-0.5 text-sm text-slate-600 lg:text-right">
                {eurPerM2 != null && eurPerM2 > 0 ? (
                  <p className="tabular-nums font-medium text-slate-800">
                    {eurPerM2.toLocaleString("ro-RO")} EUR/m²
                  </p>
                ) : null}
                {areaM2 != null && areaM2 > 0 ? (
                  <p className="text-slate-500">{areaM2} m² utili</p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Preț indisponibil în anunț.</p>
          )}

          {badgeShort ? (
            <span
              className={cn(
                "mt-4 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1",
                badgeCls,
              )}
            >
              {badgeShort}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
