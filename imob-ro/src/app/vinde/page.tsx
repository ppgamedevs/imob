import { Metadata } from "next";

import OwnerWizard from "./OwnerWizard";

export const metadata: Metadata = {
  title: "Evaluare Preț Apartament București | imob.ro",
  description:
    "Află pretul recomandat pentru apartamentul tău în 3 pași simpli. Evaluare AVM gratuită, estimare timp de vânzare și recomandări personalizate.",
  openGraph: {
    title: "Evaluare Preț Apartament București",
    description:
      "Calculează prețul optim de vânzare pentru apartamentul tău cu tehnologie AVM",
  },
};

export default function VindePage({
  searchParams,
}: {
  searchParams: { areaSlug?: string };
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Evaluare preț apartament București",
    description:
      "Serviciu gratuit de evaluare automată (AVM) pentru proprietari de apartamente din București. Estimare preț de vânzare, timp până la vânzare și randament ca investiție.",
    provider: {
      "@type": "Organization",
      name: "imob.ro",
    },
    areaServed: {
      "@type": "City",
      name: "București",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Află prețul optim pentru apartamentul tău
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Evaluare automată (AVM) gratuită în 3 pași simpli. Primești preț recomandat,
            interval de încredere, estimare timp de vânzare și raport complet.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-card p-6 rounded-lg border">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold mb-2">Evaluare AVM</h3>
            <p className="text-sm text-muted-foreground">
              Tehnologie Automated Valuation Model bazată pe mii de tranzacții recente
              din zona ta.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <div className="text-3xl mb-3">⏱️</div>
            <h3 className="text-lg font-semibold mb-2">Timp până la vânzare</h3>
            <p className="text-sm text-muted-foreground">
              Estimare TTS (Time to Sell) - află în cât timp poți vinde la prețul
              recomandat.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <div className="text-3xl mb-3">💡</div>
            <h3 className="text-lg font-semibold mb-2">Recomandări</h3>
            <p className="text-sm text-muted-foreground">
              Sfaturi personalizate pentru a maximiza prețul și a vinde mai repede.
            </p>
          </div>
        </div>

        {/* Wizard */}
        <OwnerWizard initialArea={searchParams.areaSlug} />

        {/* Trust signals */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            <strong>Confidențialitate garantată.</strong> Datele tale sunt protejate și nu
            sunt partajate cu terți. Calculele sunt estimări automate și nu constituie
            consultanță financiară. Poți solicita ștergerea datelor oricând.
          </p>
        </div>

        {/* FAQ/Info */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">De ce să folosești evaluarea noastră?</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Preț bazat pe date reale</h3>
              <p className="text-sm text-muted-foreground">
                Analizăm zilnic mii de anunțuri din București pentru a-ți oferi o
                evaluare precisă bazată pe zona ta, suprafață, an construcție și alte
                caracteristici.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Raport complet gratuit</h3>
              <p className="text-sm text-muted-foreground">
                Primești un raport detaliat cu interval de preț (minim-maxim), preț
                recomandat, estimare timp de vânzare, chirie potențială și randament ca
                investiție.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Link public pentru partajare</h3>
              <p className="text-sm text-muted-foreground">
                Poți genera un link public al raportului pentru a-l împărtăși cu agenții
                imobiliari sau potențiali cumpărători. Adresa exactă rămâne confidențială.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
