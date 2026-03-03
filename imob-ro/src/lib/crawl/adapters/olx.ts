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
      headers: { "User-Agent": "ImobIntelBot/1.0 (+https://imobintel.ro/bot)" },
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
   * Extract structured data from listing detail page.
   * OLX renders most content via JS, so we prioritize JSON-LD and embedded
   * JSON state over Cheerio DOM selectors (which rely on unstable CSS classes).
   */
  async extract({ url, html }) {
    const $ = cheerio.load(html);
    const rawHtml = html as string;

    // ---- Try JSON-LD first (most reliable) ----
    let ld: Record<string, any> | null = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).html() || "");
        if (parsed["@type"] === "Product" || parsed["@type"] === "Offer" || parsed.name) {
          ld = parsed;
        }
      } catch { /* ignore */ }
    });

    // ---- Try __NEXT_DATA__ or __PRELOADED_STATE__ ----
    let nextData: Record<string, any> | null = null;
    const nextDataMatch = rawHtml.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try { nextData = JSON.parse(nextDataMatch[1]); } catch { /* ignore */ }
    }
    const preloadMatch = rawHtml.match(/window\.__PRELOADED_STATE__\s*=\s*"([^"]+)"/);
    if (!nextData && preloadMatch) {
      try {
        const decoded = preloadMatch[1].replace(/\\u[\dA-Fa-f]{4}/g, (m) => String.fromCharCode(parseInt(m.slice(2), 16)));
        nextData = JSON.parse(decoded);
      } catch { /* ignore */ }
    }

    const ad = nextData?.props?.pageProps?.ad ?? nextData?.ad ?? null;

    // ---- Title ----
    const title =
      ad?.title ??
      ld?.name ??
      ($('h1[data-cy="ad_title"]').text().trim() ||
        $("h1").first().text().trim() ||
        $("title").text().split("|")[0]?.trim());

    // ---- Price ----
    let price: number | undefined;
    let currency = "RON";

    if (ad?.price?.regularPrice?.value) {
      price = Math.round(ad.price.regularPrice.value);
      currency = ad.price.regularPrice.currencyCode === "EUR" ? "EUR" : "RON";
    } else if (ld?.offers?.price) {
      price = parseInt(String(ld.offers.price).replace(/\D/g, ""));
      currency = ld.offers?.priceCurrency === "EUR" ? "EUR" : "RON";
    }

    if (!price) {
      const priceText =
        $('h3[data-testid="ad-price-container"]').text() ||
        $('[data-testid="ad-price"]').text();
      if (priceText) {
        const match = priceText.match(/[\d\s,.]+/);
        if (match) price = parseInt(match[0].replace(/[\s,.]/g, ""));
        if (priceText.includes("€") || priceText.toUpperCase().includes("EUR")) currency = "EUR";
      }
    }

    // ---- Parameters (from ad JSON or DOM) ----
    const params = new Map<string, string>();

    if (ad?.params && Array.isArray(ad.params)) {
      for (const p of ad.params) {
        const key = (p.key || p.name || "").toLowerCase();
        const val = p.normalizedValue ?? p.value?.label ?? p.value?.key ?? String(p.value ?? "");
        if (key && val) params.set(key, val);
      }
    }

    // DOM fallback
    if (params.size === 0) {
      $('li[data-cy="ad-parameters-item"] p').each((i, el) => {
        if (i % 2 === 0) {
          const key = $(el).text().trim();
          const value = $(el).next("p").text().trim();
          if (key && value) params.set(key.toLowerCase(), value);
        }
      });
    }

    // ---- Area ----
    let areaM2: number | undefined;
    const areaVal = params.get("m") || params.get("suprafata") || params.get("suprafață");
    if (areaVal) {
      const m = areaVal.match(/(\d+)/);
      if (m) areaM2 = parseInt(m[1]);
    }

    // ---- Rooms ----
    let rooms: number | undefined;
    const roomsVal = params.get("rooms") || params.get("numar_camere") || params.get("numar camere") || params.get("număr camere");
    if (roomsVal) {
      const m = roomsVal.match(/(\d+)/);
      if (m) rooms = parseInt(m[1]);
    }

    // ---- Floor ----
    const floorRaw = params.get("floor_select") || params.get("etaj") || undefined;

    // ---- Year built ----
    let yearBuilt: number | undefined;
    const yearVal = params.get("an_constructie") || params.get("an constructie") || params.get("an construcție");
    if (yearVal) {
      const m = yearVal.match(/(\d{4})/);
      if (m) yearBuilt = parseInt(m[1]);
    }

    // ---- Address ----
    const addressRaw =
      ad?.location?.cityName && ad?.location?.districtName
        ? `${ad.location.districtName}, ${ad.location.cityName}`
        : $('[data-cy="ad_location"]').text().trim() || ld?.contentLocation?.name || undefined;

    // ---- Photos ----
    const photos: string[] = [];
    const seenPhotos = new Set<string>();

    if (ad?.photos && Array.isArray(ad.photos)) {
      for (const p of ad.photos) {
        const src = p.link ?? p.url ?? p;
        if (typeof src === "string" && !seenPhotos.has(src)) {
          seenPhotos.add(src);
          photos.push(src);
        }
      }
    }
    if (ld?.image && Array.isArray(ld.image)) {
      for (const src of ld.image) {
        if (typeof src === "string" && !seenPhotos.has(src)) {
          seenPhotos.add(src);
          photos.push(src);
        }
      }
    }
    if (!photos.length) {
      $('img[data-testid="slider-image"], [data-cy="adPhotos-slider"] img').each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src");
        if (src && !src.includes("placeholder") && !seenPhotos.has(src)) {
          seenPhotos.add(src);
          photos.push(new URL(src.split(";")[0], url).toString());
        }
      });
    }

    // ---- Geocode ----
    let lat: number | undefined;
    let lng: number | undefined;

    if (ad?.map?.lat && ad?.map?.lon) {
      lat = parseFloat(ad.map.lat);
      lng = parseFloat(ad.map.lon);
    } else if (ld?.geo?.latitude && ld?.geo?.longitude) {
      lat = parseFloat(ld.geo.latitude);
      lng = parseFloat(ld.geo.longitude);
    }

    if (!lat || !lng) {
      const latMatch = rawHtml.match(/["']?lat(?:itude)?["']?\s*:\s*["']?([\d.]+)/);
      const lngMatch = rawHtml.match(/["']?(?:lng|lon(?:gitude)?)["']?\s*:\s*["']?([\d.]+)/);
      if (latMatch && lngMatch) {
        const pLat = parseFloat(latMatch[1]);
        const pLng = parseFloat(lngMatch[1]);
        if (pLat > 43 && pLat < 49 && pLng > 20 && pLng < 30) {
          lat = pLat;
          lng = pLng;
        }
      }
    }

    // ---- Description ----
    const description =
      ad?.description ??
      ($('[data-cy="ad_description"] div').first().text().trim().slice(0, 2000) ||
        $('[data-testid="ad-description"]').first().text().trim().slice(0, 2000) ||
        undefined);

    // ---- Seller type ----
    let sellerType: string | undefined;
    const rawLower = rawHtml.toLowerCase();
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
        photos: photos.slice(0, 20),
        sourceMeta: {
          source: "olx.ro",
          description: typeof description === "string" ? description.slice(0, 2000) : undefined,
          sellerType,
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
    headers: { "User-Agent": "ImobIntelBot/1.0 (+https://imobintel.ro/bot)" },
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
