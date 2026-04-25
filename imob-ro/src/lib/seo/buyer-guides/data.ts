import type { BuyerGuide } from "./types";

const ZONA_TABEREI = { href: "/zona/drumul-taberei", label: "Drumul Taberei" as const };
const ZONA_SECTOR1 = { href: "/zona/bucuresti-sector-1", label: "Sector 1 (exemplu)" as const };
const ZONA_SECTOR2 = { href: "/zona/bucuresti-sector-2", label: "Sector 2 (exemplu)" as const };

export const BUYER_GUIDE_SLUGS = [
  "cum-verifici-un-apartament-inainte-sa-l-cumperi",
  "cum-negociezi-pretul-unui-apartament",
  "ce-intrebari-sa-pui-agentului-imobiliar",
  "cum-stii-daca-un-apartament-este-supraevaluat",
  "risc-seismic-apartament-bucuresti",
  "pret-pe-metru-patrat-bucuresti",
  "acte-necesare-cumparare-apartament",
  "verificare-anunt-imobiliar",
] as const;

export type BuyerGuideSlug = (typeof BUYER_GUIDE_SLUGS)[number];

const guides: Record<BuyerGuideSlug, BuyerGuide> = {
  "cum-verifici-un-apartament-inainte-sa-l-cumperi": {
    slug: "cum-verifici-un-apartament-inainte-sa-l-cumperi",
    title: "Cum verifici un apartament înainte să-l cumperi (listă de lucru)",
    metaDescription:
      "Pași practici: acte, structură, asociație, utilități, vecinătăți. Ghid ImobIntel pentru cumpărători din București, fără promisiuni de evaluare oficială.",
    intro:
      "Cumpărarea se bazează pe informații verificabile, nu doar pe fotografii frumoase. Acest ghid urmărește ordinea unui cumpărător disciplinat: de la anunț la semnare, fără a înlocui un avocat, un inginer sau un notar. ImobIntel îți dă un reper din anunțuri; restul rămâne pe teren și în acte.",
    sections: [
      {
        title: "1. Conținutul anunțului vs. starea reală",
        paragraphs: [
          "Notează ce promite anunțul: suprafață, an construcție, compartimentări, etaj, orientare, spații comune, parcări, mobiler.",
          "Orice adjective de tip «lux» sau «ultracentral» cer confirmare. Pentru o primă filtrare automată, poți porni o analiză de anunț pe ImobIntel (reper de preț și semnale de risc), apoi treci la verificare practică.",
        ],
        checklist: [
          "Diferențe între m² utili și cota parte din cote părți comune (întreabă, nu asuma).",
          "Dacă există randări 3D, cere fotografii reale de la stadiul actual.",
        ],
      },
      {
        title: "2. Asociația de proprietari și bani",
        paragraphs: [
          "Întreabă câte luni e fundul de reparații, dacă există lucrări aprobate, datorii, litigii. Cere, acolo unde e posibil, documente, nu doar o replică verbală.",
        ],
        checklist: [
          "Extras sau situație scrisă de la asociație, acolo unde se poate obține.",
          "Cine plătește ce la întreținere, cum se măsoară repartizatorii.",
        ],
      },
      {
        title: "3. Lucrări interioare și avize",
        paragraphs: [
          "Modificări de compartimentare, închideri de terasă, instalații, pot diferi de proiect. Nu îți dăm verdict juridic: pune toate pe masa unui specialist înainte de bani serioși.",
        ],
        checklist: [
          "Cui aparține instalația de încălzire, contorii, rețelele interioare.",
        ],
      },
    ],
    faq: [
      {
        question: "Pot verifica riscurile de acasă, fără vizionare?",
        answer:
          "Poți filtra: reper de preț, comparații simple, risc public pentru seismic acolo unde există potrivire. Asta nu e expertiză de structură și nici concluzie ANEVAR. Pentru cumpărare reală, urmează pasul pe teren și cu profesioniști.",
      },
      {
        question: "Ce trebuie să văd la vizionare în afară de finisaje?",
        answer:
          "Umiditate, șuierat la geamuri, zgomot la ore diferite, câți pași până la scări/lift, mirosuri din instalații, hărțuiri privind vecinajul, acolo unde se poate aprecia obiectiv.",
      },
    ],
    zoneLinks: [ZONA_SECTOR1],
  },

  "cum-negociezi-pretul-unui-apartament": {
    slug: "cum-negociezi-pretul-unui-apartament",
    title: "Cum negociezi prețul unui apartament (fără magie, cu date)",
    metaDescription:
      "Strategie pentru cumpărător: reper de piață, documente, argumente, ce să nu promiți din greșeală. Trimiteri spre analiză ImobIntel și deblocare raport complet.",
    intro:
      "Negocierea merge mai bine când știi de ce e listat așa, ce comparabile rezonabile există public și cât ești dispus să lași în clar față de partea cealaltă. Un preț corect nu e o singură cifră pe internet: e un coridor care depinde de starea reședinței, acte și lichiditatea zonei. ImobIntel îți arată un coridor orientativ din anunțuri, nu o tranzacție garantată.",
    sections: [
      {
        title: "Ancorează conversația în fapte, nu în opinii",
        paragraphs: [
          "Compară anunțuri apropiate pe camere, suprafață, an și etaj, nu doar prețul total.",
          "Cere, în scris, informațiile care îți blochează o ofertă fermă: născocirea, cheltuieli, termene de eliberare.",
        ],
        checklist: [
          "Definește ce înseamnă pentru tine o ofertă serioasă (antecontract sau avans condiționat, acte, calendar).",
        ],
      },
      {
        title: "Când are sens o deschidere sub listă (și când nu)",
        paragraphs: [
          "Dacă ai suficiente comparabile și o poziționare clară pe m², poți explica o deschidere sub listă fără să semnezi cifre care te blochează. Dacă baza e subțire, cere mai întâi lămuriri, nu cifre.",
        ],
        checklist: [
          "Nu lăsa datele anunțului pe ultimul loc: lipsa anului sau a actelor bune de citit = cereri înainte de orice sumă ferme.",
        ],
      },
    ],
    faq: [
      {
        question: "De unde iau un reper de piață rapid?",
        answer:
          "Poți pune un URL de anunț pe ImobIntel pentru un reper automat din oferte asemănătoare. Acesta rămâne orientativ: nu ține loc de o evaluare notarială sau ANEVAR.",
      },
    ],
    zoneLinks: [ZONA_TABEREI],
  },

  "ce-intrebari-sa-pui-agentului-imobiliar": {
    slug: "ce-intrebari-sa-pui-agentului-imobiliar",
    title: "Ce întrebări să pui agentului imobiliar (înainte de vizionare)",
    metaDescription:
      "Listă de întrebări despre an, acte, sarcini, întreținere, motiv vânzare, condiționări. Ghid cumpărător, nu reglementare profesiei.",
    intro:
      "Un agent de încredere răspunde concret, nu ocolesc subiectul. Întrebările de mai jos te ajută să elimini anunțurile doar de consum și să îți aștepți timpul pentru proprietățile reale. Nu oferim consultanță juridică: folosește lista ca punct de plecare, apoi validează la notar sau avocat ce contează legal.",
    sections: [
      {
        title: "Anunț și starea reședinței",
        paragraphs: [
          "Cere cifre și documente, nu povești: an construcție, mod în care defilează cota de folosință, schimbări făcute, ultimele șantiere de bloc, garanții la finisaj.",
        ],
        checklist: [
          "Care e motivul rezonabil al vânzării, în limitele pe care ți le dă, fără detalii personale păguboase de divulgat.",
          "Când a fost făcută ultima revizuire a instalației, dacă se cunoaște.",
        ],
      },
      {
        title: "Acte, sarcini, calendar",
        paragraphs: [
          "Ce piese poți consulta înainte de o rezervare serioasă, în ce formă, ce condiționări bancare există, ce scenarii de vânzare se pot aplica fără surprize târzii.",
        ],
        checklist: [
          "Cine plătește comisioanele, în funcție de platformă, și cum se reflectă pe prețul final.",
        ],
      },
    ],
    faq: [
      {
        question: "E obligat agentul să-mi dea toate răspunsurile aici de sus?",
        answer:
          "Unii termeni țin de proprietar sau de bancă. Caietul tău de întrebări tot trebuie să fie: ce nu se poate confirma devine condiționare înainte de bani ferme.",
      },
    ],
  },

  "cum-stii-daca-un-apartament-este-supraevaluat": {
    slug: "cum-stii-daca-un-apartament-este-supraevaluat",
    title: "Cum știi dacă un apartament este supraevaluat (fără certitudine de laborator)",
    metaDescription:
      "Semnale: preț pe m² față de comparabile, lichiditate, vechime anunț, costuri de remediere. Cum eviți concluzii pripite și folosești ImobIntel ca reper, nu oracol.",
    intro:
      "Scump sau ieftin, fără context, e doar părere. Cumpărătorul rațional compară m², cameră, etaj, starea rețelelor și cât țin anunțurile asemănătoare. ImobIntel îți arată un coridor de preț pe baza ofertei publice; nu știe tot ce știi tu după vizionare, dar tratează cifrele ca orientative până la probă contrară pe teren.",
    sections: [
      {
        title: "Citește piața, nu o singură alegere",
        paragraphs: [
          "Fă triaj pe suprafețe apropiate, nu pe titlul care sună a unicat.",
          "Dacă o proprietate stă luni pe site cu tăieri repetate, poate fi semnal de ajustare; nu e o regulă, doar o pistă.",
        ],
        checklist: [
          "Cumpără: verifici dacă diferențele de preț explică diferențe reale: vedere, reparații, etaj, fund.",
        ],
      },
      {
        title: "Costuri de remediere",
        paragraphs: [
          "O diferență față de medie poate dispărea când pui șantiere, geamuri, instalații, acolo unde o expertiză spune adevărul, nu acest text.",
        ],
        checklist: [
          "Notează ce trebuie schimbat înainte de mutare: cumpărat la preț listă mare devine rezonabil după tăierea costurilor reale de remediere.",
        ],
      },
    ],
    faq: [
      {
        question: "ImobIntel îmi spune cumpără sau nu cumpăra?",
        answer:
          "Îți dă o sinteză de cumpărător, nu o hotărâre. Nu oferim consultanță de investiții; folosește cifrele ca punct de pornire, nu ca verdict.",
      },
    ],
    zoneLinks: [ZONA_TABEREI, ZONA_SECTOR1],
  },

  "risc-seismic-apartament-bucuresti": {
    slug: "risc-seismic-apartament-bucuresti",
    title: "Risc seismic, apartament în București: ce vezi public și ce nu",
    metaDescription:
      "Clarificări: liste publice, potrivire adresă, limite, ce să ceri de la proiect sau specialist. Fără a pretinde că acest text e expertiză seismică.",
    intro:
      "Bucureștiul are baze publice (de ex. repertorii de clădiri) care se pot asocia mecanic cu o adresă, dar o potrivire automată se poate greși sau lipsi. ImobIntel folosește surse oficiale acolo unde le integrăm: nu ține loc de proiect de rezistență, expert tehnicizat la cererea ta sau concluzie ISU. Dacă vezi o clasă de risc, verifici în dosar și pe teren, nu doar ecranul.",
    sections: [
      {
        title: "De ce o adresă aparentă nu e o expertiză",
        paragraphs: [
          "Hărțile și listele oficiale rămân baza, dar o adresă aproximativă, un imobil retras sau o intrare comunală atipică pot schimba traducerea automată. Verifici la asociație, la documentația reținută la dosar, cu inginer, acolo e cazul.",
        ],
        checklist: [
          "Notă: cutremur 1977 a lăsat urmă pe clădiri vechi, dar nu fiecare afirmație de pe internet ține de imobilul tău exact.",
        ],
      },
    ],
    faq: [
      {
        question: "Dacă aplicația nu găsește imobilul pe listă, sunt în siguranță structural?",
        answer:
          "Lipsa dintr-o potrivire automată nu înseamnă neapărat absență de risc. Caută confirmări oficiale și inspecții reale, nu o singură interogare de bază de date online.",
      },
    ],
  },

  "pret-pe-metru-patrat-bucuresti": {
    slug: "pret-pe-metru-patrat-bucuresti",
    title: "Preț pe metru pătrat la apartamente în București: cum îl folosești",
    metaDescription:
      "Mediane pe zone, de ce m² e mai bun decât prețul total, ce nu spune piața. Trimiteri la statistici pe cartier (ImobIntel) la analiză de anunț.",
    intro:
      "Compari €/m² când ții cont de aproximativ aceeași cameră, etaj, an, stare publică. Un apartament scump per total poate fi mediu pe m², și invers, dacă m² e mic. Paginile de zonă ImobIntel afișează o medie din piață agregată, nu fiecare ușă, dar rețeaua e utilă când treci de la 10 anunțuri la 2 candidați serioși. Pentru o proprietate concretă, pornește o analiză de URL: primești o bandă de reper din asemenea oferte, nu o evaluare ANEVAR.",
    sections: [
      {
        title: "Când două cifre nu sunt comparabile",
        paragraphs: [
          "Un 3 camere 90 m² e altceva decât 3 camere 60 m² aproximativ la fel, cu tot cu geografie în interior, poziționare în bloc, lift, parcări.",
        ],
        checklist: [
          "Notează ce include prețul (TVA, boxă, loc parcare negociat separat).",
        ],
      },
    ],
    faq: [
      {
        question: "E suficient media cartierului pentru a calcula o ofertă?",
        answer:
          "E un punct de plecare, nu o ofertă. După inspecții concrete, ajustează: vezi și pagina de preț / zonă.",
      },
    ],
    zoneLinks: [ZONA_TABEREI, ZONA_SECTOR2],
  },

  "acte-necesare-cumparare-apartament": {
    slug: "acte-necesare-cumparare-apartament",
    title: "Acte la cumpărarea unui apartament: ce se cere de obicei (orientativ)",
    metaDescription:
      "CF, intabulare, bancă, fără a fi o listă exhaustivă juridică. Cumpărător: verifică la notar. Nu există aici un protocol unic de stat aplicabil fiecărui caz.",
    intro:
      "Fiecare caz bancar sau istoric al titlului e diferit. Mai jos e o listă de orientare pentru conversațiile de început, nu o înlocuire a consultului cu notar. Pentru cumpărare reală, du documentele reale, nu acest text printat, la profesioniști. ImobIntel nu redactează contracte.",
    sections: [
      {
        title: "Pe scurt, ce apare des în poveste",
        paragraphs: [
          "Extras de carte funciară pentru situația din teren, documente care țin de ipoteci sau sarcini, acordurile părților, verificări fiscale acolo unde se aplică. Exactitatea ține de speța ta, nu de un blog.",
        ],
        checklist: [
          "Confirmă: cine e titular, ce sarcini, ce documente bancare dacă e credit.",
        ],
      },
    ],
    faq: [
      {
        question: "Unde aflu lista exactă pentru cazul meu?",
        answer: "Notar, avocat, bancă, în această ordine, în funcție de scenariu. Acest ecran nu e o procedură legală oferită de ImobIntel.",
      },
    ],
  },

  "verificare-anunt-imobiliar": {
    slug: "verificare-anunt-imobiliar",
    title: "Verificare anunț imobiliar: ce poți afla fără să fii notar",
    metaDescription:
      "Semnale de anunț: preț, vechime, conținut, randări, duplicate. Cum pui un URL prin analiza ImobIntel și treci la pașii umani.",
    intro:
      "Un anunț poate rămâne online și după ce proprietatea s-a vândut, poate reveni, poate conține cifre vechi, sau descrie un viitor care nu s-a oprit pe poza ta. ImobIntel nu certifică anunțul, dar îl compară mecanic cu sutele de asemenea, îți pune câteva avertismente și o bandă de preț orientativ, ca să știi unde să pui efort uman. Nu e investigație juridică.",
    sections: [
      {
        title: "Când merită a doua trecere",
        paragraphs: [
          "Când m², vechimea clădirii, sau ritmul prețurilor asemenea ies din povestea ofertei, când liniile de la telefonul din anunț nu răspund, când lumea refuză fotografii reale, sau când vezi tăieri frecvente fără explicații.",
        ],
        checklist: [
          "Caută numărul, platforma, duplicate de imagini, sau folosește o unealtă de comparații dacă pui anunțul prin servicii publice, nu doar prin telefonul din titlu.",
        ],
      },
    ],
    faq: [
      {
        question: "Dacă analiza spune aici e nevoie de prudență, ce fac?",
        answer:
          "Cere lămuri, documente, timp, nu avans mare acolo lipsă verificare. Cifrele automate nu-ți omoară bănuții: deciziile bănești rămân ale tale, cu banca și notarul.",
      },
    ],
  },
};

function isGuideSlug(s: string): s is BuyerGuideSlug {
  return (BUYER_GUIDE_SLUGS as readonly string[]).includes(s);
}

export function getBuyerGuide(slug: string): BuyerGuide | null {
  if (!isGuideSlug(slug)) return null;
  return guides[slug];
}

export function listBuyerGuides(): BuyerGuide[] {
  return BUYER_GUIDE_SLUGS.map((s) => guides[s]);
}
