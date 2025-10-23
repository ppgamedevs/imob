/**
 * Day 32: Imobiliare.ro Adapter
 * Sitemap discovery + HTML extraction for imobiliare.ro
 */

import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";
import type { SourceAdapter, DiscoverResult } from "../types";

export const adapterImobiliare: SourceAdapter = {
  domain: "imobiliare.ro",

  /**
   * Discover listing URLs from sitemap or listing pages
   */
  async discover(listUrl: URL): Promise<DiscoverResult> {
    // If it's a sitemap URL
    if (listUrl.pathname.includes("sitemap") || listUrl.pathname.endsWith(".xml")) {
      return await discoverFromSitemap(listUrl.toString());
    }

    // Otherwise, scrape listing page
    const res = await fetch(listUrl.toString(), {
      headers: { "User-Agent": "ImobIntelBot/1.0 (+https://imob.ro/bot)" },
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const links: string[] = [];
    $('a[href*="/vanzare-"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("/vanzare-")) {
        const absolute = new URL(href, listUrl).toString();
        if (absolute.includes("imobiliare.ro") && !absolute.includes("?")) {
          links.push(absolute);
        }
      }
    });

    // Try to find next page
    const nextHref = $('a[rel="next"]').attr("href") || $('a:contains("Următoarea")').attr("href");
    const next = nextHref ? new URL(nextHref, listUrl).toString() : null;

    return { links: [...new Set(links)], next };
  },

  /**
   * Extract structured data from listing detail page
   */
  async extract({ url, html }) {
    const $ = cheerio.load(html);

    // Title
    const title =
      $('h1[itemprop="name"]').text().trim() ||
      $("h1.titlu-anunt").text().trim() ||
      $("title").text().split("|")[0]?.trim();

    // Price
    let price: number | undefined;
    let currency = "EUR";
    const priceText =
      $('[itemprop="price"]').attr("content") ||
      $(".pret-mare").text() ||
      $(".pret").first().text();
    if (priceText) {
      const match = priceText.match(/[\d\s,.]+/);
      if (match) {
        price = parseInt(match[0].replace(/[\s,.]/g, ""));
      }
      if (priceText.includes("lei") || priceText.includes("RON")) {
        currency = "RON";
      }
    }

    // Area
    let areaM2: number | undefined;
    const areaText =
      $('[itemprop="floorSize"]').text() ||
      $('.features:contains("mp")').text() ||
      $('li:contains("Suprafață utilă:")').text();
    const areaMatch = areaText.match(/(\d+)\s*mp/i);
    if (areaMatch) {
      areaM2 = parseInt(areaMatch[1]);
    }

    // Rooms
    let rooms: number | undefined;
    const roomsText =
      $('[itemprop="numberOfRooms"]').text() ||
      $('li:contains("Număr camere:")').text() ||
      $('.features:contains("camere")').text();
    const roomsMatch = roomsText.match(/(\d+)/);
    if (roomsMatch) {
      rooms = parseInt(roomsMatch[1]);
    }

    // Floor
    const floorRaw =
      $('li:contains("Etaj:")').text().replace("Etaj:", "").trim() ||
      $('.detalii:contains("Etaj")').next().text().trim();

    // Year built
    let yearBuilt: number | undefined;
    const yearText =
      $('li:contains("An construcție:")').text() || $('.features:contains("An:")').text();
    const yearMatch = yearText.match(/(\d{4})/);
    if (yearMatch) {
      yearBuilt = parseInt(yearMatch[1]);
    }

    // Address
    const addressRaw =
      $('[itemprop="address"]').text().trim() ||
      $(".localizare-text").text().trim() ||
      $("h2.subtitle").text().trim();

    // Photos
    const photos: string[] = [];
    $('[itemprop="image"], .gallery img, .carousel img').each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
      if (src && !src.includes("placeholder")) {
        const absolute = new URL(src, url).toString();
        photos.push(absolute);
      }
    });

    // Geocode (if available)
    let lat: number | undefined;
    let lng: number | undefined;
    const mapData = $('script:contains("lat")').text();
    const latMatch = mapData.match(/lat["']?\s*:\s*([\d.]+)/);
    const lngMatch = mapData.match(/lng["']?\s*:\s*([\d.]+)/);
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
        photos: photos.slice(0, 20), // Limit to 20 photos
        sourceMeta: {
          source: "imobiliare.ro",
          extractedAt: new Date().toISOString(),
        },
      },
    };
  },
};

/**
 * Discover URLs from XML sitemap
 */
async function discoverFromSitemap(sitemapUrl: string): Promise<DiscoverResult> {
  const res = await fetch(sitemapUrl, {
    headers: { "User-Agent": "ImobIntelBot/1.0 (+https://imob.ro/bot)" },
  });
  const xml = await res.text();

  const parser = new XMLParser();
  const parsed = parser.parse(xml);

  const links: string[] = [];

  // Handle sitemap index (points to other sitemaps)
  if (parsed.sitemapindex?.sitemap) {
    const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
      ? parsed.sitemapindex.sitemap
      : [parsed.sitemapindex.sitemap];

    for (const sm of sitemaps) {
      if (sm.loc) links.push(sm.loc);
    }
  }

  // Handle regular sitemap (contains URLs)
  if (parsed.urlset?.url) {
    const urls = Array.isArray(parsed.urlset.url) ? parsed.urlset.url : [parsed.urlset.url];

    for (const u of urls) {
      if (u.loc && u.loc.includes("/vanzare-")) {
        links.push(u.loc);
      }
    }
  }

  return { links: [...new Set(links)], next: null };
}
