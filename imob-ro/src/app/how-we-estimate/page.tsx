import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import React from "react";

import { ReportDisclaimer } from "@/components/common/ReportDisclaimer";

export const metadata: Metadata = {
  title: "Cum estimam pretul apartamentului - Metodologie ImobIntel",
  description:
    "Afla cum functioneaza modelul de estimare AVM: comparabile, ajustari, scor de cerere, viteza de vanzare si risc seismic. Metodologie transparenta.",
  openGraph: {
    title: "Cum estimam pretul - Metodologie ImobIntel",
    description: "Metodologie transparenta: AVM, comparabile, ajustari, cerere si risc.",
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Cum estimam pretul apartamentului",
    description: "Metodologie transparenta de estimare a pretului.",
  },
  alternates: { canonical: "/how-we-estimate" },
};

export default function HowWeEstimatePage() {
  const faq = [
    {
      question: "Ce este AVM (preț estimat)?",
      answer:
        "AVM (automated valuation model) combină statistici locale, anunțuri comparabile și ajustări pentru starea proprietății; oferim un interval (low-high) și o încredere (0-1).",
    },
    {
      question: "Cum calculăm scorul de cerere (demandScore)?",
      answer:
        "demandScore = (views + saves) / supply calculat pe fereastra 30 zile; normalizăm la [0,1] unde 1 înseamnă cerere mare față de ofertă.",
    },
    {
      question: "Ce înseamnă Time-to-Sell (TTS)?",
      answer:
        "TTS estimează timpul mediu până la vânzare pe baza diferenței față de AVM, scorului de cerere și sezonalității. Este o estimare, nu o garanție.",
    },
    {
      question: "Cum calculăm randamentul (yield)?",
      answer:
        "Randamentul se bazează pe chirii estimate per m2 și prețul listat; rezultatul include gross și net după o estimare de cheltuieli.",
    },
  ];

  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };

  return (
    <div className="container mx-auto py-12">
      <Script id="how-we-estimate-faq" type="application/ld+json">
        {JSON.stringify(ld)}
      </Script>

      <h1 className="text-2xl font-semibold mb-4">Cum estimăm</h1>

      <p className="text-muted-foreground mb-6">
        Aici explicăm cum funcționează modelele noastre. Ce înseamnă scorurile afișate și care sunt
        limitările lor.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-medium mb-2">AVM - Preț estimat</h2>
        <p className="text-sm text-muted-foreground">
          Calculăm un interval (low - high) și un nivel de încredere. Limitele: modelul se bazează
          pe date publice și anunțuri extrase. În zone cu puține date, încrederea scade.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-medium mb-2">Scor de cerere (demandScore)</h2>
        <p className="text-sm text-muted-foreground">
          Măsurăm evenimentele (view, save) pe ultimele 30 de zile și le raportăm la ofertă
          (supply). Valoarea este normalizată între 0 și 1. Limite: poate fi influențat de campanii
          sau anunțuri sponsorizate.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-medium mb-2">Time-to-Sell (TTS)</h2>
        <p className="text-sm text-muted-foreground">
          Estimare bazată pe diferența față de AVM, pe sezonalitate și pe scorul de cerere. Este o
          predicție mediană, nu o garanție.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-medium mb-2">Randament (Yield)</h2>
        <p className="text-sm text-muted-foreground">
          Estimăm chiria per m2 din comparabile sau din caracteristicile proprietății. Apoi calculăm
          yield gross și net. Rezultatele sunt orientative și depind de calitatea datelor de
          intrare.
        </p>
      </section>

      <section className="border-t pt-6">
        <h3 className="mb-2 font-medium">Riscuri și alte straturi</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Riscul seismic folosește lista publică atunci când adresa se potrivește automat; alte
          riscuri (medie, inundații, etc.) apar doar când există surse conectate în produs, nu
          acoperim exhaustiv fiecare tip de risc. Nu oferim o imagine exhaustivă a pericolelor, ci
          semnale pe baza datelor disponibile.
        </p>
        <h3 className="mb-2 font-medium">Raport cumpărător (ce nu este)</h3>
        <ReportDisclaimer variant="legal" className="!text-sm !text-muted-foreground" />
      </section>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
        <Link href="/date-si-metodologie" className="text-sm text-primary underline">
          De unde vin datele? (transparență)
        </Link>
        <Link href="/" className="text-sm text-muted-foreground underline">
          Înapoi la prima pagină
        </Link>
      </div>
    </div>
  );
}
