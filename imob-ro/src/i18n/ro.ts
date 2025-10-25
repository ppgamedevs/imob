/**
 * Romanian copy strings - Step 13
 * Organized by feature for easy maintenance
 */

export const ro = {
  // === Common ===
  common: {
    loading: "Se încarcă...",
    save: "Salvează",
    cancel: "Anulează",
    close: "Închide",
    edit: "Editează",
    delete: "Șterge",
    back: "Înapoi",
    next: "Următorul",
    previous: "Anterior",
    search: "Caută",
    filter: "Filtrează",
    reset: "Resetează",
    apply: "Aplică",
    learnMore: "Află mai multe",
    readMore: "Citește mai mult",
    showLess: "Arată mai puțin",
    noData: "Fără date",
  },

  // === Glossary Terms (short definitions for tooltips) ===
  glossary: {
    avm: {
      short: "Estimare de preț calculată automat din datele pieței",
      full: "Automated Valuation Model - sistem care estimează prețul unui imobil pe baza datelor istorice și a caracteristicilor proprietății. Folosim algoritmi avansați pentru a analiza mii de tranzacții și anunțuri.",
    },
    tts: {
      short: "Timpul estimat până la tranzacție (Time to Sell)",
      full: "Time to Sell - estimarea duratei necesare pentru vânzarea unui imobil la prețul actual. Se bazează pe cererea din zonă, caracteristicile proprietății și prețul de listă.",
    },
    eurm2: {
      short: "Preț pe metru pătrat util",
      full: "Prețul unui imobil împărțit la suprafața utilă (în metri pătrați). Metrica standard pentru compararea proprietăților similare.",
    },
    yield: {
      short: "Venit anual din chirie, după costuri tipice",
      full: "Randamentul net - procentul câștigat anual din chiriile estimate, după deducerea costurilor de întreținere, administrare și impozite. Formula: (Chirie anuală × 0.85) / Preț × 100",
    },
    seismic: {
      short: "Clasă de vulnerabilitate a clădirii (RS1–RS3 / Fără risc)",
      full: "Clasificarea seismică indică rezistența clădirii la cutremure. RS1 = risc ridicat, RS2 = risc mediu, RS3 = risc scăzut, Fără clasă = clădire modernă sau date insuficiente.",
    },
    confidence: {
      short: "Gradul de încredere în estimare",
      full: "Măsura fiabilității estimării, bazată pe numărul de date comparabile disponibile. Încredere mare = peste 50 proprietăți similare analizate.",
    },
    comparable: {
      short: "Proprietăți similare din zonă",
      full: "Imobile cu caracteristici asemănătoare (suprafață, camere, anul construcției) din aceeași zonă, folosite pentru estimarea prețului.",
    },
  },

  // === Report Page ===
  report: {
    title: "Raport de evaluare",
    subtitle: "Analiză completă pentru {address}",

    avm: {
      title: "Estimarea ta",
      range: "Interval estimat: {min}–{max}",
      recommendation:
        "Recomandare: publică între {recMin}–{recMax} pentru timp de vânzare mai scurt",
      confidenceLow: "Date puține în zonă; interval mai larg decât de obicei",
      confidenceMedium: "Estimare bazată pe date moderate",
      confidenceHigh: "Estimare bazată pe date extinse din zonă",
    },

    tts: {
      title: "Timp de vânzare",
      estimate: "Se vinde probabil în {min}–{max} zile la prețul curent",
      fast: "Prețul e aliniat cu cererea; interes ridicat în ultimele 30 zile",
      slow: "Cerere redusă sau preț mai mare decât media zonei",
      normal: "Timp de vânzare în medie pentru această zonă",
    },

    yield: {
      title: "Randament net",
      estimate: "Randament net estimat: {value}% (după costuri)",
      good: "Randament peste media zonei",
      average: "Randament în media zonei",
      low: "Randament sub media zonei",
    },

    seismic: {
      title: "Risc seismic",
      class: "Clasă {value} (încredere {confidence})",
      unknown: "Nu avem încă date suficient de bune pentru această adresă",
      none: "Clădire modernă sau neîncadrată în clasele RS",
      rs1: "Risc ridicat - consolidare recomandată",
      rs2: "Risc mediu - verificare periodică necesară",
      rs3: "Risc scăzut - structură rezistentă",
    },

    quality: {
      title: "Calitate anunț",
      score: "Scor: {value}/100",
      excellent: "Anunț complet și atractiv",
      good: "Anunț bun, dar poate fi îmbunătățit",
      average: "Anunț mediocru - adaugă detalii",
      poor: "Anunț incomplet - necesită îmbunătățiri majore",
    },
  },

  // === Discover Page ===
  discover: {
    title: "Descoperă proprietăți",
    filtersHint: "Filtre rapide. Apasă pentru a seta bugete și zone",

    empty: {
      title: "Nu am găsit potriviri",
      subtitle: "Încearcă să mărești prețul maxim sau adaugă alte zone",
      ctaReset: "Resetează filtrele",
      ctaPopular: "Vezi proprietăți populare în {area}",
    },

    badges: {
      underpriced: "Preț avantajos",
      fastTts: "Se vinde rapid",
      lowSeismic: "Risc seismic scăzut",
      sponsored: "Sponsorizat",
    },
  },

  // === Area Page ===
  area: {
    title: "Statistici zonă",
    subtitle: "Date imobiliare în timp real pentru {name}",

    empty: {
      title: "Încă adunăm date pentru zona asta",
      subtitle: "Îți vom arăta evoluția în curând",
      cta: "Vezi zone apropiate",
    },

    kpis: {
      medianPrice: "Preț median",
      growth12m: "Creștere 12 luni",
      rent: "Chirie medie",
      yield: "Randament net",
      tts: "Timp până la vânzare",
      seismic: "Risc seismic",
    },
  },

  // === Owners Page ===
  owners: {
    title: "Estimarea ta",
    subtitle: "Preț de piață și recomandări pentru vânzare",

    empty: {
      title: "Începe cu adresa sau un link de anunț",
      subtitle: "Estimarea durează ~60 secunde",
      cta: "Adaugă proprietate",
    },

    roi: {
      title: "Pregătește anunțul perfect",
      subtitle: "Îmbunătățiri care aduc mai mulți cumpărători",

      photos: {
        title: "Foto profesionale",
        description: "250–400 lei → mai multe vizualizări, timp mai scurt la vânzare",
        toggle: "Aplic deja",
      },

      paint: {
        title: "Zugrăvit alb",
        description: "1500–2500 lei → +1–3% la prețul perceput",
        toggle: "Aplic deja",
      },

      description: {
        title: "Descriere clară",
        description: "≥220 caractere → mai puține întrebări repetitive",
        toggle: "Aplic deja",
      },
    },

    wizard: {
      step1: "Adaugă adresa",
      step2: "Verifică detalii",
      step3: "Vezi rezultatul",
    },
  },

  // === Developments Page ===
  developments: {
    title: "Proiecte noi",
    subtitle: "{count} proiecte disponibile în București",

    empty: {
      title: "Nu am găsit proiecte",
      subtitle: "Încearcă să modifici filtrele sau zonele selectate",
      cta: "Resetează filtrele",
    },

    unitFinder: {
      title: "Găsește apartamentul potrivit",
      densityToggle: "Densitate afișare",
      compact: "Compact",
      comfortable: "Confortabil",
    },
  },

  // === Agent Workspace ===
  agent: {
    upload: {
      title: "Import anunțuri",
      subtitle: "Lipește până la 500 de linkuri — detectăm duplicatele automat",
      placeholder: "https://example.com/anunt1\nhttps://example.com/anunt2",
      cta: "Procesează linkurile",
    },

    portfolio: {
      empty: {
        title: "Încă nu ai adăugat nimic",
        subtitle: "Începe cu Import linkuri",
        cta: "Adaugă primul anunț",
      },
    },

    share: {
      title: "Portofoliu publicat",
      subtitle: "Poți trimite linkul către clienți sau colegi",
      copyLink: "Copiază linkul",
    },
  },

  // === Validation & Errors ===
  validation: {
    required: "Câmp obligatoriu",
    email: {
      invalid: "Adresa de email pare greșită",
      required: "Te rugăm să introduci adresa de email",
    },
    phone: {
      invalid: "Verifică formatul — ex. 07xx xxx xxx",
      required: "Te rugăm să introduci numărul de telefon",
    },
    url: {
      invalid: "Link invalid. Verifică formatul",
    },
    price: {
      min: "Prețul minim trebuie să fie mai mic decât maximul",
      invalid: "Introdu un preț valid",
    },
    area: {
      min: "Suprafața minimă trebuie să fie mai mică decât maximă",
      invalid: "Introdu o suprafață validă",
    },
  },

  // === Toasts ===
  toast: {
    success: {
      saved: "Salvat. Poți reveni oricând din Favorite",
      copied: "Copiat în clipboard",
      deleted: "Șters cu succes",
      updated: "Actualizat cu succes",
    },

    info: {
      estimatesDisclaimer:
        "Estimările sunt orientative. Verifică documentele imobilului înainte de decizie",
      processing: "Procesăm datele tale. Durează ~60 secunde",
    },

    warning: {
      seismicUncertain: "Date seismice incerte pentru clădirea aceasta",
      dataLimited: "Date limitate în zonă - estimare mai puțin precisă",
      rateLimit: "Ai trimis multe mesuri într-un timp scurt. Încearcă din nou în câteva minute",
    },

    error: {
      generic: "A apărut o eroare. Te rugăm să încerci din nou",
      pdfFailed: "Nu am putut genera PDF-ul acum. Încearcă din nou",
      networkError: "Problemă de conexiune. Verifică internetul",
      notFound: "Nu am găsit ceea ce cauți",
    },
  },

  // === Email Templates ===
  email: {
    magicLink: {
      subject: "Conectează-te la {brand}",
      greeting: "Salut!",
      body: "Apasă pe buton pentru a te conecta. Linkul expiră în 15 minute.",
      button: "Conectează-te",
      footer: "Dacă nu ai cerut acest email, ignoră-l.",
    },

    lead: {
      subject: "Ai primit un mesaj pentru {property}",
      greeting: "Bună ziua,",
      body: "Cineva este interesat de proprietatea ta:",
      cta: "Vezi mesajul complet",
      footer: "Răspunde direct la acest email pentru a continua conversația.",
    },
  },

  // === Onboarding Nudges ===
  onboarding: {
    discover: {
      filters: "Filtre rapide. Apasă pentru a seta bugete și zone",
    },
    report: {
      kpis: "Estimări pentru această proprietate. Apasă pe ⓘ pentru explicații",
    },
    owners: {
      checklist: "Urmează acești pași pentru un anunț perfect",
    },
  },
} as const;

// Type helper for autocomplete
export type TranslationKey = typeof ro;

// Format number for Romanian locale
export function formatNumberRo(value: number, decimals = 0): string {
  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Format currency for Romanian locale
export function formatCurrencyRo(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Format percentage for Romanian locale
export function formatPercentRo(value: number, decimals = 1): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

// Template string replacement helper
export function t(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key]?.toString() || match;
  });
}
