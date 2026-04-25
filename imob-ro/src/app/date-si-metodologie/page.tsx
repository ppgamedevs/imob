import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

import { Button } from "@/components/ui/button";
import { RAPORT_EXEMPLU_PATH } from "@/lib/report/sample-public-report";
import { jsonLdArticleSeo, jsonLdFaqPage } from "@/lib/seo/jsonld";

const canonicalPath = "/date-si-metodologie";

export const metadata: Metadata = {
  title: "De unde vin datele? Transparență și metodologie",
  description:
    "ImobIntel explică sursele folosite în analiză, limitele estimatei, încrederea modelului și ce nu promitem. Informație pentru cumpărători, nu consultanță oficială.",
  alternates: { canonical: canonicalPath },
  openGraph: {
    title: "De unde vin datele? | ImobIntel",
    description:
      "Transparență: anunțuri, comparabile, surse publice, riscuri și limite. Fără evaluare ANEVAR sau verificare juridică.",
    type: "article",
    url: canonicalPath,
  },
  twitter: {
    card: "summary_large_image",
    title: "De unde vin datele? | ImobIntel",
    description: "Surse, limite și încredere în raportul ImobIntel.",
  },
};

const faqItems = [
  {
    question: "ImobIntel folosește tranzacții notariale pe fiecare adresă?",
    answer:
      "Nu. Ne bazăm în principal pe anunțuri publice agregate și comparabile similare, plus surse publice acolo unde le integrăm (de exemplu straturi de risc sau repertorii, când potrivirea există). Nu avem acces la baza ta de tranzacții oficiale completă pe fiecare ușă.",
  },
  {
    question: "Ce înseamnă „referința fiscală notarială” din raport?",
    answer:
      "Reper fiscal folosit în contexte notariale. Nu este preț de piață și nu estimează onorariul notarului. Cifrele exacte de taxe sau tarife rămân la notar, după starea actelor tale.",
  },
  {
    question: "De ce intervalul de preț diferă de ce văd în alte aplicații?",
    answer:
      "Fiecare serviciu folosește alt set de date, filtre și ajustări. La noi vezi un coridor și o încredere: diferențele sunt normale până la o verificare pe teren și la acte.",
  },
  {
    question: "Pot folosi raportul ca probă la bancă sau la tribunal?",
    answer:
      "Nu. Raportul este un instrument de lectură a pieței și a riscurilor publice, nu un document probatoriu sau o evaluare autorizată.",
  },
];

