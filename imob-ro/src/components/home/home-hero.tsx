"use client";

import { Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { BuyerReportTrustNote } from "@/components/common/buyer-report-trust-note";
import { HeroReportPreview } from "@/components/home/hero-report-preview";
import { postFunnelEvent } from "@/lib/tracking/funnel-client";

const PORTALS = [
  "imobiliare.ro",
  "storia.ro",
  "olx.ro",
  "homezz.ro",
  "publi24.ro",
  "lajumate.ro",
] as const;

const EXAMPLE_URL =
  "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/floreasca/apartament-de-vanzare-2-camere-XY12345";

export function HomeHero() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = inputRef.current?.value?.trim();
    if (!query) return;
    postFunnelEvent({
      eventName: "analyze_form_submit",
      path: "/",
      metadata: { origin: "hero" },
    });
    router.push(`/analyze?url=${encodeURIComponent(query)}`);
  };

  return (
    <section className="relative isolate">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(90%_55%_at_50%_-15%,rgba(30,64,175,.06),transparent_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_40%_at_85%_10%,rgba(15,23,42,.04),transparent_65%)]"
      />

      <div className="mx-auto max-w-[1120px] px-5 pt-20 pb-10 md:pt-28 md:pb-14">
        <div className="mx-auto max-w-[720px] text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gray-200/90 bg-white/90 px-3.5 py-1.5 text-[12px] font-medium text-gray-600 shadow-sm backdrop-blur-sm">
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
              aria-hidden
            />
            Raport pentru cumpărători de apartamente, din linkul anunțului
          </div>

          <h1 className="text-[2.25rem] font-bold leading-[1.08] tracking-[-0.035em] text-gray-950 sm:text-5xl md:text-[3.25rem] md:leading-[1.06]">
            Lipește linkul anunțului.
            <br />
            <span className="text-gradient">
              Vezi cum se poziționează prețul față de piață, înainte să suni agentul.
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-relaxed text-gray-600 md:text-[17px]">
            Primești o previzualizare gratuită, apoi poți debloca restul raportului: semnale de risc,
            timp estimat la vânzare (orientativ), reper de preț față de piață și idei de negociere, pe
            baza datelor disponibile public.
          </p>
          <div className="mx-auto mt-4 max-w-[560px]">
            <BuyerReportTrustNote variant="compact" className="text-center sm:text-left" />
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-[1120px] gap-10 lg:mt-12 lg:grid-cols-[1fr_minmax(280px,360px)] lg:items-start lg:gap-12">
          <div className="min-w-0 lg:pt-1">
            <form
              onSubmit={handleSubmit}
              className="group flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-[0_2px_8px_rgba(15,23,42,.06)] transition-shadow duration-200 focus-within:border-gray-300 focus-within:shadow-[0_4px_24px_rgba(15,23,42,.08)] sm:flex-row sm:items-stretch sm:gap-0 sm:p-2"
            >
              <div className="relative flex min-h-[52px] flex-1 items-center">
                <Link2
                  className="pointer-events-none absolute left-3.5 h-[18px] w-[18px] text-gray-400 sm:left-4"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <input
                  ref={inputRef}
                  name="q"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="Lipește URL-ul unui anunț de pe imobiliare.ro, storia.ro, olx.ro..."
                  className="h-full min-h-[48px] w-full rounded-xl border-0 bg-transparent py-3 pl-11 pr-3 text-[15px] text-gray-900 outline-none ring-0 placeholder:text-gray-400 sm:min-h-0 sm:rounded-l-xl sm:rounded-r-none sm:py-3.5 sm:pl-12"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-gray-900 px-6 py-3.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 active:bg-gray-950 sm:rounded-l-none sm:rounded-r-xl sm:px-8"
              >
                Verifică un anunț
              </button>
            </form>

            <p className="mt-3 text-center text-[12px] text-gray-500 sm:text-left">
              <span className="text-gray-500">Exemplu (poți apăsa pentru a completa câmpul): </span>
              <button
                type="button"
                className="max-w-full break-all text-left font-mono text-[11px] text-gray-600 underline decoration-gray-300 underline-offset-2 transition-colors hover:text-gray-900 hover:decoration-gray-500 sm:text-[12px]"
                onClick={() => {
                  if (inputRef.current) inputRef.current.value = EXAMPLE_URL;
                }}
              >
                {EXAMPLE_URL.replace(/^https:\/\//, "")}
              </button>
            </p>

            <p className="mt-6 text-center text-[11px] leading-relaxed text-gray-500 sm:text-left">
              <span className="font-medium text-gray-600">Surse suportate: </span>
              {PORTALS.join(" · ")}
            </p>
          </div>

          <div className="mx-auto w-full max-w-[360px] lg:mx-0 lg:max-w-none">
            <HeroReportPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
