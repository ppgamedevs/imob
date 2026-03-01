"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-[100dvh]">
      <section className="relative overflow-hidden">
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
    const query = (formData.get("q") as string)?.trim();
    if (!query) return;

    try {
      new URL(query);
      window.location.href = `/analyze?url=${encodeURIComponent(query)}`;
    } catch {
      window.location.href = `/analyze?url=${encodeURIComponent(query)}`;
    }
  };

  return (
    <>
      <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
        Analiza imobiliara <span className="text-primary">inteligenta</span>
      </h1>
      <p className="mt-3 text-[15px] md:text-lg text-muted">
        Lipeste un link de anunt si primesti pret estimat, comparabile, viteza vanzarii si risc seismic.
      </p>

      <div className="mx-auto mt-8 max-w-[760px]">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 rounded-2xl border border-border bg-surface shadow-elev2 p-2"
        >
          <input
            name="q"
            placeholder="Lipeste un URL de pe imobiliare.ro..."
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-muted px-3 py-3 focus:outline-none focus:ring-0"
          />
          <button
            type="submit"
            className="rounded-xl px-6 py-3 bg-primary text-white text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all duration-150 shadow-sm hover:shadow-md"
          >
            Analizeaza
          </button>
        </form>
        <p className="mt-3 text-xs text-muted">
          Exemplu:{" "}
          <button
            type="button"
            className="underline hover:no-underline"
            onClick={() => {
              const input = document.querySelector<HTMLInputElement>("input[name=q]");
              if (input) input.value = "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/floreasca/apartament-de-vanzare-2-camere-XY12345";
            }}
          >
            imobiliare.ro/vanzare-apartamente/bucuresti/...
          </button>
        </p>
      </div>
    </>
  );
}

function ValueProps() {
  const items = [
    { t: "Pret estimat", d: "Interval de pret corect bazat pe comparabile din zona." },
    { t: "Viteza la vanzare", d: "Estimare conservatoare in luni, cu interval." },
    { t: "Risc seismic", d: "Indicator orientativ bazat pe anul constructiei." },
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
        Cum functioneaza
      </h2>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <div className="text-2xl font-bold text-primary">1</div>
          <p className="mt-1 text-sm text-muted">Lipeste un link de anunt de pe imobiliare.ro</p>
        </div>
        <div>
          <div className="text-2xl font-bold text-primary">2</div>
          <p className="mt-1 text-sm text-muted">Analizam pretul, comparabilele si zona</p>
        </div>
        <div>
          <div className="text-2xl font-bold text-primary">3</div>
          <p className="mt-1 text-sm text-muted">Primesti raport cu estimare, argumente de negociere si riscuri</p>
        </div>
      </div>
      <div className="mt-8">
        <Link
          href="/analyze"
          className="inline-block rounded-xl px-6 py-3 bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all"
        >
          Incepe analiza gratuita
        </Link>
      </div>
    </section>
  );
}