export default function DateSiMetodologiePage() {
  const faqLd = jsonLdFaqPage(faqItems);
  const articleLd = jsonLdArticleSeo({
    headline: "De unde vin datele? Transparență și metodologie",
    description:
      "ImobIntel explică sursele folosite în analiză, limitele estimatei, încrederea modelului și ce nu promitem.",
    path: canonicalPath,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <Script id="date-metodologie-article" type="application/ld+json">
        {JSON.stringify(articleLd)}
      </Script>
      <Script id="date-metodologie-faq" type="application/ld+json">
        {JSON.stringify(faqLd)}
      </Script>

      <p className="text-sm text-muted-foreground">
        <Link href="/how-we-estimate" className="text-blue-600 hover:underline">
          Metodologie tehnică AVM
        </Link>
        <span className="mx-2 text-slate-300">·</span>
        <Link href="/ghid" className="text-blue-600 hover:underline">
          Ghiduri cumpărător
        </Link>
      </p>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        De unde vin datele?
      </h1>
      <p className="mt-3 text-lg leading-relaxed text-slate-600">
        ImobIntel îți arată ce putem deduce din anunțuri și din surse publice, unde intervine
        modelul și unde trebuie să intri tu, cu notarul, banca sau un specialist. Fără ambalaj:
        când datele sunt subțiri, o spunem. Când putem, îți dăm un coridor de preț și semnale
        utile la negociere, nu o promisiune de tranzacție.
      </p>

      <p className="mt-5 text-[15px] leading-relaxed text-slate-700">
        Vrei să vezi cum arată structura unui raport complet înainte să plătești? Deschide{" "}
        <Link href={RAPORT_EXEMPLU_PATH} className="font-medium text-blue-600 underline underline-offset-2">
          raportul exemplu
        </Link>{" "}
        (conținut demonstrativ, fără anunț real).
      </p>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">1. Ce analizează ImobIntel</h2>
        <ul className="list-disc space-y-2 pl-5 text-slate-700 leading-relaxed">
          <li>
            <strong>Date extrase din anunț</strong>: text, preț, monedă, suprafață, camere, etaj, ce
            poate fi recunoscut automat din structura anunțului și, unde există, coordonate sau zonă
            aproximativă.
          </li>
          <li>
            <strong>Reper de piață</strong>: comparații cu alte oferte asemănătoare (nivel
            aproximativ pe cameră, suprafață, distanță, aliniere la piață).
          </li>
          <li>
            <strong>Referință fiscală notarială</strong> (când apare în raport): reper fiscal folosit
            în contexte notariale; nu e preț de piață și nu estimează onorariul notarului.
          </li>
          <li>
            <strong>Preț pe metru pătrat</strong> derivat din prețul listat și suprafață, apoi
            compart cu medii locale acolo unde avem rețea suficientă de anunțuri.
          </li>
          <li>
            <strong>Surse publice</strong>, când le integrăm: de exemplu baze de risc sau repertorii
            de clădiri, cu potrivire automată a adresei. Potrivirea poate eșua sau fi incompletă: nu
            tratăm asta ca verdict definitiv.
          </li>
          <li>
            <strong>Semnale de risc</strong>: combinație de vechime, clasă de risc acolo unde apare,
            alte straturi contextuale disponibile în produs, formulate ca reper, nu ca expertiză
            tehnică la dosar.
          </li>
        </ul>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">2. Ce NU promite ImobIntel</h2>
        <ul className="list-disc space-y-2 pl-5 text-slate-700 leading-relaxed">
          <li>Nu este evaluare ANEVAR sau alt tip de evaluare autorizată pentru justiție sau bancă.</li>
          <li>Nu este verificare juridică: nu confirmăm titlu, sarcini, litigii, sau istoricul complet al dosarului.</li>
          <li>Nu garantăm prețul la care se va vinde: tranzacția reală depinde de negocieri, piață, acte.</li>
          <li>
            Nu confirmăm starea din cadastru / intabulare: acestea se verifică la sursele oficiale și
            la profesioniști.
          </li>
          <li>
            Nu înlocuiește expertiza tehnică: structură, instalații, humitate, șantier vecin, toate
            se văd la fața locului sau cu un inginer, nu doar pe ecran.
          </li>
        </ul>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">3. Cum calculăm estimarea</h2>
        <p className="text-slate-700 leading-relaxed">
          Ne uităm la un <strong>interval</strong> (jos, mijloc, sus), nu la o singură cifră magică.
          Comparăm cu anunțuri similare, normalizăm cât putem, aplicăm ajustări pentru diferențe
          uzuale (vârstă, etaj, lichiditate, ce include modelul) și dăm un scor de încredere. În zone
          cu puține oferte, intervalul e mai lat și avertismentele mai frecvente. Detalii tehnice
          despre părțile AVM, cerere și TTS:{" "}
          <Link href="/how-we-estimate" className="text-blue-600 hover:underline">
            pagina de metodologie
          </Link>
          .
        </p>
        <ul className="list-disc space-y-2 pl-5 text-slate-700 leading-relaxed">
          <li>
            <strong>Comparabile</strong>: oferte apropiate de profil, nu o singură tranzacție
            misterioasă.
          </li>
          <li>
            <strong>Preț pe m²</strong>: ancorare la piață; nu înseamnă că fiecare m² e identic.
          </li>
          <li>
            <strong>Ajustări</strong>: când modelul știe să le aplice; nu acoperim toate nuanțele
            subiective.
          </li>
          <li>
            <strong>Încredere</strong>: rezumat al calității bazei de date (vezi secțiunea următoare).
          </li>
        </ul>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">4. Ce înseamnă încredere ridicată, medie sau redusă</h2>
        <p className="text-slate-700 leading-relaxed">
          Este un <strong>semnal agregat</strong>, nu o notă pe burtă. Încredere mai mare: avem
          suficiente comparabile, anunțul are câmpuri clare, localizare rezonabilă, reper de piață
          mai stabil. Încredere medie: putem oferi o lectură, dar cu nuanțe. Redusă: lipsesc piese
          critice, puține comparabile, adresă aproximativă, sau alte limitări: tonul devine
          prudent, fără concluzii dure pe preț. Formula exactă poate evolua în timp, ideea rămâne: nu
          ascundem când pământul e subțire.
        </p>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">5. De ce unele rapoarte au date insuficiente</h2>
        <p className="text-slate-700 leading-relaxed">
          Când anunțul e gol pe suprafață sau an, când nu găsim vecini comparabili, când geocodarea
          cade doar pe zonă, sau când piața e rarefiată, raportul îți spune pe scurt acest lucru. Nu
          compensăm cu fabulații: preferăm cumpărătorul informat decât cumpărătorul păcălit.
        </p>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">6. Cum să folosești raportul la negociere</h2>
        <p className="text-slate-700 leading-relaxed">
          Folosește coridorul de preț ca <strong>reper de conversație</strong>, adună actele și
          răspunsurile de la vânzător, cere în scris ce te blochează, și treci la ofertă fermă când
          baza ți se pare solidă, nu când ți-a plăcut un singur paragraf. ImobIntel include și o
          secțiune de asistent de negociere acolo unde datele o permit, cu întrebări practice și
          șablon de mesaj, nu o strategie de avocat.
        </p>
        <p>
          <Link href="/ghid/cum-negociezi-pretul-unui-apartament" className="text-blue-600 hover:underline">
            Ghid: cum negociezi prețul
          </Link>
        </p>
      </section>

      <section className="mt-12 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-slate-50/80 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">7. Următorul pas</h2>
        <p className="mt-2 text-slate-700 leading-relaxed">
          Pune un anunț prin analiză: vezi pe loc ce știm și ce nu putem ști fără tine, pe teren, cu
          acte.
        </p>
        <Button asChild size="lg" className="mt-5">
          <Link href="/analyze">Verifică un anunț</Link>
        </Button>
        <p className="mt-4 text-sm text-slate-600">
          <Link href="/pricing" className="text-blue-600 hover:underline">
            Deblocare raport complet și prețuri
          </Link>
        </p>
      </section>

      <section className="mt-12 border-t border-slate-200 pt-10">
        <h2 className="text-lg font-semibold text-slate-900">Întrebări frecvente</h2>
        <dl className="mt-4 space-y-4">
          {faqItems.map((item) => (
            <div key={item.question}>
              <dt className="font-medium text-slate-900">{item.question}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-slate-600">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-10 text-center text-xs text-slate-500">
        Ultima actualizare de conținut: {new Date().getFullYear()}. Dacă ai întrebări de produs,{" "}
        <Link href="/contact" className="text-blue-600 hover:underline">
          contactează-ne
        </Link>
        .
      </p>
    </div>
  );
}
