import type { AnalyzeFailureReason } from "./analyze-failure-reasons";
import { SUPPORTED_LISTING_DOMAINS_RO } from "./analyze-failure-reasons";

export function supportedDomainsListRo(): string {
  return SUPPORTED_LISTING_DOMAINS_RO.join(", ");
}

type Block = { title: string; body: string; next: string[] };

const BLOCKS: Record<AnalyzeFailureReason, Block> = {
  unsupported_domain: {
    title: "Acest site nu e încă suportat",
    body: "ImobIntel citește anunțuri de pe câteva portaluri, ca să poată extrage structurat preț, suprafață și zonă. Dacă linkul tău e de pe alt domeniu, analiza automată nu pornește. Nu putem promite termen pentru fiecare site nou: integrările depind de acces, format și cât de bine e structurat anunțul.",
    next: [
      "Încearcă un anunț de vânzare de pe unul dintre domeniile de mai jos, cu link direct către fisa apartamentului.",
      "Dacă ai doar acest site, deschide un anunț echivalent pe un portal suportat și lipește acel link aici.",
    ],
  },
  search_listing_index: {
    title: "Acesta e o pagină de listă sau de căutare, nu fisa unui anunț",
    body: "ImobIntel are nevoie de URL-ul direct al unui singur anunț: pagina pe care stau prețul, suprafața și descrierea acelui apartament. O pagină cu zeci de rezultate, filtre sau „toate ofertele” nu e suficient de precisă.",
    next: [
      "Deschide anunțul pe care vrei evaluare, apoi lipește adresa din bara de sus (fisa detaliu).",
      "Dacă ești pe mobil, apasă pe anunț până vezi fisa, apoi copiază linkul.",
    ],
  },
  rental_not_sale: {
    title: "Anunț de închiriere: raportul e doar pentru vânzări",
    body: "Momentan ne concentrăm pe anunțuri de vânzare. Nu îți promitem suport imediat pentru chirii, ca să nu îți dăm o estimare greșită fără date.",
    next: [
      "Dacă cauți un apartament de cumpărat, lipește un anunț de vânzare.",
      "Dacă voiai închiriere, revenim când o vom putea trata onest; poți părăsi adresa de mai jos dacă vrei o notificare când reîncercăm categoria asta (fără garanții de termen).",
    ],
  },
  non_residential: {
    title: "Acest anunț nu e pentru locuință (rezidențial)",
    body: "ImobIntel tratează garsoniere, apartamente, case, duplexuri și asemenea. Spații comerciale, terenuri, birouri sau alte categorii au alt tip de piață și de reguli.",
    next: [
      "Găsește un anunț rezidențial de vânzare suportat și lipește acel link.",
    ],
  },
  olx_non_realestate: {
    title: "Link din altă secțiune OLX, nu imobiliare",
    body: "Pe OLX, trebuie să fie categoria de imobiliare / anunț de apartament de vânzare, nu alte categorii.",
    next: [
      "Mergi la anunțul din categoria imobiliare, deschide fisa, copiază URL-ul aici.",
    ],
  },
  invalid_url: {
    title: "URL invalid sau nesigur",
    body: "Linkul trebuie să fie un HTTP(S) complet, fără caractere nepermise, și să ducă la o pagină de anunț.",
    next: [
      "Copiază adresa direct din bara de adrese a browserului, după ce s-a încărcat fisa de anunț.",
    ],
  },
  extraction_failed: {
    title: "Nu am reușit să citim anunțul",
    body: "Nu s-au primit date folosibile din acest anunț: uneori sursa e temporar inaccesibilă, anunțul e blocat pentru acces automat, sau răspunsul nu a putut fi citit. Nu înseamnă neapărat o problemă la tine.",
    next: [
      "Reîncearcă peste câteva minute; multe dintre aceste situații se rezolvă la a doua încercare.",
      "Verifică că linkul e încă public și se deschide normal în browser, fără captcha forțat.",
      "Dacă poți, încearcă același anunț pe un alt portal suportat, dacă e publicat dublu.",
    ],
  },
  fetch_timeout_blocked: {
    title: "Sursa nu a răspuns la timp sau a blocat accesul automat",
    body: "Unele site-uri limitează accesul tehnic, întorc erori 403/429, sau răspund prea lent. ImobIntel citește anunțul fără browser deschis la tine, deci uneori cade până la afișare.",
    next: [
      "Reîncearcă peste câteva minute (serverele portalului se pot liniști).",
      "Deschide anunțul manual în același timp, apoi retrimite linkul: uneori pagina redevine accesibilă.",
      "Dacă eroarea se repetă, același anunț de pe un alt domeniu suportat, dacă există, poate merge mai bine.",
    ],
  },
  missing_price: {
    title: "Lipsește prețul (sau nu l-am recunoscut) în acest anunț",
    body: "Fără un preț numeric, nu putem ancoră corect raportul la piață. Anunțurile fără preț, „la cerere fără cifră” sau doar discuții la telefon ne lasă fără semnal clar.",
    next: [
      "Alege un anunț care afișează un preț clar în fisa respectivă.",
      "Dacă site-ul tău e suportat dar prețul e ascuns, încă nu putem continua: poți alege un alt anunț sau ne poți scrie (vezi notița despre domenii noi, fără promisiune de termen).",
    ],
  },
  missing_area: {
    title: "Lipsește suprafața (sau nu am extras-o) în acest anunț",
    body: "Metrajul (mp) e necesar ca să comparăm pe metru pătrat cu alte oferte. Dacă anunțul nu îl dă, sau îl pune atât de rău încât extragerea eșuează, oprim aici ca să nu îți dăm o analiză în gol.",
    next: [
      "Găsește un anunț unde suprafața e trecută clar în fisa principală (nu doar «după acte la vizionare» fără cifră).",
    ],
  },
  pipeline_error: {
    title: "Analiza s-a oprit pe parcurs",
    body: "A apărut o eroare internă când prelucram datele. Nu ține de «cifra» din raport, ci de o problemă tehnică la pasul de calcul. Poți reîncerca; dacă se repetă, e util să ne scrii cu linkul de anunț.",
    next: [
      "Reîncearcă același link peste câteva minute.",
      "Dacă dă mereu, folosește un alt anunț echivalent de pe un portal suportat, ca test.",
    ],
  },
};

export function getAnalyzeFailureCopyRo(reason: AnalyzeFailureReason): Block {
  return BLOCKS[reason] ?? BLOCKS.extraction_failed;
}
