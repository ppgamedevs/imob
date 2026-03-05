/**
 * Imobiliare.ro Adapter
 * Sitemap discovery + HTML extraction for imobiliare.ro
 */

import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";

import type { DiscoverResult, SourceAdapter } from "../types";

function findSpecText($: cheerio.CheerioAPI, label: string): string | undefined {
  let result: string | undefined;

  $("li, tr, div, span, dt, dd").each((_, el) => {
    const txt = $(el).text();
    if (txt.toLowerCase().includes(label.toLowerCase())) {
      const parts = txt.split(/[:]\s*/);
      if (parts.length >= 2) {
        const val = parts.slice(1).join(":").trim();
        if (val && val.length < 100) {
          result = val;
          return false;
        }
      }
    }
  });

  if (!result) {
    const re = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[:\\s]+([^<\\n]{1,80})", "i");
    const raw = $.html();
    const m = raw.match(re);
    if (m) result = m[1].trim();
  }

  return result;
}

export const adapterImobiliare: SourceAdapter = {
  domain: "imobiliare.ro",

  async discover(listUrl: URL): Promise<DiscoverResult> {
    if (listUrl.pathname.includes("sitemap") || listUrl.pathname.endsWith(".xml")) {
      return await discoverFromSitemap(listUrl.toString());
    }

    const res = await fetch(listUrl.toString(), {
      headers: { "User-Agent": "ImobIntelBot/1.0 (+https://imobintel.ro/bot)" },
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const links: string[] = [];
    $('a[href*="/oferta/"], a[href*="/vanzare-"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href && (href.includes("/oferta/") || href.includes("/vanzare-"))) {
        const absolute = new URL(href, listUrl).toString();
        if (absolute.includes("imobiliare.ro") && !absolute.includes("?")) {
          links.push(absolute);
        }
      }
    });

    const nextHref = $('a[rel="next"]').attr("href") || $('a:contains("Următoarea")').attr("href");
    const next = nextHref ? new URL(nextHref, listUrl).toString() : null;

    return { links: [...new Set(links)], next };
  },

  async extract({ url, html }) {
    const $ = cheerio.load(html);
    const rawHtml = $.html();

    // --- Title ---
    const title =
      $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content")?.split("|")[0]?.trim() ||
      $("title").text().split("|")[0]?.trim();

    // --- Description ---
    const descEl = $(".descriere-text, .content-text, [class*=descriere]").first();
    const description = descEl.length
      ? descEl.text().trim().slice(0, 2000)
      : $('meta[name="description"]').attr("content")?.trim();

    // --- Price ---
    let price: number | undefined;
    let currency = "EUR";

    const priceContent = $('[itemprop="price"]').attr("content");
    if (priceContent) {
      price = parseInt(priceContent.replace(/\D/g, ""), 10) || undefined;
    }

    if (!price) {
      const pricePatterns = [
        /(?:preț|pret)[^0-9]*?([\d][0-9\s.,]+)\s*(?:€|EUR)/i,
        /([\d][0-9\s.,]+)\s*€/,
        /(\d{2,3}(?:[.,]\d{3})*)\s*(?:€|EUR|eur)/i,
      ];
      for (const pat of pricePatterns) {
        const m = rawHtml.match(pat);
        if (m) {
          price = parseInt(m[1].replace(/[\s.,]/g, ""), 10) || undefined;
          if (price) break;
        }
      }
    }

    if (!price) {
      const boldPriceMatch = rawHtml.match(/>(\d{2,3}(?:[.,]\d{3})*)\s*€\s*</);
      if (boldPriceMatch) {
        price = parseInt(boldPriceMatch[1].replace(/[\s.,]/g, ""), 10) || undefined;
      }
    }

    const currencyMeta = $('[itemprop="priceCurrency"]').attr("content");
    if (currencyMeta) currency = currencyMeta;
    else if (rawHtml.match(/\b(?:lei|RON)\b/i) && !rawHtml.match(/€|EUR/i)) currency = "RON";

    // --- Suprafata ---
    let areaM2: number | undefined;

    const suputilaText = findSpecText($, "Suprafață utilă") || findSpecText($, "Sup. utilă") || findSpecText($, "Suprafata utila");
    if (suputilaText) {
      const m = suputilaText.match(/(\d+)/);
      if (m) areaM2 = parseInt(m[1], 10);
    }

    if (!areaM2) {
      const floorSizeEl = $('[itemprop="floorSize"]');
      if (floorSizeEl.length) {
        const m = floorSizeEl.text().match(/(\d+)/);
        if (m) areaM2 = parseInt(m[1], 10);
      }
    }

    if (!areaM2) {
      const areaPatterns = [
        /Sup(?:rafață|\.)\s*util[aă]\s*[:]\s*(\d+)\s*mp/i,
        /(\d+)\s*mp\s*util/i,
      ];
      for (const pat of areaPatterns) {
        const m = rawHtml.match(pat);
        if (m) { areaM2 = parseInt(m[1], 10); break; }
      }
    }

    // --- Rooms ---
    let rooms: number | undefined;

    const roomsText = findSpecText($, "Nr. cam") || findSpecText($, "Număr camere") || findSpecText($, "camere");
    if (roomsText) {
      const m = roomsText.match(/(\d+)/);
      if (m) rooms = parseInt(m[1], 10);
    }

    if (!rooms) {
      const roomsMeta = $('[itemprop="numberOfRooms"]').text();
      if (roomsMeta) {
        const m = roomsMeta.match(/(\d+)/);
        if (m) rooms = parseInt(m[1], 10);
      }
    }

    if (!rooms && title) {
      if (/\bgarsonier[aă]\b/i.test(title) || /\bstudio?\b/i.test(title)) rooms = 1;
      else {
        const titleRooms = title.match(/(\d)\s*cam/i);
        if (titleRooms) rooms = parseInt(titleRooms[1], 10);
      }
    }

    // --- Floor ---
    const floorSpec = findSpecText($, "Etaj");
    let floorRaw = floorSpec || undefined;
    if (!floorRaw) {
      const floorMatch = rawHtml.match(/Etaj\s*[:]\s*([^<\n]{1,30})/i);
      if (floorMatch) floorRaw = floorMatch[1].trim();
    }

    // --- Year built ---
    let yearBuilt: number | undefined;
    const yearSpec = findSpecText($, "An constr") || findSpecText($, "An construcție");
    if (yearSpec) {
      const m = yearSpec.match(/(\d{4})/);
      if (m) yearBuilt = parseInt(m[1], 10);
    }

    if (!yearBuilt) {
      const yearMatch = rawHtml.match(/An\s+construc[tț]ie[:\s]*(\d{4})/i);
      if (yearMatch) yearBuilt = parseInt(yearMatch[1], 10);
    }

    // --- Address ---
    function cleanAddress(raw: string | undefined): string | undefined {
      if (!raw) return undefined;
      let addr = raw
        .replace(/\s*pre[tț]\s+[\d.,]+\s*€?.*/i, "")  // strip "preț 124.000 € + TVA..."
        .replace(/\s*\|.*$/g, "")                        // strip "| Imobiliare.ro"
        .replace(/\s*\+\s*TVA.*/i, "")                   // strip "+ TVA" leftovers
        .replace(/\s*€.*/g, "")                           // strip "€ ..." leftovers
        .replace(/\s{2,}/g, " ")
        .trim();
      if (addr.length < 3 || addr.length > 200) return undefined;
      return addr;
    }

    const addressRaw = cleanAddress(
      $('[itemprop="address"]').text().trim() ||
      $('meta[property="og:street-address"]').attr("content")?.trim() ||
      (() => {
        // Try breadcrumb location
        const breadcrumb = $('[itemprop="itemListElement"]').last().find('[itemprop="name"]').text().trim();
        if (breadcrumb && breadcrumb.length > 3 && breadcrumb.length < 150) return breadcrumb;
        // Try location-specific selectors
        const locEl = $(".listing-page__location, [class*='location']").first().text().trim();
        if (locEl && locEl.length < 200 && !/descriere|detalii|galerie/i.test(locEl)) return locEl;
        // Regex fallback from raw HTML
        const loc = rawHtml.match(/(?:Militari|Drumul Taberei|Crângași|Crangasi|Sector \d|București|Bucuresti|Voluntari|Pipera|Floreasca|Dorobanți|Dorobanti|Titan|Berceni|Colentina|Rahova|Pantelimon|Lujerului|Dristor|Obor|Tineretului|Iancului|Cotroceni|Giulesti|Baneasa|Herastrau|Greenfield|Pallady|Metalurgiei|Mihai Bravu|Decebal)[^<"]*/i);
        return loc ? loc[0].trim().slice(0, 150) : undefined;
      })(),
    );

    // --- Photos ---
    const photos: string[] = [];
    const seenPhotos = new Set<string>();
    const PHOTO_EXCLUDE = /logo|avatar|agent|banner|sprite|icon|favicon|placeholder|widget|\/similar\b|\/recomandate\b|1x1|pixel|\.svg/i;
    const SMALL_SIZE_RE = /\/(\d{2,3})x(\d{2,3})\//;

    function upgradePhotoUrl(imgUrl: string): string {
      // Imobiliare.ro CDN uses size segments like /300x200/ — upgrade to larger
      let upgraded = imgUrl.replace(SMALL_SIZE_RE, (_, w, h) => {
        const nw = parseInt(w, 10);
        const nh = parseInt(h, 10);
        if (nw < 800 || nh < 600) return "/1200x900/";
        return `/${w}x${h}/`;
      });
      // Also try replacing _thumb or _small suffixes
      upgraded = upgraded.replace(/_thumb\b/i, "").replace(/_small\b/i, "");
      return upgraded;
    }

    function addPhoto(src: string) {
      if (!src || PHOTO_EXCLUDE.test(src)) return;
      const full = upgradePhotoUrl(new URL(src, url).toString());
      const key = full.replace(/\?.*$/, ""); // dedup ignoring query params
      if (seenPhotos.has(key)) return;
      seenPhotos.add(key);
      photos.push(full);
    }

    // Priority 1: Gallery images from JSON/script data (highest quality)
    const gallerySection = rawHtml.match(/"gallery":\s*\[([^\]]+)\]/i)
      ?? rawHtml.match(/"images":\s*\[([^\]]+)\]/i)
      ?? rawHtml.match(/"photos":\s*\[([^\]]+)\]/i);
    if (gallerySection) {
      const urls = gallerySection[1].matchAll(/https?:\/\/[^"'\s]+(?:\.jpg|\.jpeg|\.png|\.webp)/gi);
      for (const m of urls) addPhoto(m[0]);
    }

    // Priority 2: Gallery container images (prefer data-original > data-src > src)
    $('[class*="gallery"] img, [class*="carousel"] img, [class*="slider"] img, [data-gallery] img').each((_, el) => {
      const src = $(el).attr("data-original") || $(el).attr("data-src") || $(el).attr("data-lazy-src") || $(el).attr("src");
      if (src) addPhoto(src);
    });

    // Priority 3: broader img search scoped to listing content
    if (photos.length < 3) {
      $('img[src*="imobiliare"], img[data-src*="imobiliare"], img[data-lazy-src*="imobiliare"]').each((_, el) => {
        const src = $(el).attr("data-original") || $(el).attr("data-src") || $(el).attr("data-lazy-src") || $(el).attr("src");
        if (src) addPhoto(src);
      });
    }

    // Priority 4: OG image fallback
    if (!photos.length) {
      const ogImage = $('meta[property="og:image"]').attr("content");
      if (ogImage) addPhoto(ogImage);
    }

    // --- Geocode ---
    let lat: number | undefined;
    let lng: number | undefined;
    const latMatch = rawHtml.match(/["']?lat(?:itude)?["']?\s*[:=]\s*["']?([\d.]+)/i);
    const lngMatch = rawHtml.match(/["']?lng|lon(?:gitude)?["']?\s*[:=]\s*["']?([\d.]+)/i);
    if (latMatch && lngMatch) {
      const parsedLat = parseFloat(latMatch[1]);
      const parsedLng = parseFloat(lngMatch[1]);
      if (parsedLat > 43 && parsedLat < 49 && parsedLng > 20 && parsedLng < 30) {
        lat = parsedLat;
        lng = parsedLng;
      }
    }

    // --- Seller type ---
    let sellerType: string | undefined;

    // Priority 1: explicit spec field (most reliable)
    const sellerSpec = findSpecText($, "Tip vânzător") || findSpecText($, "Tip vanzator") || findSpecText($, "Oferit de");
    if (sellerSpec) {
      const sl = sellerSpec.toLowerCase();
      if (sl.includes("dezvoltator") || sl.includes("constructor")) sellerType = "dezvoltator";
      else if (sl.includes("proprietar") || sl.includes("particular")) sellerType = "proprietar";
      else if (sl.includes("agent") || sl.includes("agentie") || sl.includes("agenție")) sellerType = "agentie";
    }

    // Priority 2: developer signals from title + description (not whole-page HTML)
    if (!sellerType) {
      const titleAndDesc = `${title ?? ""} ${description ?? ""}`.toLowerCase();
      const developerSignals = [
        /\b(?:dezvoltator|constructor)\b/i,
        /\b(?:ansamblu\s*rezidential|ansamblu\s*rezidențial|complex\s*rezidential)\b/i,
        /comision\s*0\s*%/i,
        /\bin\s+constructie\b/i,
        /\bin\s+construcție\b/i,
        /nemobilat.*(?:predare|recept)/i,
      ];
      if (developerSignals.some((re) => re.test(titleAndDesc))) {
        sellerType = "dezvoltator";
      }
    }

    // Priority 3: contact section / seller name hints
    if (!sellerType) {
      const contactSection = $('[class*="contact"], [class*="seller"], [class*="ofertant"]').text().toLowerCase();
      if (/dezvoltator|constructor|residence|city|towers|park|plaza/i.test(contactSection)) {
        sellerType = "dezvoltator";
      } else if (/agentie|agenție|agent\s+imobiliar/i.test(contactSection)) {
        sellerType = "agentie";
      } else if (/proprietar|particular/i.test(contactSection)) {
        sellerType = "proprietar";
      }
    }

    // Priority 4: fallback - check page-level "comision 0%" badge
    if (!sellerType) {
      const comisionBadge = $('[class*="comision"], [class*="commission"]').text().toLowerCase();
      if (/0\s*%/.test(comisionBadge)) sellerType = "dezvoltator";
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
          source: "imobiliare.ro",
          extractedAt: new Date().toISOString(),
          description: description ?? undefined,
          sellerType,
        },
      },
    };
  },
};

async function discoverFromSitemap(sitemapUrl: string): Promise<DiscoverResult> {
  const res = await fetch(sitemapUrl, {
    headers: { "User-Agent": "ImobIntelBot/1.0 (+https://imobintel.ro/bot)" },
  });
  const xml = await res.text();

  const parser = new XMLParser();
  const parsed = parser.parse(xml);

  const links: string[] = [];

  if (parsed.sitemapindex?.sitemap) {
    const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
      ? parsed.sitemapindex.sitemap
      : [parsed.sitemapindex.sitemap];

    for (const sm of sitemaps) {
      if (sm.loc) links.push(sm.loc);
    }
  }

  if (parsed.urlset?.url) {
    const urls = Array.isArray(parsed.urlset.url) ? parsed.urlset.url : [parsed.urlset.url];

    for (const u of urls) {
      if (u.loc && (u.loc.includes("/vanzare-") || u.loc.includes("/oferta/"))) {
        links.push(u.loc);
      }
    }
  }

  return { links: [...new Set(links)], next: null };
}
