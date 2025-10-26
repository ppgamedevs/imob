"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-[100dvh]">
      <section className="relative overflow-hidden">
        {/* backdrop gradient */}
        <div
          className="pointer-events-none absolute inset-0
          bg-[radial-gradient(90%_60%_at_50%_0%,rgba(99,102,241,.25),transparent)]
          md:bg-[radial-gradient(70%_60%_at_50%_-20%,rgba(99,102,241,.28),transparent)]"
        />
        <div className="mx-auto max-w-[1040px] px-4 pt-16 md:pt-24 pb-8 text-center relative">
          <Hero />
          <ValueProps />
        </div>
      </section>
      <BelowFold />
    </main>
  );
}

function Hero() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("q") as string;

    if (!query) return;

    // Check if query is a URL
    try {
      new URL(query);
      // It's a valid URL - redirect to analyze page
      window.location.href = `/analyze?url=${encodeURIComponent(query)}`;
    } catch {
      // Not a URL - normal search in discover
      window.location.href = `/discover?q=${encodeURIComponent(query)}`;
    }
  };

  return (
    <>
      <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
        Caută, compară și vinde în <span className="text-primary">București</span>
      </h1>
      <p className="mt-3 text-[15px] md:text-lg text-muted">
        Preț real de piață, viteza vânzării, randament și risc seismic — pe înțelesul tău.
      </p>

      {/* search card */}
      <div className="mx-auto mt-8 max-w-[760px]">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 rounded-2xl border border-border bg-surface shadow-elev2 p-2"
        >
          <input
            name="q"
            placeholder="ex: Floreasca, Crângași sau lipește un URL de anunț…"
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-muted px-3 py-3"
          />
          <button className="rounded-xl px-4 py-3 bg-primary text-primaryFg text-sm font-medium hover:opacity-95 transition-opacity">
            Caută
          </button>
        </form>
        <div className="mt-3 text-xs text-muted">
          Sau{" "}
          <Link className="underline hover:no-underline" href="/owners">
            estimează-ți proprietatea
          </Link>
        </div>
      </div>
    </>
  );
}

function ValueProps() {
  const items = [
    { t: "Preț estimat", d: "AVM cu interval și comparații din zonă." },
    { t: "Viteză la vânzare", d: "Estimăm în câte zile se vinde." },
    { t: "Randament", d: "Chirie estimată și randament net." },
  ];
  return (
    <div className="mx-auto mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[1000px]">
      {items.map((x) => (
        <div
          key={x.t}
          className="rounded-2xl border border-border bg-surface/90 shadow-elev1 p-5 text-left"
        >
          <div className="text-sm font-semibold text-text">{x.t}</div>
          <div className="mt-1.5 text-sm text-muted">{x.d}</div>
        </div>
      ))}
    </div>
  );
}

function BelowFold() {
  return (
    <section className="mx-auto max-w-[1040px] px-4 py-14">
      <h2 className="text-xl font-semibold text-text">
        Datele tale imobiliare, la un click distanță
      </h2>
      <p className="mt-2 text-sm text-muted max-w-[780px]">
        Analizăm mii de anunțuri în timp real pentru a-ți arăta prețul corect, timpul de vânzare,
        randamentul și riscul seismic.
      </p>
    </section>
  );
}
