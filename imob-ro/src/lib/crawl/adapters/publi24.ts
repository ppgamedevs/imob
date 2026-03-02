import * as cheerio from "cheerio";

import type { DiscoverResult, SourceAdapter } from "../types";

export const adapterPubli24: SourceAdapter = {
  domain: "publi24.ro",

  async discover(listUrl: URL): Promise<DiscoverResult> {
    const res = await fetch(listUrl.toString(), {
      headers: { "User-Agent": "ImobIntelBot/1.0 (+https://imobintel.ro/bot)" },
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const links: string[] = [];
    $('a[href*="/anunt/"], a[href*="/imobiliare/"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href && (href.includes("/anunt/") || href.includes("/imobiliare/"))) {
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

    const title =
      $("h1.listing-title").text().trim() ||
      $("h1").first().text().trim() ||
      $("title").text().split("|")[0]?.trim();

    let price: number | undefined;
    let currency = "EUR";
    const priceText =
      $(".listing-price").text() ||
      $('[itemprop="price"]').attr("content") ||
      $(".price").first().text();
    if (priceText) {
      const match = priceText.match(/[\d\s,.]+/);
      if (match) {
        price = parseInt(match[0].replace(/[\s,.]/g, ""));
      }
      if (priceText.includes("lei") || priceText.includes("RON")) {
        currency = "RON";
      }
    }

    let areaM2: number | undefined;
    const areaText =
      $('[itemprop="floorSize"]').text() ||
      $('li:contains("Suprafat"), li:contains("suprafat")').text() ||
      $('span:contains("mp")').text();
    const areaMatch = areaText.match(/(\d+)\s*mp/i);
    if (areaMatch) {
      areaM2 = parseInt(areaMatch[1]);
    }

    let rooms: number | undefined;
    const roomsText =
      $('li:contains("camere"), li:contains("Camere")').text() ||
      $('[itemprop="numberOfRooms"]').text();
    const roomsMatch = roomsText.match(/(\d+)/);
    if (roomsMatch) {
      rooms = parseInt(roomsMatch[1]);
    }

    const floorRaw =
      $('li:contains("Etaj")').text().replace(/Etaj\s*:?\s*/i, "").trim() || undefined;

    let yearBuilt: number | undefined;
    const yearText = $('li:contains("An construc")').text();
    const yearMatch = yearText.match(/(\d{4})/);
    if (yearMatch) {
      yearBuilt = parseInt(yearMatch[1]);
    }

    const addressRaw =
      $(".listing-location").text().trim() ||
      $('[itemprop="address"]').text().trim() ||
      $(".location").first().text().trim();

    const photos: string[] = [];
    $(".gallery img, .listing-gallery img, [data-src]").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src && !src.includes("placeholder") && !src.includes("no-photo")) {
        photos.push(new URL(src, url).toString());
      }
    });

    let lat: number | undefined;
    let lng: number | undefined;
    const scripts = $("script").text();
    const latMatch = scripts.match(/["']?lat(?:itude)?["']?\s*:\s*([\d.]+)/);
    const lngMatch = scripts.match(/["']?l(?:ng|ongitude)["']?\s*:\s*([\d.]+)/);
    if (latMatch && lngMatch) {
      lat = parseFloat(latMatch[1]);
      lng = parseFloat(lngMatch[1]);
    }

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
        photos: photos.slice(0, 20),
        sourceMeta: {
          source: "publi24.ro",
          extractedAt: new Date().toISOString(),
        },
      },
    };
  },
};
