import Link from "next/link";

export function HomeFinalCta() {
  return (
    <section className="relative isolate border-t border-gray-100 py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(248,250,252,0.9)_0%,rgba(255,255,255,1)_45%)]"
      />
      <div className="mx-auto max-w-[560px] px-5 text-center">
        <h2 className="text-[26px] font-bold tracking-tight text-gray-950 md:text-[34px]">
          Verifică un anunț înainte să plătești prea mult
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-gray-600 md:text-[16px]">
          Lipește linkul și primești un raport clar, construit pentru cumpărători și investitori
          care vor decizii explicabile.
        </p>
        <Link
          href="/analyze"
          className="mt-9 inline-flex items-center justify-center rounded-full bg-gray-900 px-10 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
        >
          Deschide analiza
        </Link>
        <ul className="mt-8 flex flex-col gap-2 text-[12px] text-gray-500 sm:mx-auto sm:max-w-md">
          <li>Fără card pentru prima analiză</li>
          <li>Rezultate în zeci de secunde, în funcție de sursă</li>
          <li>Clar, structurat, ușor de urmărit</li>
        </ul>
        <p className="mt-6 text-[12px] text-gray-400">
          10 căutări gratuite pe lună. Fără obligații.
        </p>
      </div>
    </section>
  );
}
