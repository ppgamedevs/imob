/**
 * Day 25 - Generic Adapter (Fallback)
 * Heuristic-based crawler for public listing sites
 */

import * as cheerio from "cheerio";

import type { DiscoverResult, SourceAdapter } from "../types";

export const adapterGeneric: SourceAdapter = {
  domain: "*",

  async discover(listUrl: URL): Promise<DiscoverResult> {
    // Fallback: extract links that look like listings
    const html = await (await fetch(listUrl.toString(), { cache: "no-store" })).text();
    const $ = cheerio.load(html);
    const links = new Set<string>();

    $("a[href]").each((_, a) => {
      const href = $(a).attr("href") || "";
      if (!href) return;

      // Heuristic: links containing listing keywords
      if (
        /anunt|oferta|listing|property|apartament|garsoniera|imobil/i.test(href) ||
        /\/[0-9]{6,}/i.test(href) // ID pattern
      ) {
        const abs = new URL(href, listUrl).toString();
        links.add(abs);
      }
    });

    // Next page fallback
    let next: string | null = null;
    const nextA = $(
      'a[rel="next"], a:contains("Următoarea"), a:contains("Next"), a:contains("››")',
    ).attr("href");
    if (nextA) next = new URL(nextA, listUrl).toString();

    return { links: [...links], next };
  },

  async extract({ url, html }) {
    const $ = cheerio.load(html);

    // Heuristics for common fields
    const title =
      $("h1").first().text().trim() || $('meta[property="og:title"]').attr("content") || undefined;

    const priceTxt = $('[class*="price"], .price, [data-price]')
      .first()
      .text()
      .replace(/[^\d]/g, "");
    const price = priceTxt ? parseInt(priceTxt, 10) : undefined;

    // Text mining for rooms, sqm, year
    const txt = $("body").text().replace(/\s+/g, " ");
    const roomsMatch = /(\d+)\s*(camere|cam|camera)/i.exec(txt);
    const rooms = roomsMatch?.[1] ? Number(roomsMatch[1]) : undefined;

    const m2Match = /(\d{2,4})\s*(m2|mp|m²)/i.exec(txt);
    const areaM2 = m2Match?.[1] ? Number(m2Match[1]) : undefined;

    const yearMatch = /(\d{4})\s*(an\s*constructie|construit)/i.exec(txt);
    const yearBuilt = yearMatch?.[1] ? Number(yearMatch[1]) : undefined;

    // Photos
    const photos = new Set<string>();
    $('img[src], meta[property="og:image"]').each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("content");
      if (src && !src.includes("logo") && !src.includes("icon")) {
        try {
          photos.add(new URL(src, url).toString());
        } catch {
          // ignore invalid URLs
        }
      }
    });

    return {
      extracted: {
        title,
        price,
        currency: "EUR",
        areaM2,
        rooms,
        yearBuilt,
        photos: [...photos].slice(0, 20), // limit to 20 photos
        sourceMeta: { via: "generic", crawledAt: new Date().toISOString() },
      },
    };
  },
};
