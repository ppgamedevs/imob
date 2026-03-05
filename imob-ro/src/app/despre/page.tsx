import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Despre ImobIntel - Platforma de analiza imobiliara",
  description:
    "ImobIntel este o platforma de analiza imobiliara care ajuta cumparatorii si investitorii din Romania sa ia decizii informate.",
  openGraph: {
    title: "Despre ImobIntel",
    description: "Platforma de analiza imobiliara pentru cumparatori si investitori din Romania.",
    type: "website",
  },
  alternates: { canonical: "/despre" },
};

export default function DesprePage() {
  return (
    <div className="mx-auto max-w-[800px] px-5 py-16 md:py-24">
      <div className="mb-12 text-center">
        <h1 className="text-[32px] md:text-[44px] font-bold tracking-tight text-gray-950">
          Despre ImobIntel
        </h1>
        <p className="mt-3 text-[16px] text-gray-500 max-w-[520px] mx-auto">
          Transparenta pe piata imobiliara din Romania.
        </p>
      </div>

      <div className="prose prose-gray max-w-none text-[15px] leading-relaxed">
        <h2 className="text-[20px] font-semibold text-gray-900 mb-3">Misiunea noastra</h2>
        <p className="text-gray-600 mb-6">
          ImobIntel a fost creat cu un singur scop: sa ofere cumparatorilor si investitorilor
          din Romania acces la date obiective si analize detaliate pentru piata imobiliara.
          Credem ca fiecare decizie imobiliara trebuie luata pe baza de date, nu pe impresii.
        </p>

        <h2 className="text-[20px] font-semibold text-gray-900 mb-3">Ce facem</h2>
        <p className="text-gray-600 mb-4">
          Analizam anunturi imobiliare din cele mai populare platforme din Romania si oferim:
        </p>
        <ul className="space-y-2 mb-6 text-gray-600">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
            <span><strong>Estimare de pret AVM</strong> - model automat de evaluare bazat pe comparabile reale din zona</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
            <span><strong>Analiza AI</strong> - inteligenta artificiala care analizeaza textul si fotografiile anuntului</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
            <span><strong>Risc seismic</strong> - verificare automata in lista publica AMCCRS</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
            <span><strong>Viteza de vanzare</strong> - estimarea timpului pana la tranzactie</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
            <span><strong>Comparabile din zona</strong> - proprietati similare pentru referinta</span>
          </li>
        </ul>

        <h2 className="text-[20px] font-semibold text-gray-900 mb-3">Companie</h2>
        <p className="text-gray-600 mb-2">
          ImobIntel este un produs al <strong>OnlyTips SRL</strong>.
        </p>
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-5 mb-6 text-[14px] text-gray-600 space-y-1">
          <div><span className="font-medium text-gray-900">Denumire:</span> OnlyTips SRL</div>
          <div><span className="font-medium text-gray-900">CUI:</span> 43414871</div>
          <div><span className="font-medium text-gray-900">Email:</span>{" "}
            <a href="mailto:contact@imobintel.ro" className="text-blue-600 hover:underline">contact@imobintel.ro</a>
          </div>
        </div>

        <h2 className="text-[20px] font-semibold text-gray-900 mb-3">Disclaimer</h2>
        <p className="text-gray-600 mb-6">
          Estimarile generate de ImobIntel au caracter informativ si orientativ. Ele nu constituie
          o evaluare oficiala si nu pot fi folosite in loc de un raport de evaluare realizat de un
          evaluator autorizat ANEVAR. Rezultatele pot diferi de pretul real de tranzactie.
          ImobIntel nu isi asuma raspunderea pentru deciziile luate pe baza estimarilor generate.
        </p>
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/contact"
          className="inline-flex items-center rounded-full bg-gray-900 px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-gray-800 transition-colors"
        >
          Contacteaza-ne
        </Link>
      </div>
    </div>
  );
}
