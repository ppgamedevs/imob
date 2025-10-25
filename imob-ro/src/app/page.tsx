"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      {/* Hero section with radial gradient */}
      <section
        className="py-16 px-3 text-center"
        style={{
          background: "radial-gradient(circle at 50% 0, rgba(99,102,241,.25), transparent 50%)",
        }}
      >
        <div className="mx-auto max-w-[600px]">
          <h1 className="text-[32px] md:text-[44px] font-bold tracking-tight mb-3">
            Caută, compară și vinde în București
          </h1>
          <p className="text-[color:var(--color-text)]/70 mb-6 text-[15px]">
            Preț estimat, viteza vânzării, zone pe înțelesul tău.
          </p>

          {/* Search bar */}
          <form
            action="/discover"
            method="get"
            className="rounded-xl border border-border bg-surface shadow-elev0 overflow-hidden mb-10"
          >
            <input
              type="text"
              name="q"
              placeholder="ex: Floreasca, București..."
              className="w-full px-4 py-3 text-[15px] bg-transparent border-0 outline-none focus:ring-2 focus:ring-primary"
            />
          </form>

          {/* Value prop cards */}
          <div className="grid gap-4 md:grid-cols-3 text-left">
            <div className="rounded-xl border border-border bg-surface shadow-elev0 p-4">
              <div className="text-[13px] text-[color:var(--color-text)]/60 mb-1">Preț estimat</div>
              <div className="text-[15px] font-medium">Află cât valorează orice proprietate</div>
            </div>
            <div className="rounded-xl border border-border bg-surface shadow-elev0 p-4">
              <div className="text-[13px] text-[color:var(--color-text)]/60 mb-1">
                Viteza vânzării
              </div>
              <div className="text-[15px] font-medium">Estimăm în câte zile se vinde</div>
            </div>
            <div className="rounded-xl border border-border bg-surface shadow-elev0 p-4">
              <div className="text-[13px] text-[color:var(--color-text)]/60 mb-1">Randament</div>
              <div className="text-[15px] font-medium">Vedem ce zonă îți aduce profit</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTAs */}
      <section className="py-10 px-3 text-center">
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/discover"
            className="rounded-lg px-5 py-2.5 text-sm bg-primary text-primaryFg hover:bg-primary/90 transition-colors focus-ring"
          >
            Începe căutarea
          </Link>
          <Link
            href="/owners"
            className="rounded-lg px-5 py-2.5 text-sm border border-border hover:bg-surface transition-colors focus-ring"
          >
            Estimează-ți proprietatea
          </Link>
        </div>
      </section>

      {/* Secondary SEO section (keep existing content if valuable) */}
      <section className="py-12 px-3 text-center max-w-[800px] mx-auto">
        <h2 className="text-[24px] font-semibold mb-4">
          Датеle tale imobiliare, la un click distanță
        </h2>
        <p className="text-[15px] text-[color:var(--color-text)]/70 leading-relaxed">
          Analizăm mii de anunțuri în timp real ca să îți oferim estimări precise de preț, timp de
          vânzare și potențial de investiție. Fie că ești cumpărător, proprietar sau agent, ai acces
          la informația de care ai nevoie pentru decizii inteligente.
        </p>
      </section>
    </div>
  );
}
