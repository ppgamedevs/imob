import * as cheerio from "cheerio";

import type { DiscoverResult, SourceAdapter } from "../types";

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
    $('a[href*="/anunt/"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("/anunt/")) {
        const absolute = new URL(href, listUrl).toString();
        if (absolute.includes("publi24.ro")) {
          links.push(absolute);
        }
      }
    });

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

    // --- JSON-LD ---
    let ld: Record<string, unknown> | null = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      if (ld) return;
      try {
        const obj = JSON.parse($(el).html() ?? "");
        const node = Array.isArray(obj) ? obj[0] : obj;
        if (node?.["@type"] || node?.name) ld = node;
      } catch { /* ignore */ }
    });

    // --- Title ---
    const title =
      (ld?.name as string) ??
      ($("h1").first().text().trim() ||
        $("title").text().split("|")[0]?.trim() ||
        $("title").text().split("•")[0]?.trim());

    // --- Price ---
    let price: number | undefined;
    let currency = "EUR";

    // Publi24 shows "45 000 EUR 1552 EUR/m2" near title
    const priceRegex = /([\d][.\d\s]*\d)\s*(?:EUR|€)/i;
    const ronRegex = /([\d][.\d\s]*\d)\s*(?:RON|lei)/i;

    // Try from JSON-LD first
    const ldPrice = ld?.offers
      ? (ld.offers as Record<string, unknown>)?.price
      : ld?.price;
    if (ldPrice) {
      price = parseInt(String(ldPrice).replace(/[\s,.]/g, ""));
      const ldCurrency = ld?.offers
        ? (ld.offers as Record<string, unknown>)?.priceCurrency
        : ld?.priceCurrency;
      if (ldCurrency) currency = String(ldCurrency).toUpperCase();
    }

    // Fallback to HTML
    if (!price) {
      const priceZone = $("h1").parent().text() + " " + $('[class*="price"]').text();
      const eurMatch = priceZone.match(priceRegex);
      if (eurMatch) {
        price = parseInt(eurMatch[1].replace(/[\s.]/g, ""));
      } else {
        const ronMatch = priceZone.match(ronRegex);
        if (ronMatch) {
          price = parseInt(ronMatch[1].replace(/[\s.]/g, ""));
          currency = "RON";
        }
      }
    }

    // Final fallback: full body text
    if (!price) {
      const bodyMatch = rawHtml.match(priceRegex);
      if (bodyMatch) price = parseInt(bodyMatch[1].replace(/[\s.]/g, ""));
    }

    // --- Specs ---
    // Publi24 has a "Specificatii" section with labels and values
    // e.g. "Suprafata utila" in one element, "30 m2" in next sibling or child
    function findSpec(label: string): string | undefined {
      const lf = label.toLowerCase();
      let result: string | undefined;

      // Strategy 1: walk elements looking for label text
      $("div, dt, td, span, li, th, strong, b, p").each((_, el) => {
        if (result) return;
        const node = $(el);
        const nodeText = node.text().trim();
        const text = nodeText.toLowerCase();
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
        const parentText = parent.text().trim();
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

      // Strategy 2: regex on raw HTML
      if (!result) {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(
          escaped + `[^<]*<\\/[^>]+>\\s*(?:<[^>]+>\\s*)*([^<]{1,80})`,
          "i",
        );
        const m = rawHtml.match(re);
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

    $("img").each((_, el) => {
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
        (src.includes("publi24") || src.includes("romimo") || src.includes("cdn") || src.includes("cloudfront"))
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
