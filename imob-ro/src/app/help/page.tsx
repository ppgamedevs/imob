import Link from "next/link";

export const metadata = {
  title: "Help Center - ImobIntel",
  description: "Raspunsuri la cele mai frecvente intrebari despre ImobIntel",
};

const categories = [
  {
    title: "Primii pasi",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
      </svg>
    ),
    questions: [
      { q: "Cum functioneaza ImobIntel?", a: "Lipesti un link de anunt de pe imobiliare.ro, storia.ro, olx.ro, publi24.ro, lajumate.ro sau homezz.ro si primesti un raport complet cu estimare de pret, comparabile, viteza de vanzare si risc seismic." },
      { q: "Ce surse de anunturi sunt suportate?", a: "Suportam imobiliare.ro, storia.ro, olx.ro, publi24.ro, lajumate.ro si homezz.ro. Lucram continuu sa adaugam surse noi." },
      { q: "Cat dureaza o analiza?", a: "De obicei 15-30 de secunde. Analizele complexe pot dura pana la un minut." },
      { q: "Trebuie sa imi creez cont?", a: "Poti face primele 3 cautari fara cont. Dupa, trebuie un cont gratuit (email) pentru inca 7 cautari gratuite pe luna." },
    ],
  },
  {
    title: "Estimari si date",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    questions: [
      { q: "Cum se calculeaza pretul estimat?", a: "Folosim un model AVM (Automated Valuation Model) care combina comparabile din zona, statistici locale, ajustari pentru etaj, an constructie si suprafata. Vezi pagina Metodologie pentru detalii complete." },
      { q: "Cat de precise sunt estimarile?", a: "Precizia depinde de numarul de comparabile din zona. Afisam un interval (low-high) si un nivel de incredere pentru fiecare raport." },
      { q: "Ce inseamna riscul seismic?", a: "Verificam lista publica AMCCRS a cladirilor expertizate tehnic din Bucuresti. Afisam clasa de risc (RsI-RsIV) sau 'nu apare in lista publica'. Lipsa din lista NU inseamna ca un imobil este sigur." },
      { q: "Ce este Time-to-Sell (TTS)?", a: "TTS estimeaza timpul mediu pana la vanzare bazat pe diferenta fata de pretul estimat, cerere in zona si sezonalitate. Este o estimare, nu o garantie." },
    ],
  },
  {
    title: "Planuri si plati",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
      </svg>
    ),
    questions: [
      { q: "Ce primesc gratuit?", a: "10 cautari pe luna, 1 raport PDF, verdict de pret, 3 comparabile preview si analiza AI text." },
      { q: "Cum pot face upgrade?", a: "Mergi la pagina Preturi si alege planul dorit. Plata se face securizat prin Stripe." },
      { q: "Pot anula abonamentul?", a: "Da, oricand din pagina Contul meu. Abonamentul ramane activ pana la sfarsitul perioadei platite." },
      { q: "Ce metode de plata acceptati?", a: "Card bancar (Visa, Mastercard) prin Stripe. Plata este securizata si recurenta." },
      { q: "Oferiti factura?", a: "Da, facturile sunt disponibile automat in portalul Stripe accesibil din pagina contului tau." },
    ],
  },
  {
    title: "Cont si securitate",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    questions: [
      { q: "Cum ma autentific?", a: "Folosim 'magic link' prin email. Introdu adresa de email si primesti un link de autentificare - fara parola." },
      { q: "Ce date colectati?", a: "Doar emailul pentru autentificare si istoricul cautarilor tale. Nu colectam date personale suplimentare. Vezi Politica de Confidentialitate." },
      { q: "Folositi cookie-uri?", a: "Doar cookie-uri esentiale pentru functionarea platformei. Nu folosim cookie-uri de marketing sau tracking. Vezi Politica Cookie-uri." },
    ],
  },
];

export default function HelpCenterPage() {
  return (
    <div className="mx-auto max-w-[900px] px-5 py-16 md:py-24">
      <div className="text-center mb-14">
        <h1 className="text-[32px] md:text-[44px] font-bold tracking-tight text-gray-950">
          Help Center
        </h1>
        <p className="mt-3 text-[16px] text-gray-500 max-w-[480px] mx-auto">
          Raspunsuri rapide la cele mai frecvente intrebari.
        </p>
      </div>

      <div className="space-y-10">
        {categories.map((cat) => (
          <div key={cat.title}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                {cat.icon}
              </div>
              <h2 className="text-[18px] font-semibold text-gray-900">{cat.title}</h2>
            </div>
            <div className="space-y-3">
              {cat.questions.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-xl border border-gray-100 bg-white transition-all hover:border-gray-200"
                >
                  <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-[14px] font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-4 text-[13px] leading-relaxed text-gray-600">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-2xl border border-gray-100 bg-gray-50/50 p-8 text-center">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-2">Nu ai gasit raspunsul?</h3>
        <p className="text-[14px] text-gray-500 mb-4">Echipa noastra iti raspunde in mai putin de 24 de ore.</p>
        <Link
          href="/contact"
          className="inline-flex items-center rounded-full bg-gray-900 px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-gray-800 transition-colors"
        >
          Contacteaza-ne
        </Link>
      </div>
    </div>
  );
}
