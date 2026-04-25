import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

import { Button } from "@/components/ui/button";
import { RAPORT_EXEMPLU_PATH } from "@/lib/report/sample-public-report";
import { jsonLdArticleSeo, jsonLdFaqPage } from "@/lib/seo/jsonld";

const canonicalPath = "/cum-functioneaza";

export const metadata: Metadata = {
  title: "Cum funcționează: de la anunț la raport (previzualizare și deblocare)",
  description:
    "Pașii simpli pentru cumpărători: lipești linkul, primim o previzualizare, poți debloca raportul complet când vrei. Fără promisiuni de tranzacție sau evaluare oficială.",
  alternates: { canonical: canonicalPath },
  openGraph: {
    title: "Cum funcționează ImobIntel | De la anunț la raport",
    description:
      "Fluxul plătit explicat: extragere, comparabile, previzualizare gratuită, deblocare opțională.",
    type: "article",
    url: canonicalPath,
  },
  twitter: {
    card: "summary_large_image",
    title: "Cum funcționează | ImobIntel",
    description:
      "Previzualizare gratuită, raport complet opțional. Reper de piață, nu act oficial.",
  },
};

const faqItemsResolved: { question: string; answer: string }[] = [
  {
    question: "Previzualizarea e gratuită?",
    answer:
      "Da, poți vedea un rezumat fără plată, înainte să decizi dacă vrei conținutul complet. Detaliile de tip raport încuiat se deblochează conform pachetului tău sau al achiziției unice, dacă oferta o prevede.",
  },
  {
    question: "E evaluare ANEVAR sau document pentru bancă?",
    answer:
      "Nu. ImobIntel îți dă un reper de piață și context din anunțuri și surse pe care le integrăm, plus limitele pe care le afișăm în raport. Nu înlocuiește un evaluator autorizat, notarul sau verificările la dosar.",
  },
  {
    question: "Dacă anunțul e incomplet sau se schimbă pe site?",
    answer:
      "Uneori extragem mai puțin, uneori oprim analiza. Nu promitem același volum de detalii pe fiecare anunț. Răspunsul tău practic: încearcă un link actualizat sau un anunț echivalent pe un portal suportat.",
  },
  {
    question: "Raportul îmi spune la ce preț cumpăr sigur apartamentul?",
    answer:
      "Nu. Îți dăm un coridor, semnale și text de lucru la negociere. Prețul final depinde de ofertă, acte, starea rezonată la vizionare și ce acceptă părțile.",
  },
  {
    question: "Unde găsesc explicații despre surse și limite?",
    answer:
      "Pe pagina Date și metodologie descriem ce putem trage din anunț, ce intră în modele și ce nu putem promite fără verificare la fața locului sau în acte.",
  },
];

const steps = [
  {
    n: 1,
    title: "Lipești linkul anunțului",
    body: "Alege un anunț de vânzare de pe imobiliare.ro, storia.ro, olx.ro, publi24.ro, lajumate.ro sau homezz.ro, cu un link direct către fișa ofertei (nu pagina de căutare). Lipești URL-ul în pagina de analiză, nu o captură de ecran. Fără link valid nu pornim o analiză completă.",
  },
  {
    n: 2,
    title: "ImobIntel extrage datele disponibile",
    body: "Citim ce poate fi recunoscut automat din anunț: de regulă preț, monedă, suprafață, camere, text, poze acolo unde le putem folosi, uneori localizare aproximativă. Dacă ceva lipsește sau site-ul blochează accesul tehnic, îți spunem pe scurt ce s-a putut face, nu completăm cu date inventate.",
  },
  {
    n: 3,
    title: "Comparăm cu anunțuri similare și semnale de piață",
    body: "Modelul pune oferta lângă altele asemănătoare (zonă, suprafață, profil) și adaugă context: reper de preț, încredere acolo unde o afișăm, plus alte straturi din produs când există (de exemplu riscuri discutate în mod transparent în raport). Totul e orientativ, nu o prognoză a prețului la care se va vinde neapărat.",
  },
  {
    n: 4,
    title: "Primești o previzualizare gratuită",
    body: "Vezi un sumar, ca să îți faci o idee dacă merită să mergi mai departe. Nu este tot raportul; este un mod de a nu plăti înainte să vezi structura.",
  },
  {
    n: 5,
    title: "Deblochezi raportul complet dacă vrei detaliile",
    body: "Dacă vrei accesul la secțiunile extinse, negociere, comentarii și PDF după caz, deblochezi din cont, conform pachetului tău sau a achiziției afișate. Poți aștepta până după o primă vizionare; nu îți asumăm o urgență artificială.",
  },
  {
    n: 6,
    title: "Folosești raportul la vizionare și negociere",
    body: "Îl tratezi ca un reper: întrebări, comparabile, limite. Nu îl presupune „adevăr absolut”; îl pui lângă ce vezi la fața locului, la acte și la consilierul tău, dacă îl folosești.",
  },
] as const;

