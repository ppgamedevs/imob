import * as cheerio from "cheerio";

import { extractLatLngFromHtml } from "@/lib/geo/extract-coords-from-html";

import type { DiscoverResult, SourceAdapter } from "../types";

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export const adapterPubli24: SourceAdapter = {
  domain: "publi24.ro",

  async discover(listUrl: URL): Promise<DiscoverResult> {
    const res = await fetch(listUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const links: string[] = [];
    const pushListing = (href: string | undefined) => {
      if (!href) return;
      const absolute = new URL(href, listUrl).toString();
      if (!absolute.includes("publi24.ro")) return;
      const p = new URL(absolute).pathname.split("/").filter(Boolean);
      if (href.includes("/anunt/")) {
        links.push(absolute);
        return;
      }
      if (absolute.includes("/anunturi/imobiliare/de-vanzare/") && p.length >= 6) {
        links.push(absolute);
      }
    };
    $('a[href*="/anunt/"]').each((_, el) => pushListing($(el).attr("href")));
    $('a[href*="/anunturi/imobiliare/de-vanzare/"]').each((_, el) =>
      pushListing($(el).attr("href")),
    );

    const nextHref =
      $('a[rel="next"]').attr("href") ||
      $('a:contains("Următoarea")').attr("href") ||
      $('a:contains("Urmatoarea")').attr("href");
    const next = nextHref ? new URL(nextHref, listUrl).toString() : null;

    return { links: [...new Set(links)], next };
  },

  async extract({ url, html }) {
    const $ = cheerio.load(html);
    const rawHtml = html as string;

    // --- JSON-LD (@graph + arrays) ---
    const ldNodes: Record<string, unknown>[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw = $(el).html()?.trim();
        if (!raw) return;
        const obj = JSON.parse(raw) as unknown;
        if (Array.isArray(obj)) {
          for (const n of obj) if (n && typeof n === "object") ldNodes.push(n as Record<string, unknown>);
        } else if (obj && typeof obj === "object" && Array.isArray((obj as { "@graph"?: unknown[] })["@graph"])) {
          for (const n of (obj as { "@graph": unknown[] })["@graph"]) {
            if (n && typeof n === "object") ldNodes.push(n as Record<string, unknown>);
          }
        } else if (obj && typeof obj === "object") {
          ldNodes.push(obj as Record<string, unknown>);
        }
      } catch {
        /* ignore */
      }
    });

    const isProductLike = (n: Record<string, unknown>) => {
      const t = n["@type"];
      if (Array.isArray(t)) {
        return t.some((x) => /Product|RealEstate|Residence|Apartment|House|Offer|ProductModel/i.test(String(x)));
      }
      if (typeof t === "string") {
        return /Product|RealEstate|Residence|Apartment|House|Offer|ProductModel/i.test(t);
      }
      return false;
    };

    let ldData: Record<string, unknown> =
      ldNodes.find((n) => isProductLike(n) && (n.name || n.offers)) ??
      ldNodes.find((n) => n.name && (n.offers || n.price)) ??
      ldNodes.find((n) => n.name) ??
      ldNodes[0] ??
      {};
    const ldOffers = (ldData.offers && typeof ldData.offers === "object"
      ? ldData.offers
      : {}) as Record<string, unknown>;

    function coercePrice(raw: unknown): number | undefined {
      if (raw == null) return undefined;
      if (typeof raw === "number" && Number.isFinite(raw)) return Math.round(raw);
      if (typeof raw === "object" && raw !== null && "price" in raw) {
        return coercePrice((raw as { price: unknown }).price);
      }
      const s = String(raw).replace(/[^\d]/g, "");
      if (s.length >= 4) return parseInt(s, 10);
      const loose = String(raw).replace(/[\s.]/g, "").replace(",", ".");
      const n = parseFloat(loose);
      return Number.isFinite(n) ? Math.round(n) : undefined;
    }

    // --- Title ---
    const title =
      (ldData.name as string) ||
      $('meta[property="og:title"]').attr("content")?.trim() ||
      ($("h1").first().text().trim() ||
        $("title").text().split("|")[0]?.trim() ||
        $("title").text().split("•")[0]?.trim());

    // --- Price ---
    let price: number | undefined;
    let currency = "EUR";

    // Publi24 shows "45 000 EUR 1552 EUR/m2" near title
    const priceRegex = /([\d][\d\s.,]*)\s*(?:EUR|€)/i;
    const ronRegex = /([\d][\d\s.,]*)\s*(?:RON|lei)/i;

    // Try from JSON-LD first
    const ldPrice =
      Object.keys(ldOffers).length > 0 ? ldOffers.price ?? (ldOffers as { lowPrice?: unknown }).lowPrice : ldData.price;
    if (ldPrice != null) {
      price = coercePrice(ldPrice);
      const ldCurrency =
        Object.keys(ldOffers).length > 0
          ? ldOffers.priceCurrency ?? (ldOffers as { priceCurrency?: unknown }).priceCurrency
          : ldData.priceCurrency;
      if (ldCurrency) currency = String(ldCurrency).toUpperCase();
    }

    // Fallback to HTML
    if (!price) {
      const priceZone = $("h1").parent().text() + " " + $('[class*="price"]').text();
      const eurMatch = priceZone.match(priceRegex);
      if (eurMatch) {
        price = coercePrice(eurMatch[1]);
      } else {
        const ronMatch = priceZone.match(ronRegex);
        if (ronMatch) {
          price = coercePrice(ronMatch[1]);
          currency = "RON";
        }
      }
    }

    // Final fallback: full body text
    if (!price) {
      const bodyMatch = rawHtml.match(priceRegex);
      if (bodyMatch) price = coercePrice(bodyMatch[1]);
    }

    // --- Specs ---
    // Publi24 has a "Specificatii" section with labels and values
    // e.g. "Suprafata utila" in one element, "30 m2" in next sibling or child
    function findSpec(label: string): string | undefined {
      const lf = stripDiacritics(label.toLowerCase());
      let result: string | undefined;

      // Strategy 1: walk elements looking for label text
      $("div, dt, td, span, li, th, strong, b, p").each((_, el) => {
        if (result) return;
        const node = $(el);
        const nodeText = node.text().trim();
        const text = stripDiacritics(nodeText.toLowerCase());
        if (!text.includes(lf) || text.length > 100) return;

        // Value in next sibling
        const sibling = node.next();
        const sibText = sibling.text().trim();
        if (sibText && sibText.length < 80 && sibText.toLowerCase() !== text) {
          result = sibText;
          return;
        }

        // Value inline after label (e.g. "Suprafata utila\n29 m2")
        const parent = node.parent();
        const parentText = stripDiacritics(parent.text().trim());
        const escaped = stripDiacritics(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(escaped + "[:\\s]+(.+)", "i");
        const m = parentText.match(re);
        if (m) {
          const val = m[1].trim().split("\n")[0].trim();
          if (val.length < 80) result = val;
          return;
        }

        // Value in child elements (e.g. <span>label</span> <span>value</span>)
        const children = node.children();
        if (children.length >= 2) {
          const lastChild = children.last().text().trim();
          if (lastChild && lastChild.length < 80) result = lastChild;
        }
      });

      // Strategy 2: regex on diacritic-stripped raw HTML
      if (!result) {
        const escaped = stripDiacritics(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(
          escaped + `[^<]*<\\/[^>]+>\\s*(?:<[^>]+>\\s*)*([^<]{1,80})`,
          "i",
        );
        const m = stripDiacritics(rawHtml).match(re);
        if (m?.[1]) result = m[1].trim();
      }

      return result;
    }

    // Area
    let areaM2: number | undefined;
    const areaText = findSpec("Suprafat");
    if (areaText) {
      const m = areaText.match(/([\d.,]+)/);
      if (m) areaM2 = parseInt(m[1]);
    }
    if (!areaM2) {
      const match = rawHtml.match(/(\d{2,3})\s*(?:m2|m²|mp)\b/i);
      if (match) areaM2 = parseInt(match[1]);
    }

    // Rooms
    let rooms: number | undefined;
    const roomsText = findSpec("Numar camere") ?? findSpec("camere");
    if (roomsText) {
      const m = roomsText.match(/(\d+)/);
      if (m) rooms = parseInt(m[1]);
    }
    if (!rooms && /\bgarsonier/i.test(title ?? "")) rooms = 1;

    // Floor
    let floorRaw: string | undefined;
    const floorText = findSpec("Etaj");
    if (floorText && floorText.length < 50) {
      floorRaw = floorText.replace(/^etaj\s*/i, "").trim();
    }

    // Year built
    let yearBuilt: number | undefined;
    const yearText = findSpec("Anul construc") ?? findSpec("An construc");
    if (yearText) {
      const m = yearText.match(/(\d{4})/);
      if (m) yearBuilt = parseInt(m[1]);
    }

    // Compartimentare
    const compartiment = findSpec("Compartimentare") ?? findSpec("compartimentare");

    // Address: publi24 shows "Bucuresti,Sector 6 Crangasi" near the title
    let addressRaw: string | undefined;
    const addrMeta = $('[itemprop="address"]').text().trim();
    if (addrMeta) {
      addressRaw = addrMeta;
    } else {
      // Look for "Sector" or city + neighborhood near title
      const locationText = $('a[href*="sector"], a[href*="judet"]').first().parent().text().trim();
      if (locationText && locationText.length < 100) {
        addressRaw = locationText.replace(/\s+/g, " ");
      }
    }
    // Fallback: search for common Romanian city/sector patterns
    if (!addressRaw) {
      const cityMatch = rawHtml.match(/(?:Bucuresti|Cluj|Iasi|Timisoara|Constanta|Brasov)[,\s]+(?:Sector\s*\d|[A-Z][a-z]+)/i);
      if (cityMatch) addressRaw = cityMatch[0].trim();
    }

    // Photos
    const photos: string[] = [];
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogImage && ogImage.startsWith("http")) photos.push(ogImage);

    const $photoRoot = $(
      "[class*='listing-'], [class*='gallery'], [class*='anunt-'], [id*='photo'], #listing, main article",
    ).first();
    const $pScope = $photoRoot.length ? $photoRoot : $("body");
    $pScope.find("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (
        src &&
        src.startsWith("http") &&
        !src.includes("placeholder") &&
        !src.includes("no-photo") &&
        !src.includes("logo") &&
        !src.includes("icon") &&
        !src.includes("avatar") &&
        !src.includes("badge") &&
        !src.includes("google") &&
        !src.includes("facebook") &&
        !src.includes("apple") &&
        (src.includes("publi24") ||
          src.includes("romimo") ||
          src.includes("cdn") ||
          src.includes("cloudfront") ||
          src.includes("amazonaws") ||
          src.includes("img.") ||
          /\.(jpe?g|png|webp)(\?|$)/i.test(src))
      ) {
        photos.push(src);
      }
    });

    // Geocode
    let lat: number | undefined;
    let lng: number | undefined;
    $("script").each((_, el) => {
      if (lat && lng) return;
      const text = $(el).html() ?? "";
      const latM = text.match(/["']?lat(?:itude)?["']?\s*[:=]\s*([\d.]+)/);
      const lngM = text.match(/["']?l(?:ng|ong(?:itude)?)["']?\s*[:=]\s*([\d.]+)/);
      if (latM && lngM) {
        const pLat = parseFloat(latM[1]);
        const pLng = parseFloat(lngM[1]);
        if (pLat > 43 && pLat < 49 && pLng > 20 && pLng < 30) {
          lat = pLat;
          lng = pLng;
        }
      }
    });
    if (lat == null || lng == null) {
      const geo = extractLatLngFromHtml(rawHtml);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      }
    }

    // Description
    let description: string | undefined;
    const descHeading = $("h5:contains('Descriere'), h4:contains('Descriere'), h3:contains('Descriere')");
    if (descHeading.length) {
      const descEl = descHeading.first().nextAll("div, p").first();
      description = descEl.text().trim().slice(0, 2000) || undefined;
    }
    if (!description) {
      const descEl = $("[class*=description], [class*=descriere]").first();
      if (descEl.length) description = descEl.text().trim().slice(0, 2000) || undefined;
    }
    if (!description) {
      description = $('meta[name="description"]').attr("content")?.trim() || undefined;
    }

    // Seller type
    let sellerType: string | undefined;
    const bodyText = rawHtml.toLowerCase();
    if (/\b(?:agentie|agenție|agent imobiliar|intermediar)\b/.test(bodyText)) sellerType = "agentie";
    else if (/\b(?:proprietar|particular)\b/.test(bodyText)) sellerType = "proprietar";
    else if (/\b(?:dezvoltator|constructor)\b/.test(bodyText)) sellerType = "dezvoltator";

    return {
      extracted: {
        title,
        price,
        currency,
        areaM2,
        rooms,
        floorRaw,
        yearBuilt,
        addressRaw,
        lat,
        lng,
        photos: [...new Set(photos)].slice(0, 20),
        sourceMeta: {
          source: "publi24.ro",
          description,
          sellerType,
          compartimentare: compartiment,
          extractedAt: new Date().toISOString(),
        },
      },
    };
  },
};
