/**
 * Day 32: OLX.ro Adapter
 * Sitemap discovery + HTML extraction for olx.ro
 */

import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";

import type { DiscoverResult, SourceAdapter } from "../types";

export const adapterOlx: SourceAdapter = {
  domain: "olx.ro",

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
    $('a[data-cy="ad-card-title"], a.css-rc5s2u').each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("/d/oferta/")) {
        const absolute = new URL(href, listUrl).toString();
        if (absolute.includes("olx.ro")) {
          links.push(absolute);
        }
      }
    });

    // Try to find next page
    const nextHref =
      $('a[data-cy="pagination-forward"]').attr("href") ||
      $('a[data-testid="pagination-forward"]').attr("href");
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
      $('h1[data-cy="ad_title"]').text().trim() ||
      $("h1.css-r9zjja-Text").text().trim() ||
      $("title").text().split("|")[0]?.trim();

    // Price
    let price: number | undefined;
    let currency = "RON";
    const priceText =
      $('h3[data-testid="ad-price-container"]').text() ||
      $('[data-testid="ad-price"]').text() ||
      $(".css-okktvh-Text").text();
    if (priceText) {
      const match = priceText.match(/[\d\s,.]+/);
      if (match) {
        price = parseInt(match[0].replace(/[\s,.]/g, ""));
      }
      if (priceText.includes("€") || priceText.toUpperCase().includes("EUR")) {
        currency = "EUR";
      }
    }

    // Extract parameters from key-value list
    const params = new Map<string, string>();
    $('li[data-cy="ad-parameters-item"] p, .css-1r0si1e p').each((i, el) => {
      if (i % 2 === 0) {
        const key = $(el).text().trim();
        const value = $(el).next("p").text().trim();
        if (key && value) {
          params.set(key.toLowerCase(), value);
        }
      }
    });

    // Area
    let areaM2: number | undefined;
    const areaValue = params.get("suprafata") || params.get("suprafață");
    if (areaValue) {
      const match = areaValue.match(/(\d+)/);
      if (match) areaM2 = parseInt(match[1]);
    }

    // Rooms
    let rooms: number | undefined;
    const roomsValue = params.get("numar camere") || params.get("număr camere");
    if (roomsValue) {
      const match = roomsValue.match(/(\d+)/);
      if (match) rooms = parseInt(match[1]);
    }

    // Floor
    const floorRaw = params.get("etaj") || params.get("floor") || undefined;

    // Year built
    let yearBuilt: number | undefined;
    const yearValue = params.get("an constructie") || params.get("an construcție");
    if (yearValue) {
      const match = yearValue.match(/(\d{4})/);
      if (match) yearBuilt = parseInt(match[1]);
    }

    // Address
    const addressRaw =
      $('[data-cy="ad_location"]').text().trim() ||
      $(".css-1cju8pu-Text").text().trim() ||
      $("a.css-tyi2d1").text().trim();

    // Photos
    const photos: string[] = [];
    $('img[data-testid="slider-image"], [data-cy="adPhotos-slider"] img').each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src && !src.includes("placeholder")) {
        // OLX often uses CDN URLs
        const cleaned = src.split(";")[0]; // Remove image transformations
        photos.push(new URL(cleaned, url).toString());
      }
    });

    // Geocode (check JSON-LD)
    let lat: number | undefined;
    let lng: number | undefined;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || "");
        if (json.geo?.latitude && json.geo?.longitude) {
          lat = parseFloat(json.geo.latitude);
          lng = parseFloat(json.geo.longitude);
        }
        // Sometimes nested in offers
        if (json.offers?.geo?.latitude && json.offers?.geo?.longitude) {
          lat = parseFloat(json.offers.geo.latitude);
          lng = parseFloat(json.offers.geo.longitude);
        }
      } catch {
        // Ignore parse errors
      }
    });

    // Fallback: check inline scripts for map coordinates
    if (!lat || !lng) {
      const mapData = $('script:contains("lat")').text();
      const latMatch = mapData.match(/["']?lat["']?\s*:\s*([\d.]+)/);
      const lngMatch = mapData.match(/["']?lng["']?\s*:\s*([\d.]+)/);
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
          source: "olx.ro",
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
      if (u.loc && u.loc.includes("/d/oferta/")) {
        links.push(u.loc);
      }
    }
  }

  return { links: [...new Set(links)], next: null };
}
