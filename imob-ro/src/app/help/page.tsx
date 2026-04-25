import Link from "next/link";

export const metadata = {
  title: "Help Center - ImobIntel",
  description: "Raspunsuri la cele mai frecvente intrebari despre ImobIntel",
};

const categories = [
  {
    title: "Primii pasi",
    subtitle: "Incepe sa folosesti platforma",
    gradient: "from-blue-500 to-cyan-400",
    bgLight: "bg-blue-50",
    textColor: "text-blue-600",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
      </svg>
    ),
    questions: [
      { q: "Cum functioneaza ImobIntel?", a: "Lipesti un link de anunt de pe imobiliare.ro, storia.ro, olx.ro, publi24.ro, lajumate.ro sau homezz.ro si primesti un raport orientativ: estimare de pret, comparabile, un reper de timp pana la vanzare si risc seismic acolo unde se pot lega surse. Nu e evaluare ANEVAR." },
      { q: "Ce surse de anunturi sunt suportate?", a: "Suportam imobiliare.ro, storia.ro, olx.ro, publi24.ro, lajumate.ro si homezz.ro. Lucram continuu sa adaugam surse noi." },
      { q: "Cat dureaza o analiza?", a: "De obicei 15-30 de secunde. Analizele complexe pot dura pana la un minut." },
      { q: "Trebuie sa imi creez cont?", a: "Poti face primele 3 cautari fara cont. Dupa, trebuie un cont gratuit (email) pentru inca 7 cautari gratuite pe luna." },
    ],
  },
  {
    title: "Estimari si date",
    subtitle: "Cum calculam si ce inseamna datele",
    gradient: "from-emerald-500 to-teal-400",
    bgLight: "bg-emerald-50",
    textColor: "text-emerald-600",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    questions: [
      { q: "Cum se calculeaza pretul estimat?", a: "Folosim un model AVM (Automated Valuation Model) care combina comparabile din zona, statistici locale, ajustari pentru etaj, an constructie si suprafata. Vezi pagina Metodologie; rezultatul e un semnal de piață, nu o valoare certă." },
      { q: "Cat de precise sunt estimarile?", a: "Strângerea intervalului depinde de câte comparabile există în zonă. Afișăm un interval (low–high) și o încredere (ridicată/medie/redusă), nu o singură cifră de la care să te ții necondiționat." },
      { q: "Ce inseamna riscul seismic?", a: "Verificam lista publica AMCCRS a cladirilor expertizate tehnic din Bucuresti. Afisam clasa de risc (RsI-RsIV) sau 'nu apare in lista publica'. Lipsa din lista NU inseamna ca un imobil este sigur." },
      { q: "Ce este Time-to-Sell (TTS)?", a: "TTS estimeaza timpul mediu pana la vanzare bazat pe diferenta fata de pretul estimat, cerere in zona si sezonalitate. Este o estimare, nu o garantie." },
    ],
  },
  {
    title: "Planuri si plati",
    subtitle: "Abonamente, facturi si upgrade",
    gradient: "from-amber-500 to-orange-400",
    bgLight: "bg-amber-50",
    textColor: "text-amber-600",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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
    subtitle: "Autentificare, date personale si cookie-uri",
    gradient: "from-violet-500 to-purple-400",
    bgLight: "bg-violet-50",
    textColor: "text-violet-600",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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

const stats = [
  { value: "6+", label: "Surse suportate" },
  { value: "30s", label: "Timp mediu analiza" },
  { value: "99.5%", label: "Uptime" },
  { value: "<24h", label: "Timp raspuns suport" },
];

export default function HelpCenterPage() {
  return (
    <div className="mx-auto max-w-[1000px] px-5 py-16 md:py-24">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-[13px] font-medium text-blue-700 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>
          Centru de Ajutor
        </div>
        <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight text-gray-950">
          Cum te putem ajuta?
        </h1>
        <p className="mt-4 text-[16px] md:text-[18px] text-gray-500 max-w-[520px] mx-auto leading-relaxed">
          Gaseste raspunsuri rapide la cele mai frecvente intrebari sau contacteaza echipa noastra.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-5">
            <div className="text-[24px] md:text-[28px] font-bold text-gray-900">{stat.value}</div>
            <div className="text-[12px] text-gray-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Categories */}
      <div className="space-y-12">
        {categories.map((cat) => (
          <div key={cat.title}>
            <div className="flex items-start gap-4 mb-6">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.gradient} text-white shadow-sm`}>
                {cat.icon}
              </div>
              <div>
                <h2 className="text-[20px] font-bold text-gray-900">{cat.title}</h2>
                <p className="text-[13px] text-gray-500 mt-0.5">{cat.subtitle}</p>
              </div>
            </div>
            <div className="space-y-2.5 pl-0 md:pl-16">
              {cat.questions.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-xl border border-gray-100 bg-white transition-all hover:border-gray-200 hover:shadow-sm"
                >
                  <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-[14px] font-medium text-gray-900 [&::-webkit-details-marker]:hidden list-none">
                    <span className="pr-4">{item.q}</span>
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
                  <div className="px-5 pb-4 text-[13px] leading-relaxed text-gray-600 border-t border-gray-50 pt-3">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/how-we-estimate"
          className="group rounded-2xl border border-gray-100 bg-white p-6 hover:border-blue-200 hover:shadow-md transition-all"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3 group-hover:bg-blue-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Metodologie</h3>
          <p className="text-[13px] text-gray-500">Afla cum calculam estimarile de pret si scorul de risc.</p>
        </Link>
        <Link
          href="/pricing"
          className="group rounded-2xl border border-gray-100 bg-white p-6 hover:border-emerald-200 hover:shadow-md transition-all"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-3 group-hover:bg-emerald-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
          </div>
          <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Planuri si preturi</h3>
          <p className="text-[13px] text-gray-500">Compara planurile si alege ce ti se potriveste.</p>
        </Link>
        <Link
          href="/contact"
          className="group rounded-2xl border border-gray-100 bg-white p-6 hover:border-amber-200 hover:shadow-md transition-all"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-3 group-hover:bg-amber-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Contacteaza-ne</h3>
          <p className="text-[13px] text-gray-500">Raspundem in mai putin de 24 de ore.</p>
        </Link>
      </div>

      {/* CTA */}
      <div className="mt-14 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 md:p-10 text-center">
        <h3 className="text-[20px] md:text-[24px] font-bold text-white mb-2">Nu ai gasit raspunsul?</h3>
        <p className="text-[14px] text-gray-300 mb-6 max-w-[360px] mx-auto">
          Echipa noastra este pregatita sa te ajute. Scrie-ne si iti raspundem rapid.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[14px] font-semibold text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
          Contacteaza-ne
        </Link>
      </div>
    </div>
  );
}
