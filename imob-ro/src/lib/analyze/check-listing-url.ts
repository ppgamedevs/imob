import type { AnalyzeFailureReason } from "./analyze-failure-reasons";
import { SUPPORTED_LISTING_DOMAINS_RO } from "./analyze-failure-reasons";

const SUPPORTED_HOSTS = new Set<string>(SUPPORTED_LISTING_DOMAINS_RO);

type Ok = { ok: true };
type Fail = { ok: false; reason: AnalyzeFailureReason; message: string };

const MSG = {
  rental:
    "ImobIntel analizează doar anunțuri de vânzare. Suportul pentru chirii este în construcție, fără dată anunțată public.",
  nonRes:
    "ImobIntel analizează doar proprietăți rezidențiale (apartamente, case, vile, garsoniere). Spațiile comerciale, terenurile și birourile nu sunt suportate.",
  searchImob:
    "Acest link pare a fi o pagină de căutare, nu o fișă de anunț. Lipește linkul direct al unui anunț, de ex. imobiliare.ro/…/apartament-de-vanzare-… (o singură ofertă).",
  searchGeneric:
    "Acest link pare a fi o pagină de listă sau de căutare, nu fisa unui anunț individual. ImobIntel are nevoie de URL-ul unui anunț concret, cu o singură ofertă.",
  olxNon:
    "Acest link nu este un anunț imobiliar în categoria așteptată. ImobIntel analizează doar apartamente și locuințe de vânzare, din categoria imobiliare pe OLX.",
} as const;

/**
 * Synchronous URL validation (portal rules, vânzare vs închiriere, listă vs detaliu).
 */
export function checkListingUrl(urlStr: string): Ok | Fail {
  try {
    const u = new URL(urlStr);
    let host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "m.publi24.ro") host = "publi24.ro";
    const path = u.pathname.toLowerCase();

    if (!SUPPORTED_HOSTS.has(host)) {
      return {
        ok: false,
        reason: "unsupported_domain",
        message: `Site-ul ${host} nu este suportat încă. Poți folosi linkuri de pe: ${SUPPORTED_LISTING_DOMAINS_RO.join(", ")}. Nu putem confirma când alte domenii intră: depinde de sursă, structură și acces de citire.`,
      };
    }

    if (host === "imobiliare.ro") {
      if (/\/inchirieri?[/-]/.test(path)) {
        return { ok: false, reason: "rental_not_sale", message: MSG.rental };
      }
      const NON_RES_RE = /\/(vanzare-)?(spatii?-comercial|terenuri|birouri|hale|afaceri|spatii?-industriale)/;
      const NON_RES_OFERTA = /\/oferta\/(spatiu-comercial|teren|birou|hala|afacere|spatiu-industrial)-de-vanzare/;
      if (NON_RES_RE.test(path) || NON_RES_OFERTA.test(path)) {
        return { ok: false, reason: "non_residential", message: MSG.nonRes };
      }
      if (path.startsWith("/oferta/")) return { ok: true };
      if (/\/[a-z0-9-]+-\d{4,}$/.test(path)) return { ok: true };
      if (/^\/vanzare-[^/]+\/[^/]+(\/[^/]+)?$/.test(path) && !/-\d{4,}$/.test(path)) {
        return { ok: false, reason: "search_listing_index", message: MSG.searchImob };
      }
      return { ok: true };
    }

    if (host === "storia.ro") {
      if (/\/inchirieri?[/-]/.test(path) || /\/de-inchiriat\b/.test(path)) {
        return { ok: false, reason: "rental_not_sale", message: MSG.rental };
      }
      if (/\/(spatii?-comercial|terenuri|birouri|hale|afaceri)/.test(path)) {
        return { ok: false, reason: "non_residential", message: MSG.nonRes };
      }
      if (path.includes("/oferta/")) return { ok: true };
      if (path.includes("/rezultate/")) {
        return { ok: false, reason: "search_listing_index", message: MSG.searchGeneric };
      }
      return { ok: true };
    }

    if (host === "olx.ro") {
      if (!path.includes("/d/oferta/")) {
        if (path.includes("/imobiliare/") || path === "/" || /^\/[a-z-]+\/?$/.test(path)) {
          return { ok: false, reason: "search_listing_index", message: MSG.searchGeneric };
        }
      }
      const NON_REALESTATE_SLUGS = [
        "auto-moto",
        "electronice",
        "moda",
        "casa-gradina",
        "animale",
        "agro-industrie",
        "sport-hobby",
        "piese-auto",
        "servicii",
        "locuri-de-munca",
        "mama-copilul",
      ];
      for (const slug of NON_REALESTATE_SLUGS) {
        if (path.includes(`/${slug}/`)) {
          return { ok: false, reason: "olx_non_realestate", message: MSG.olxNon };
        }
      }
      return { ok: true };
    }

    if (host === "publi24.ro") {
      if (/\/de-inchiriat\b|\/inchirieri?\b/.test(path)) {
        return { ok: false, reason: "rental_not_sale", message: MSG.rental };
      }
      const PUBLI24_NON_RES = /\/(?:terenuri|spatii-comerciale|birouri|hale|afaceri|spatii-industriale)\//;
      if (PUBLI24_NON_RES.test(path)) {
        return { ok: false, reason: "non_residential", message: MSG.nonRes };
      }
      if (path.includes("/anunt/")) return { ok: true };
      if (/\/\d+$/.test(path)) return { ok: true };
      if (path.includes("/anunturi/imobiliare/de-vanzare/")) {
        const depth = path.split("/").filter(Boolean).length;
        if (depth >= 6) return { ok: true };
      }
      if (path.includes("/anunturi/") && !path.includes("/anunt/")) {
        return { ok: false, reason: "search_listing_index", message: MSG.searchGeneric };
      }
      return { ok: true };
    }

    if (host === "lajumate.ro") {
      if (path.includes("/ad/")) return { ok: true };
      if (/\d{5,}/.test(path)) return { ok: true };
      if (/^\/[a-z-]+\/[a-z-]+$/.test(path) && !path.includes("/ad/")) {
        return { ok: false, reason: "search_listing_index", message: MSG.searchGeneric };
      }
      return { ok: true };
    }

    if (host === "homezz.ro") {
      if (/\d{4,}\.html$/.test(path)) return { ok: true };
      if (path.includes("/anunt/") || path.includes("/oferta/") || path.includes("/proprietate/")) return { ok: true };
      if (path === "/" || /^\/[a-z-]+\/?$/.test(path)) {
        return { ok: false, reason: "search_listing_index", message: MSG.searchGeneric };
      }
      return { ok: true };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: "invalid_url", message: "URL invalid." };
  }
}

export function getSupportedDomainsList(): readonly string[] {
  return SUPPORTED_LISTING_DOMAINS_RO;
}
