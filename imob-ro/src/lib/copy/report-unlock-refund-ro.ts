/**
 * Public copy: scope for report-unlock refunds (human review; money movement in Stripe, not in-app automation).
 */
export const REPORT_UNLOCK_REFUND_POLICY_RO =
  "Dacă raportul complet nu poate fi generat din cauza unei erori tehnice sau nu conține datele promise, ne poți scrie pentru verificare și rambursare.";

export const REPORT_UNLOCK_NO_REFUND_FOR_DISAGREEMENT_RO =
  "Nu oferim rambursare doar din cauză că nu ești de acord cu estimarea sau cu concluziile: raportul este orientativ, nu o garanție de tranzacție sau de preț.";

export const pricingFaqRefunds: { q: string; a: string }[] = [
  {
    q: "Pot primi banii înapoi?",
    a: `${REPORT_UNLOCK_REFUND_POLICY_RO} ${REPORT_UNLOCK_NO_REFUND_FOR_DISAGREEMENT_RO} Contactul se face prin formular; verificăm cazul, iar rambursările aprobate se gestionează prin Stripe. Drepturile legale de consumator rămân cele prevăzute de lege.`,
  },
  {
    q: "Ce înseamnă raport cu date insuficiente?",
    a: "Înseamnă că din anunț sau din piață nu avem destule semnale: puține comparabile, câmpuri goale, interval larg, încredere scăzută. Spunem când o secțiune e subțire sau incertă. Nu e același lucru cu o eroare tehnică care împiedică generarea unui raport deblocat complet.",
  },
  {
    q: "Ce se întâmplă dacă anunțul nu poate fi analizat?",
    a: "Dacă analiza nu reușește (de exemplu eroare de extragere, site blochează, URL neacceptat) primești o explicație în aplicație; nu treci la un raport complet plătit folosind acel flux. Dacă ai făcut deja o plată și apare o eroare gravă de livrare a raportului, scrie-ne pentru verificare, conform politicii de rambursare de mai sus.",
  },
];
