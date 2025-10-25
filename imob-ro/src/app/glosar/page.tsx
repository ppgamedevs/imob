import { ArrowLeftIcon, BookOpenIcon } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

import { Surface } from "@/components/ui/Surface";
import { ro } from "@/i18n/ro";

export const metadata: Metadata = {
  title: "Glosar — Termeni Imobiliari",
  description:
    "Explicații clare pentru termeni tehnici: AVM, Time to Sell, €/m², Randament, Risc Seismic și mai multe.",
  openGraph: {
    title: "Glosar — Termeni Imobiliari",
    description: "Explicații clare pentru termeni tehnici folosiți în evaluările imobiliare",
  },
};

const glossaryTerms = [
  { id: "avm", title: "AVM (Automated Valuation Model)" },
  { id: "tts", title: "TTS (Time to Sell)" },
  { id: "eurm2", title: "€/m² (Euro pe metru pătrat)" },
  { id: "yield", title: "Randament net" },
  { id: "seismic", title: "Risc seismic" },
  { id: "confidence", title: "Încredere în estimare" },
  { id: "comparable", title: "Proprietăți comparabile" },
] as const;

export default function GlossaryPage() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] mb-4 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {ro.common.back}
        </Link>

        <div className="flex items-start gap-4">
          <div className="p-3 bg-[rgb(var(--surface))] rounded-[var(--r-md)] border border-[rgb(var(--border))]">
            <BookOpenIcon className="w-6 h-6 text-[rgb(var(--primary))]" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-[rgb(var(--text))] mb-2">Glosar de termeni</h1>
            <p className="text-lg text-[rgb(var(--muted))]">
              Explicații clare pentru termenii tehnici pe care îi folosim în rapoarte
            </p>
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <Surface elevation={1} rounded="md" className="mb-8 p-6">
        <h2 className="text-sm font-semibold text-[rgb(var(--muted))] uppercase tracking-wide mb-4">
          Pe această pagină
        </h2>
        <nav>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {glossaryTerms.map((term) => (
              <li key={term.id}>
                <a
                  href={`#${term.id}`}
                  className="text-[rgb(var(--primary))] hover:underline text-sm"
                >
                  {term.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </Surface>

      {/* Glossary Terms */}
      <div className="space-y-8">
        {glossaryTerms.map((term) => {
          const definition = ro.glossary[term.id as keyof typeof ro.glossary];
          return (
            <Surface
              key={term.id}
              id={term.id}
              elevation={1}
              rounded="md"
              className="p-6 scroll-mt-8"
            >
              <h2 className="text-2xl font-bold text-[rgb(var(--text))] mb-3">{term.title}</h2>
              <p className="text-base text-[rgb(var(--text))] leading-relaxed mb-4">
                {definition.full}
              </p>

              {/* Context-specific examples */}
              {term.id === "avm" && (
                <div className="mt-4 p-4 bg-[rgb(var(--surface-2))] rounded-[var(--r-sm)] border-l-4 border-[rgb(var(--primary))]">
                  <p className="text-sm text-[rgb(var(--muted))]">
                    <strong className="text-[rgb(var(--text))]">Exemplu:</strong> Pentru un
                    apartament 2 camere în Militari, analizăm 50+ tranzacții din ultimele 6 luni și
                    200+ anunțuri active pentru a calcula intervalul 78.000–84.000 EUR.
                  </p>
                </div>
              )}

              {term.id === "tts" && (
                <div className="mt-4 p-4 bg-[rgb(var(--surface-2))] rounded-[var(--r-sm)] border-l-4 border-[rgb(var(--success))]">
                  <p className="text-sm text-[rgb(var(--muted))]">
                    <strong className="text-[rgb(var(--text))]">Exemplu:</strong> Un apartament
                    listat la 90.000 EUR (preț median 85.000 EUR în zonă) are TTS estimat 90–120
                    zile. Dacă scazi la 85.000 EUR, TTS scade la 30–45 zile.
                  </p>
                </div>
              )}

              {term.id === "yield" && (
                <div className="mt-4 p-4 bg-[rgb(var(--surface-2))] rounded-[var(--r-sm)] border-l-4 border-[rgb(var(--warn))]">
                  <p className="text-sm text-[rgb(var(--muted))]">
                    <strong className="text-[rgb(var(--text))]">Calculul:</strong> Preț 100.000 EUR,
                    chirie 600 EUR/lună → Chirie anuală brută 7.200 EUR → După costuri (85%): 6.120
                    EUR → Randament net: 6.12%
                  </p>
                </div>
              )}

              {term.id === "seismic" && (
                <div className="mt-4 space-y-2">
                  <div className="p-4 bg-[rgb(var(--danger))]/10 rounded-[var(--r-sm)] border-l-4 border-[rgb(var(--danger))]">
                    <p className="text-sm text-[rgb(var(--text))]">
                      <strong>RS1 (Risc ridicat):</strong> Clădire cu vulnerabilitate mare.
                      Consolidare urgentă recomandată.
                    </p>
                  </div>
                  <div className="p-4 bg-[rgb(var(--warn))]/10 rounded-[var(--r-sm)] border-l-4 border-[rgb(var(--warn))]">
                    <p className="text-sm text-[rgb(var(--text))]">
                      <strong>RS2 (Risc mediu):</strong> Clădire cu vulnerabilitate medie.
                      Verificare periodică necesară.
                    </p>
                  </div>
                  <div className="p-4 bg-[rgb(var(--success))]/10 rounded-[var(--r-sm)] border-l-4 border-[rgb(var(--success))]">
                    <p className="text-sm text-[rgb(var(--text))]">
                      <strong>RS3 (Risc scăzut):</strong> Structură rezistentă, risc redus la
                      cutremure.
                    </p>
                  </div>
                </div>
              )}

              {term.id === "confidence" && (
                <div className="mt-4 p-4 bg-[rgb(var(--surface-2))] rounded-[var(--r-sm)]">
                  <p className="text-sm text-[rgb(var(--muted))]">
                    <strong className="text-[rgb(var(--text))]">Încredere mare:</strong> 50+
                    proprietăți comparabile → interval ±5% <br />
                    <strong className="text-[rgb(var(--text))]">Încredere medie:</strong> 20–50
                    proprietăți → interval ±10% <br />
                    <strong className="text-[rgb(var(--text))]">Încredere scăzută:</strong> {`<`}20
                    proprietăți → interval ±15%
                  </p>
                </div>
              )}
            </Surface>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="mt-12 text-center">
        <p className="text-[rgb(var(--muted))] mb-4">
          Încă ai întrebări despre termenii pe care îi folosim?
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center h-11 px-6 bg-[rgb(var(--primary))] text-white rounded-[var(--r-md)] hover:opacity-90 transition-opacity"
        >
          Contactează-ne
        </Link>
      </div>
    </div>
  );
}
