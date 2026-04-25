import Link from "next/link";

type Props = {
  className?: string;
};

/**
 * CTA for the demonstrative report: points users to analyze a real listing.
 */
export function ExempluRealListingCta({ className = "" }: Props) {
  return (
    <div
      className={`rounded-lg border border-indigo-200/90 bg-indigo-50/90 px-4 py-3 text-sm text-indigo-950 ${className}`}
    >
      <p className="font-medium">Vrei același tip de analiză pe un anunț real?</p>
      <p className="mt-1.5 text-indigo-900/90">
        Introdu un link de vânzare suportat în ImobIntel și primești un raport pe date reale, nu
        demonstrative.
      </p>
      <div className="mt-3">
        <Link
          href="/analyze"
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Verifică un anunț real
        </Link>
      </div>
    </div>
  );
}
