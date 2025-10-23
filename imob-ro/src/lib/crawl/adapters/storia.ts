/**
 * Day 32: Storia.ro Adapter
 * Sitemap discovery + HTML extraction for storia.ro (formerly OLX Imobiliare)
 */

import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";
import type { SourceAdapter, DiscoverResult } from "../types";

export const adapterStoria: SourceAdapter = {
  domain: "storia.ro",

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
    $('a[data-cy="listing-item-link"], a[href*="/oferta/"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("/oferta/")) {
        const absolute = new URL(href, listUrl).toString();
        if (absolute.includes("storia.ro")) {
          links.push(absolute);
        }
      }
    });

    // Try to find next page
    const nextHref =
      $('a[data-cy="pagination.next"]').attr("href") || $('a:contains("Următoarea")').attr("href");
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
      $('h1[data-cy="adPageAdTitle"]').text().trim() ||
      $("h1.offer-title").text().trim() ||
      $("title").text().split("|")[0]?.trim();

    // Price
    let price: number | undefined;
    let currency = "EUR";
    const priceText =
      $('[data-cy="adPageHeaderPrice"]').text() ||
      $(".offer-price").text() ||
      $('[aria-label*="Preț"]').text();
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
      $('[aria-label="Suprafață"]').text() ||
      $('div:contains("Suprafață:")').text() ||
      $('.params:contains("m²")').text();
    const areaMatch = areaText.match(/(\d+)\s*m/i);
    if (areaMatch) {
      areaM2 = parseInt(areaMatch[1]);
    }

    // Rooms
    let rooms: number | undefined;
    const roomsText =
      $('[aria-label="Număr de camere"]').text() ||
      $('div:contains("Număr camere:")').text() ||
      $('.params:contains("camere")').text();
    const roomsMatch = roomsText.match(/(\d+)/);
    if (roomsMatch) {
      rooms = parseInt(roomsMatch[1]);
    }

    // Floor
    const floorRaw =
      $('[aria-label="Etaj"]').text().trim() ||
      $('div:contains("Etaj:")').next().text().trim() ||
      $('.params:contains("Etaj")').text().replace("Etaj:", "").trim();

    // Year built
    let yearBuilt: number | undefined;
    const yearText =
      $('[aria-label="An construcție"]').text() || $('div:contains("An construcție:")').text();
    const yearMatch = yearText.match(/(\d{4})/);
    if (yearMatch) {
      yearBuilt = parseInt(yearMatch[1]);
    }

    // Address
    const addressRaw =
      $('[data-cy="adPageHeaderLocation"]').text().trim() ||
      $(".offer-location").text().trim() ||
      $("a.address").text().trim();

    // Photos
    const photos: string[] = [];
    $(
      '[data-cy="adPageGallery"] img, .offer-photos img, .swiper-slide img, [data-testid="gallery"] img',
    ).each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy");
      if (src && !src.includes("placeholder") && !src.includes("thumbnail")) {
        // Storia often has image URLs in srcset
        const srcset = $(el).attr("srcset");
        if (srcset) {
          const largest = srcset.split(",").pop()?.trim().split(" ")[0];
          if (largest) {
            photos.push(new URL(largest, url).toString());
            return;
          }
        }
        photos.push(new URL(src, url).toString());
      }
    });

    // Geocode (often in JSON-LD script)
    let lat: number | undefined;
    let lng: number | undefined;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || "");
        if (json.geo?.latitude && json.geo?.longitude) {
          lat = parseFloat(json.geo.latitude);
          lng = parseFloat(json.geo.longitude);
        }
      } catch {
        // Ignore parse errors
      }
    });

    // Fallback: check inline scripts
    if (!lat || !lng) {
      const mapData = $('script:contains("latitude")').text();
      const latMatch = mapData.match(/latitude["']?\s*:\s*([\d.]+)/);
      const lngMatch = mapData.match(/longitude["']?\s*:\s*([\d.]+)/);
      if (latMatch && lngMatch) {
        lat = parseFloat(latMatch[1]);
        lng = parseFloat(lngMatch[1]);
      }
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
          source: "storia.ro",
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

  // Handle sitemap index
  if (parsed.sitemapindex?.sitemap) {
    const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
      ? parsed.sitemapindex.sitemap
      : [parsed.sitemapindex.sitemap];

    for (const sm of sitemaps) {
      if (sm.loc) links.push(sm.loc);
    }
  }

  // Handle regular sitemap
  if (parsed.urlset?.url) {
    const urls = Array.isArray(parsed.urlset.url) ? parsed.urlset.url : [parsed.urlset.url];

    for (const u of urls) {
      if (u.loc && u.loc.includes("/oferta/")) {
        links.push(u.loc);
      }
    }
  }

  return { links: [...new Set(links)], next: null };
}
