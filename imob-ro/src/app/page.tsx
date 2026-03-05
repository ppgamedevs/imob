"use client";

import {
  BarChart3,
  Clock,
  FileText,
  MapPin,
  MessageSquare,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HomePage() {
  return (
    <main className="overflow-hidden">
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <CtaSection />
    </main>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = (formData.get("q") as string)?.trim();
    if (!query) return;
    router.push(`/analyze?url=${encodeURIComponent(query)}`);
  };

  return (
    <section className="relative isolate">
      {/* Gradient mesh background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10
          bg-[radial-gradient(80%_50%_at_50%_-10%,rgba(37,99,235,.12),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10
          bg-[radial-gradient(40%_40%_at_70%_20%,rgba(124,58,237,.08),transparent_70%)]"
      />

      <div className="mx-auto max-w-[980px] px-5 pt-24 pb-6 md:pt-36 md:pb-10 text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[13px] font-medium text-gray-600 shadow-sm animate-fade-up">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
          Platforma de analiza imobiliara #1 din Romania
        </div>

        {/* Headline */}
        <h1 className="text-[40px] leading-[1.1] md:text-[72px] md:leading-[1.05] font-extrabold tracking-[-0.04em] text-gray-950 animate-fade-up [animation-delay:100ms]">
          Analiza imobiliara
          <br />
          <span className="text-gradient">pentru cumparatori si investitori inteligenti</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-5 max-w-[600px] text-[17px] md:text-[19px] leading-relaxed text-gray-500 animate-fade-up [animation-delay:200ms]">
          Lipeste un link de anunt si primesti pret estimat, comparabile,
          viteza de vanzare si risc seismic - totul in cateva secunde.
        </p>

        {/* Search bar */}
        <div className="mx-auto mt-10 max-w-[680px] animate-fade-up [animation-delay:300ms]">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg shadow-gray-200/60 transition-shadow duration-300 focus-within:shadow-xl focus-within:shadow-blue-100/40"
          >
            <input
              name="q"
              placeholder="Lipeste un URL de pe imobiliare.ro, storia.ro, olx.ro, homezz.ro..."
              className="flex-1 bg-transparent text-[15px] text-gray-900 placeholder:text-gray-400 px-4 py-3.5 outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-7 py-3.5 text-[14px] font-semibold text-white shadow-sm hover:shadow-md hover:brightness-110 active:scale-[0.97] transition-all duration-200"
            >
              Analizeaza
            </button>
          </form>

          <p className="mt-3 text-[13px] text-gray-400">
            Exemplu:{" "}
            <button
              type="button"
              className="text-gray-500 underline decoration-gray-300 underline-offset-2 hover:text-gray-700 hover:decoration-gray-400 transition-colors"
              onClick={() => {
                const input = document.querySelector<HTMLInputElement>("input[name=q]");
                if (input) input.value = "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/floreasca/apartament-de-vanzare-2-camere-XY12345";
              }}
            >
              imobiliare.ro/vanzare-apartamente/bucuresti/floreasca/apartament-de-vanzare-2-camere-XY12345
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- Social Proof ---------- */

const stats = [
  { value: "10,000+", label: "Analize efectuate" },
  { value: "500+", label: "Zone acoperite" },
  { value: "95%", label: "Precizie estimari" },
];

function SocialProof() {
  return (
    <section className="border-y border-gray-100 bg-gray-50/60">
      <div className="mx-auto flex max-w-[980px] flex-col md:flex-row items-center justify-center divide-y md:divide-y-0 md:divide-x divide-gray-200 px-5 py-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1 px-12 py-4 md:py-0"
          >
            <span className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              {s.value}
            </span>
            <span className="text-[13px] font-medium text-gray-500">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Features ---------- */

const features = [
  {
    icon: BarChart3,
    title: "Pret estimat AVM",
    description: "Interval de pret corect bazat pe algoritmul nostru de evaluare automata.",
    color: "text-blue-600 bg-blue-50",
  },
  {
    icon: Clock,
    title: "Viteza la vanzare",
    description: "Estimare conservatoare in luni, cu interval de incredere.",
    color: "text-blue-600 bg-blue-50",
  },
  {
    icon: Shield,
    title: "Risc seismic",
    description: "Indicator orientativ bazat pe anul constructiei si zona.",
    color: "text-amber-600 bg-amber-50",
  },
  {
    icon: MapPin,
    title: "Comparabile din zona",
    description: "Vezi apartamente similare vandute recent in aceeasi zona.",
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    icon: FileText,
    title: "Raport complet",
    description: "Document detaliat cu toate datele intr-un format clar.",
    color: "text-rose-600 bg-rose-50",
  },
  {
    icon: MessageSquare,
    title: "Argumente de negociere",
    description: "Puncte concrete pe care le poti folosi in negocierea pretului.",
    color: "text-cyan-600 bg-cyan-50",
  },
];

function Features() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-[1100px] px-5">
        <div className="text-center">
          <h2 className="text-[28px] md:text-[40px] font-bold tracking-tight text-gray-950">
            Tot ce ai nevoie intr-un singur raport
          </h2>
          <p className="mt-3 text-[16px] md:text-[18px] text-gray-500 max-w-[520px] mx-auto">
            Analiza completa pentru orice anunt de pe imobiliare.ro, storia.ro, olx.ro, publi24.ro, lajumate.ro sau homezz.ro.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-100/80 hover:border-gray-200"
              >
                <div className={`inline-flex items-center justify-center rounded-xl p-2.5 ${f.color}`}>
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="mt-4 text-[16px] font-semibold text-gray-900">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-gray-500">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- How It Works ---------- */

const steps = [
  {
    num: "1",
    title: "Lipeste un link",
    description: "Copiaza URL-ul unui anunt de pe imobiliare.ro, storia.ro, olx.ro, publi24.ro, lajumate.ro sau homezz.ro.",
  },
  {
    num: "2",
    title: "Analizam datele",
    description: "Extragem informatiile, comparam cu proprietati similare si calculam valorile.",
  },
  {
    num: "3",
    title: "Primesti raportul",
    description: "Raport complet cu pret estimat, comparabile, viteza vanzarii si riscuri.",
  },
];

function HowItWorks() {
  return (
    <section className="border-t border-gray-100 bg-gray-50/40 py-24 md:py-32">
      <div className="mx-auto max-w-[980px] px-5">
        <div className="text-center">
          <h2 className="text-[28px] md:text-[40px] font-bold tracking-tight text-gray-950">
            Cum functioneaza
          </h2>
          <p className="mt-3 text-[16px] md:text-[18px] text-gray-500">
            Trei pasi simpli pana la o decizie informata.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6 relative">
          {/* Connecting line (desktop) */}
          <div
            aria-hidden
            className="hidden md:block absolute top-8 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200"
          />

          {steps.map((s) => (
            <div key={s.num} className="relative text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-[20px] font-bold text-white shadow-lg shadow-blue-200/50">
                {s.num}
              </div>
              <h3 className="mt-5 text-[17px] font-semibold text-gray-900">
                {s.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-gray-500 max-w-[280px] mx-auto">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- CTA ---------- */

function CtaSection() {
  return (
    <section className="relative isolate py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-blue-600/[0.04] via-blue-500/[0.06] to-blue-600/[0.03]"
      />

      <div className="mx-auto max-w-[600px] px-5 text-center">
        <h2 className="text-[28px] md:text-[40px] font-bold tracking-tight text-gray-950">
          Incepe prima analiza gratuita
        </h2>
        <p className="mt-4 text-[16px] md:text-[18px] text-gray-500">
          Nu necesita card. Rezultate in 30 de secunde.
        </p>
        <Link
          href="/analyze"
          className="mt-8 inline-flex items-center rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-3.5 text-[15px] font-semibold text-white shadow-md shadow-blue-200/50 hover:shadow-lg hover:shadow-blue-200/60 hover:brightness-110 active:scale-[0.97] transition-all duration-200"
        >
          Analizeaza un anunt
        </Link>
        <p className="mt-4 text-[13px] text-gray-400">
          10 cautari gratuite pe luna. Fara obligatii.
        </p>
      </div>
    </section>
  );
}
