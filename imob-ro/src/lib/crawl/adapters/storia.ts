/**
 * Day 32: Storia.ro Adapter
 * Sitemap discovery + HTML extraction for storia.ro (formerly OLX Imobiliare)
 */

import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";

import type { DiscoverResult, SourceAdapter } from "../types";

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
      headers: { "User-Agent": "ImobIntelBot/1.0 (+https://imobintel.ro/bot)" },
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
   * Extract structured data from listing detail page.
   * Primary strategy: parse __NEXT_DATA__ JSON (reliable for Next.js SSR).
   * Fallback: targeted DOM selectors (avoid greedy :contains on wrapper divs).
   */
  async extract({ url, html }) {
    const $ = cheerio.load(html);
    const nextData = parseNextData($);

    // Title
    const title =
      nextData?.ad?.title ??
      ($('h1[data-cy="adPageAdTitle"]').text().trim() ||
      $("h1").first().text().trim() ||
      $("title").text().split("|")[0]?.trim());

    // Price
    let price: number | undefined;
    let currency = "EUR";
    if (nextData?.ad?.target?.Price) {
      price = parseInt(String(nextData.ad.target.Price).replace(/\D/g, ""));
    }
    if (!price) {
      const priceText =
        $('[data-cy="adPageHeaderPrice"]').text() ||
        $(".offer-price").text();
      const match = priceText?.match(/[\d\s,.]+/);
      if (match) price = parseInt(match[0].replace(/[\s,.]/g, ""));
      if (priceText?.includes("lei") || priceText?.includes("RON")) currency = "RON";
    }

    // Characteristics from __NEXT_DATA__ (most reliable)
    const chars = buildCharacteristicsMap(nextData);

    // Area
    let areaM2: number | undefined;
    const ndArea = chars["m"] ?? chars["area"] ?? nextData?.ad?.target?.Area;
    if (ndArea) {
      const m = String(ndArea).match(/([\d.,]+)/);
      if (m) areaM2 = parseFloat(m[1].replace(",", "."));
    }
    if (!areaM2) {
      const areaText = findLabelValue($, "Suprafață") ?? findLabelValue($, "Suprafata");
      const m = areaText?.match(/([\d.,]+)\s*m/i);
      if (m) areaM2 = parseFloat(m[1].replace(",", "."));
    }

    // Rooms
    let rooms: number | undefined;
    const ndRooms = chars["rooms_num"] ?? nextData?.ad?.target?.Rooms_num;
    if (ndRooms) {
      const m = String(ndRooms).match(/(\d+)/);
      if (m) rooms = parseInt(m[1]);
    }
    if (!rooms) {
      const roomsText = findLabelValue($, "Număr") ?? findLabelValue($, "camere");
      const m = roomsText?.match(/(\d+)/);
      if (m) rooms = parseInt(m[1]);
    }

    // Floor
    let floorRaw: string | undefined;
    const ndFloor = chars["floor_no"] ?? chars["floor"] ?? nextData?.ad?.target?.Floor_no;
    if (ndFloor) {
      floorRaw = sanitizeShortField(String(ndFloor));
    }
    if (!floorRaw) {
      const floorText = findLabelValue($, "Etaj");
      floorRaw = sanitizeShortField(floorText);
    }

    // Year built
    let yearBuilt: number | undefined;
    const ndYear = chars["build_year"] ?? nextData?.ad?.target?.Build_year;
    if (ndYear) {
      const m = String(ndYear).match(/(\d{4})/);
      if (m) yearBuilt = parseInt(m[1]);
    }
    if (!yearBuilt) {
      const yearText = findLabelValue($, "An construc") ?? findLabelValue($, "An constru");
      const m = yearText?.match(/(\d{4})/);
      if (m) yearBuilt = parseInt(m[1]);
    }

    // Floor - also try total floors for "X/Y" format
    const ndTotalFloors = chars["building_floors_num"] ?? chars["number_of_floors"] ?? nextData?.ad?.target?.Building_floors_num;
    if (floorRaw && ndTotalFloors) {
      const total = String(ndTotalFloors).match(/(\d+)/);
      if (total && !floorRaw.includes("/")) {
        floorRaw = `${floorRaw}/${total[1]}`;
      }
    }
    if (!floorRaw) {
      const floorLabelText = findLabelValue($, "Etaj");
      if (floorLabelText && floorLabelText.length < 30) floorRaw = floorLabelText.trim();
    }

    // Description (extract early so address fallback can use it)
    const description: string | undefined = nextData?.ad?.description ?? $('section[data-cy="adDescription"] div').text().trim() ?? undefined;

    // Address
    let addressRaw =
      $('[data-cy="adPageHeaderLocation"]').text().trim() ||
      $(".offer-location").text().trim() ||
      $("a.address").text().trim() ||
      undefined;

    // Fallback: extract address from description using Romanian street patterns
    if (!addressRaw && description) {
      const addrMatch = description.match(
        /(?:pe\s+|pe\s+strada\s+|str\.?\s+|strada\s+|in\s+zona\s+|bulevardul\s+|bd\.?\s+|calea\s+|aleea\s+|soseaua\s+|sos\.?\s+|intrarea\s+|drumul\s+|piata\s+|splaiul\s+)([A-ZÀ-Ž][A-Za-zÀ-ž\s.-]{3,50})/i
      );
      if (addrMatch) {
        const street = addrMatch[0].trim();
        const sectorMatch = description.match(/sector(?:ul)?\s*(\d)/i);
        addressRaw = sectorMatch ? `${street}, Sector ${sectorMatch[1]}, Bucuresti` : street;
      }
    }
    // Fallback: try title for address patterns
    if (!addressRaw && title) {
      const sectorMatch = title.match(/sector(?:ul)?\s*(\d)/i);
      const zoneMatch = title.match(/(?:zona|cartier(?:ul)?)\s+([A-ZÀ-Ž][A-Za-zÀ-ž\s.-]{3,30})/i);
      if (sectorMatch) addressRaw = `Sector ${sectorMatch[1]}, Bucuresti`;
      else if (zoneMatch) addressRaw = zoneMatch[1].trim() + ", Bucuresti";
    }

    // Photos
    const photos: string[] = [];
    $('img[src*="img.storia"], img[src*="statics.storia"], picture img, [data-cy="adPageGallery"] img, .swiper-slide img').each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src && !src.includes("placeholder") && !src.includes("thumbnail") && src.startsWith("http")) {
        const srcset = $(el).attr("srcset");
        if (srcset) {
          const largest = srcset.split(",").pop()?.trim().split(" ")[0];
          if (largest?.startsWith("http")) {
            photos.push(largest);
            return;
          }
        }
        photos.push(src);
      }
    });

    // Geocode from JSON-LD
    let lat: number | undefined;
    let lng: number | undefined;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || "");
        if (json.geo?.latitude && json.geo?.longitude) {
          lat = parseFloat(json.geo.latitude);
          lng = parseFloat(json.geo.longitude);
        }
      } catch { /* ignore */ }
    });

    // Geocode from __NEXT_DATA__
    if (!lat || !lng) {
      const adMap = nextData?.ad?.location?.coordinates;
      if (adMap?.latitude && adMap?.longitude) {
        lat = parseFloat(adMap.latitude);
        lng = parseFloat(adMap.longitude);
      }
    }

    // Seller type
    let sellerType: string | undefined;
    const agencyName = nextData?.ad?.agency?.name;
    if (agencyName) sellerType = "agentie";
    else {
      const rawLower = $.html().toLowerCase();
      if (/\b(?:proprietar|particular)\b/.test(rawLower)) sellerType = "proprietar";
      else if (/\b(?:dezvoltator|constructor)\b/.test(rawLower)) sellerType = "dezvoltator";
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
        photos: [...new Set(photos)].slice(0, 20),
        sourceMeta: {
          source: "storia.ro",
          description,
          sellerType,
          extractedAt: new Date().toISOString(),
        },
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Helpers for reliable extraction from storia.ro (Next.js SSR)
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Parse storia.ro's __NEXT_DATA__ script to get structured listing data.
 */
function parseNextData($: cheerio.CheerioAPI): any | null {
  try {
    const script = $('script#__NEXT_DATA__').html();
    if (!script) return null;
    const parsed = JSON.parse(script);
    return parsed?.props?.pageProps ?? null;
  } catch {
    return null;
  }
}

/**
 * Build a lowercase key map from the ad characteristics array.
 * Storia stores listing features as [{key, value, label}...] in various places.
 */
function buildCharacteristicsMap(nd: any): Record<string, string> {
  const map: Record<string, string> = {};
  if (!nd?.ad) return map;

  const chars: any[] =
    nd.ad.characteristics ?? nd.ad.features ?? nd.ad.params ?? [];
  for (const c of chars) {
    const key = (c.key ?? c.code ?? c.name ?? "").toLowerCase();
    const val = c.localizedValue ?? c.value ?? c.label ?? "";
    if (key && val) map[key] = String(val);
  }

  // Also merge ad.target (flat key-value pairs from storia's API)
  if (nd.ad.target && typeof nd.ad.target === "object") {
    for (const [k, v] of Object.entries(nd.ad.target)) {
      if (v != null) map[k.toLowerCase()] = String(v);
    }
  }

  return map;
}

/**
 * Find a value from a labeled pair in the DOM, e.g. "Etaj: parter/8".
 * Avoids greedy :contains() on wrapper elements by iterating leaf nodes only.
 */
function findLabelValue($: cheerio.CheerioAPI, labelFragment: string): string | undefined {
  const lf = labelFragment.toLowerCase();

  // Strategy 1: look for aria-label attributes
  const ariaEl = $(`[aria-label*="${labelFragment}"]`);
  if (ariaEl.length) {
    const text = ariaEl.first().text().trim();
    if (text && text.length < 100) return text;
  }

  // Strategy 2: walk small text nodes - find element whose direct text matches the label
  let result: string | undefined;
  $("li, dt, th, td, span, div").each((_, el) => {
    if (result) return;
    const node = $(el);
    // Only check direct text (not deep subtree) to avoid matching wrapper divs
    const ownText = node.contents().filter((_, c) => c.type === "text")
      .text().trim().toLowerCase();
    if (!ownText.includes(lf)) return;
    // The value is typically in the next sibling or a child <span>/<dd>
    const sibling = node.next().text().trim();
    if (sibling && sibling.length < 100) {
      result = sibling;
      return;
    }
    // Or the parent contains label: value as a single string
    const full = node.parent().text().trim();
    const colonIdx = full.indexOf(":");
    if (colonIdx > -1) {
      const after = full.slice(colonIdx + 1).trim();
      if (after && after.length < 100) {
        result = after;
      }
    }
  });

  return result;
}

/**
 * Reject obviously invalid short-field values (JSON blobs, HTML, etc).
 */
function sanitizeShortField(val?: string | null): string | undefined {
  if (!val) return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 50) return undefined;
  if (trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith("<")) return undefined;
  return trimmed;
}

/* eslint-enable @typescript-eslint/no-explicit-any */

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
      if (u.loc && u.loc.includes("/oferta/")) {
        links.push(u.loc);
      }
    }
  }

  return { links: [...new Set(links)], next: null };
}