export default function CumFunctioneazaPage() {
  const faqLd = jsonLdFaqPage(faqItemsResolved);
  const articleLd = jsonLdArticleSeo({
    headline: "Cum funcționează: de la anunț la raport (previzualizare și deblocare)",
    description:
      "Pașii simpli: link, extragere, comparabile, previzualizare gratuită, deblocare opțională, utilizare la negociere.",
    path: canonicalPath,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <Script id="cum-functioneaza-article" type="application/ld+json">
        {JSON.stringify(articleLd)}
      </Script>
      <Script id="cum-functioneaza-faq" type="application/ld+json">
        {JSON.stringify(faqLd)}
      </Script>

      <p className="text-sm text-muted-foreground">
        <Link href="/" className="text-blue-600 hover:underline">
          Acasă
        </Link>
        <span className="mx-2 text-slate-300">·</span>
        <Link href="/date-si-metodologie" className="text-blue-600 hover:underline">
          Date și metodologie
        </Link>
        <span className="mx-2 text-slate-300">·</span>
        <Link href={RAPORT_EXEMPLU_PATH} className="text-blue-600 hover:underline">
          Raport exemplu
        </Link>
      </p>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Cum funcționează
      </h1>
      <p className="mt-3 text-lg leading-relaxed text-slate-600">
        Mai jos este fluxul pentru cumpărător, de la link până la ce poți face cu raportul. Nu
        vindem certitudine, vindem un mod clar de a citi piața înainte să te așezi serios la
        discuții.
      </p>

      <div className="mt-8">
        <Button asChild className="rounded-full" size="lg">
          <Link href="/analyze">Verifică un anunț</Link>
        </Button>
      </div>

      <ol className="mt-12 space-y-10">
        {steps.map((s) => (
          <li key={s.n}>
            <h2 className="text-xl font-semibold text-slate-900">
              <span className="text-blue-600 tabular-nums">{s.n}.</span> {s.title}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{s.body}</p>
          </li>
        ))}
      </ol>

      <section className="mt-14 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Resurse conexe</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700 text-[15px] leading-relaxed">
          <li>
            <Link href="/date-si-metodologie" className="font-medium text-blue-600 hover:underline">
              Date și metodologie
            </Link>{" "}
            : de unde vin semnalele, ce nu acoperim, cum citim limitele.
          </li>
          <li>
            <Link href={RAPORT_EXEMPLU_PATH} className="font-medium text-blue-600 hover:underline">
              Raport exemplu
            </Link>{" "}
            : structură demonstrativă, fără anunț real.
          </li>
        </ul>
        <div className="mt-5">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/analyze">Înapoi la analiză</Link>
          </Button>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-semibold text-slate-900">Întrebări frecvente</h2>
        <dl className="mt-6 space-y-8">
          {faqItemsResolved.map((f) => (
            <div key={f.question}>
              <dt className="text-[16px] font-medium text-slate-900">{f.question}</dt>
              <dd className="mt-2 text-[15px] leading-relaxed text-slate-700">{f.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
