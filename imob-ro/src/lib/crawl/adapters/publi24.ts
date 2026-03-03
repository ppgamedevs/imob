import * as cheerio from "cheerio";

import type { DiscoverResult, SourceAdapter } from "../types";

/**
 * Find a spec value by its label text in publi24's "Specificatii" section.
 * The section uses heading/content pairs (often divs or dt/dd).
 */
function findSpec($: cheerio.CheerioAPI, labelFragment: string): string | undefined {
  const lf = labelFragment.toLowerCase();
  let result: string | undefined;

  // Strategy 1: walk all small text containers and match label
  $("div, dt, td, span, li, th").each((_, el) => {
    if (result) return;
    const node = $(el);
    const text = node.contents().filter((_, c) => c.type === "text").text().trim();
    if (!text.toLowerCase().includes(lf)) return;

    // Value is often the next sibling element
    const sibling = node.next();
    const sibText = sibling.text().trim();
    if (sibText && sibText.length < 100 && sibText.length > 0) {
      result = sibText;
    }
  });

  // Strategy 2: regex on raw HTML for "label</...>...<...>value" patterns
  if (!result) {
    const re = new RegExp(
      labelFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        `[^<]*<\\/[^>]+>\\s*(?:<[^>]+>\\s*)*([^<]{1,80})`,
      "i",
    );
    const html = $.html();
    const m = html.match(re);
    if (m?.[1]) result = m[1].trim();
  }

  return result;
}

export const adapterPubli24: SourceAdapter = {
  domain: "publi24.ro",

  async discover(listUrl: URL): Promise<DiscoverResult> {
    const res = await fetch(listUrl.toString(), {
      headers: { "User-Agent": "ImobIntelBot/1.0 (+https://imobintel.ro/bot)" },
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

    // Title: first h1 on page (publi24 uses plain <h1>)
    const title =
      $("h1").first().text().trim() ||
      $("title").text().split("|")[0]?.trim() ||
      $("title").text().split("•")[0]?.trim();

    // Price: look for EUR/RON pattern near h1
    let price: number | undefined;
    let currency = "EUR";
    // Publi24 shows "45 000 EUR" near the title
    const priceContainer =
      $("h1").parent().text() ||
      $('[class*="price"]').first().text() ||
      $("body").text();
    const priceMatch = priceContainer.match(/([\d\s.,]+)\s*(?:EUR|€)/i);
    if (priceMatch) {
      price = parseInt(priceMatch[1].replace(/[\s,.]/g, ""));
    }
    if (!price) {
      const ronMatch = priceContainer.match(/([\d\s.,]+)\s*(?:RON|lei)/i);
      if (ronMatch) {
        price = parseInt(ronMatch[1].replace(/[\s,.]/g, ""));
        currency = "RON";
      }
    }

    // Specs: publi24 has a "Specificatii" section with labeled pairs
    let areaM2: number | undefined;
    const areaText = findSpec($, "Suprafat");
    const areaMatch = areaText?.match(/([\d.,]+)\s*m/i);
    if (areaMatch) areaM2 = parseInt(areaMatch[1]);

    // Rooms
    let rooms: number | undefined;
    const roomsText = findSpec($, "Numar camere") ?? findSpec($, "camere");
    const roomsMatch = roomsText?.match(/(\d+)/);
    if (roomsMatch) rooms = parseInt(roomsMatch[1]);
    if (!rooms && /\bgarsonier/i.test(title ?? "")) rooms = 1;

    // Floor
    let floorRaw: string | undefined;
    const floorText = findSpec($, "Etaj");
    if (floorText && floorText.length < 50) floorRaw = floorText;

    // Year built
    let yearBuilt: number | undefined;
    const yearText = findSpec($, "Anul construc") ?? findSpec($, "An construc");
    const yearMatch = yearText?.match(/(\d{4})/);
    if (yearMatch) yearBuilt = parseInt(yearMatch[1]);

    // Address
    const addressRaw =
      $('[itemprop="address"]').text().trim() ||
      $("a[href*='sector'], a[href*='judet']").first().parent().text().trim().replace(/\s+/g, " ") ||
      undefined;

    // Photos
    const photos: string[] = [];
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (
        src &&
        src.startsWith("http") &&
        !src.includes("placeholder") &&
        !src.includes("no-photo") &&
        !src.includes("logo") &&
        !src.includes("icon") &&
        !src.includes("avatar")
      ) {
        photos.push(src);
      }
    });

    // Geocode from inline scripts
    let lat: number | undefined;
    let lng: number | undefined;
    $("script").each((_, el) => {
      if (lat && lng) return;
      const text = $(el).html() ?? "";
      const latM = text.match(/["']?lat(?:itude)?["']?\s*[:=]\s*([\d.]+)/);
      const lngM = text.match(/["']?l(?:ng|ong(?:itude)?)["']?\s*[:=]\s*([\d.]+)/);
      if (latM && lngM) {
        const parsedLat = parseFloat(latM[1]);
        const parsedLng = parseFloat(lngM[1]);
        if (parsedLat > 43 && parsedLat < 49 && parsedLng > 20 && parsedLng < 30) {
          lat = parsedLat;
          lng = parsedLng;
        }
      }
    });

    // Description
    const descEl = $("h5:contains('Descriere')").next();
    const description = descEl.text().trim() || undefined;

    // Seller type
    let sellerType: string | undefined;
    const rawLower = $.html().toLowerCase();
    if (/\b(?:agentie|agenție|agent imobiliar|intermediar)\b/.test(rawLower)) sellerType = "agentie";
    else if (/\b(?:proprietar|particular)\b/.test(rawLower)) sellerType = "proprietar";
    else if (/\b(?:dezvoltator|constructor)\b/.test(rawLower)) sellerType = "dezvoltator";

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
          extractedAt: new Date().toISOString(),
        },
      },
    };
  },
};
