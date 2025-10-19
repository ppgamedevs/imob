import Link from "next/link";
import Script from "next/script";
import React from "react";

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
        <h2 className="text-xl font-medium mb-2">AVM — Preț estimat</h2>
        <p className="text-sm text-muted-foreground">
          Calculăm un interval (low — high) și un nivel de încredere. Limitele: modelul se bazează
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

      <div className="border-t pt-4">
        <h3 className="font-medium mb-2">Disclaimer</h3>
        <p className="text-sm text-muted-foreground">
          Informațiile afișate sunt estimări automate; nu constituie consultanță financiară sau
          juridică. Verificați întotdeauna la sursa originală.
        </p>
      </div>

      <div className="mt-6">
        <Link href="/" className="text-sm text-primary underline">
          Înapoi la prima pagină
        </Link>
      </div>
    </div>
  );
}
