import * as cheerio from "cheerio";

import type { DiscoverResult, SourceAdapter } from "../types";

function findSpecValue($: cheerio.CheerioAPI, label: string): string | undefined {
  const lf = label.toLowerCase();
  let result: string | undefined;

  $("div, dt, td, span, li, th").each((_, el) => {
    if (result) return;
    const node = $(el);
    const text = node.contents().filter((_, c) => c.type === "text").text().trim();
    if (!text.toLowerCase().includes(lf)) return;
    const sibling = node.next();
    const sibText = sibling.text().trim();
    if (sibText && sibText.length < 100 && sibText.length > 0) {
      result = sibText;
    }
  });

  if (!result) {
    const re = new RegExp(
      label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        `[^<]*<\\/[^>]+>\\s*(?:<[^>]+>\\s*)*([^<]{1,80})`,
      "i",
    );
    const m = $.html().match(re);
    if (m?.[1]) result = m[1].trim();
  }

  return result;
}

export const adapterHomezz: SourceAdapter = {
  domain: "homezz.ro",

  async discover(listUrl: URL): Promise<DiscoverResult> {
    const res = await fetch(listUrl.toString(), {
      headers: { "User-Agent": "ImobIntelBot/1.0 (+https://imobintel.ro/bot)" },
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const links: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href && /\d{5,}\.html$/.test(href)) {
        const absolute = new URL(href, listUrl).toString();
        if (absolute.includes("homezz.ro")) links.push(absolute);
      }
    });

    const nextHref =
      $('a[rel="next"]').attr("href") ||
      $('a:contains("Pagina urmatoare")').attr("href") ||
      $(".pagination a.next, .pagination .next a").attr("href");
    const next = nextHref ? new URL(nextHref, listUrl).toString() : null;

    return { links: [...new Set(links)], next };
  },

  async extract({ url, html }) {
    const $ = cheerio.load(html);

    const title =
      $("h1").first().text().trim() ||
      $("title").text().split(",")[0]?.trim() ||
      $("title").text().split("-")[0]?.trim();

    let price: number | undefined;
    let currency = "EUR";
    const titleTag = $("title").text();
    const priceFromTitle = titleTag.match(/([\d\s.,]+)\s*(?:eur|€)/i);
    if (priceFromTitle) {
      price = parseInt(priceFromTitle[1].replace(/[\s,.]/g, ""));
    }
    if (!price) {
      const bodyText = $("h1").parent().text() + " " + $('[class*="price"]').text();
      const m = bodyText.match(/([\d\s.,]+)\s*(?:EUR|€)/i);
      if (m) price = parseInt(m[1].replace(/[\s,.]/g, ""));
    }
    if (!price) {
      const ronM = ($("h1").parent().text() + " " + $('[class*="price"]').text())
        .match(/([\d\s.,]+)\s*(?:RON|lei)/i);
      if (ronM) {
        price = parseInt(ronM[1].replace(/[\s,.]/g, ""));
        currency = "RON";
      }
    }

    let areaM2: number | undefined;
    const areaText = findSpecValue($, "Suprafat") ?? findSpecValue($, "utila");
    const areaMatch = areaText?.match(/([\d.,]+)\s*m/i);
    if (areaMatch) areaM2 = parseInt(areaMatch[1]);
    if (!areaM2) {
      const titleArea = (title ?? "").match(/(\d{2,3})\s*m[²p]/i);
      if (titleArea) areaM2 = parseInt(titleArea[1]);
    }

    let rooms: number | undefined;
    const roomsText = findSpecValue($, "Numar camere") ?? findSpecValue($, "camere");
    const roomsMatch = roomsText?.match(/(\d+)/);
    if (roomsMatch) rooms = parseInt(roomsMatch[1]);
    if (!rooms && /\bgarsonier/i.test(title ?? "")) rooms = 1;

    let floorRaw: string | undefined;
    const floorText = findSpecValue($, "Etaj");
    if (floorText && floorText.length < 50) floorRaw = floorText;

    let yearBuilt: number | undefined;
    const yearText = findSpecValue($, "An construc") ?? findSpecValue($, "Anul");
    const yearMatch = yearText?.match(/(\d{4})/);
    if (yearMatch) yearBuilt = parseInt(yearMatch[1]);

    const addressRaw =
      $('[itemprop="address"]').text().trim() ||
      $('[class*="location"], [class*="adresa"]').first().text().trim() ||
      undefined;

    const photos: string[] = [];
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (
        src &&
        src.startsWith("http") &&
        !src.includes("placeholder") &&
        !src.includes("logo") &&
        !src.includes("icon") &&
        !src.includes("avatar") &&
        (src.includes("homezz") || src.includes("cdn") || src.includes("img"))
      ) {
        photos.push(src);
      }
    });

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

    const descEl = $('[class*="description"], [class*="descriere"]');
    const description = descEl.first().text().trim().slice(0, 2000) || undefined;

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
          source: "homezz.ro",
          description,
          extractedAt: new Date().toISOString(),
        },
      },
    };
  },
};
