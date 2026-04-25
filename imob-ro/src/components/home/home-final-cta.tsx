import Link from "next/link";

import { BuyerReportTrustNote } from "@/components/common/buyer-report-trust-note";
import { getHomeLaunchPricingLineRo } from "@/lib/copy/launch-pricing-ro";

export function HomeFinalCta() {
  const launchLine = getHomeLaunchPricingLineRo();
  return (
    <section className="relative isolate border-t border-gray-100 py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(248,250,252,0.9)_0%,rgba(255,255,255,1)_45%)]"
      />
      <div className="mx-auto max-w-[560px] px-5 text-center">
        <h2 className="text-[26px] font-bold tracking-tight text-gray-950 md:text-[34px]">
          Lipește linkul, vezi previzualizarea, alege dacă vrei raportul complet
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-gray-600 md:text-[16px]">
          O parte din analiză este gratuită. Deblochezi conținutul complet și PDF când e rezonabil
          pentru tine, la prețurile listate.
        </p>
        {launchLine ? (
          <p className="mt-3 text-[14px] leading-relaxed text-gray-500">{launchLine}</p>
        ) : null}
        <Link
          href="/analyze"
          className="mt-9 inline-flex items-center justify-center rounded-full bg-gray-900 px-10 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
        >
          Verifică un anunț
        </Link>
        <ul className="mt-8 flex flex-col gap-2 text-[12px] text-gray-500 sm:mx-auto sm:max-w-md text-left sm:text-center">
          <li>Formular: lipești URL-ul de pe un portal suportat</li>
          <li>Timp până la raport: de regulă zeci de secunde, depinde de sursă</li>
          <li>Structură clară, potrivită cumpărătorului care vrea fapte, nu povești</li>
        </ul>
        <p className="mt-6 text-[12px] text-gray-400">
          Sunt incluse câteva analize gratuite pe lună; apoi fie pachet, fie o singură
          deblocare, după oferta curentă.
        </p>
        <div className="mt-6">
          <BuyerReportTrustNote variant="compact" />
        </div>
      </div>
    </section>
  );
}
