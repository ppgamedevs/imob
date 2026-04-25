import * as cheerio from "cheerio";

import type { DiscoverResult, SourceAdapter } from "../types";

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function findSpecValue($: cheerio.CheerioAPI, label: string): string | undefined {
  const lf = stripDiacritics(label.toLowerCase());
  let result: string | undefined;

  // Strategy 1: label in one element, value in next sibling
  $("div, dt, td, span, li, th, strong, b").each((_, el) => {
    if (result) return;
    const node = $(el);
    const text = stripDiacritics(node.text().trim().toLowerCase());
    if (!text.includes(lf) || text.length > 100) return;

    const sibling = node.next();
    const sibText = sibling.text().trim();
    if (sibText && sibText.length < 100 && sibText.length > 0 && sibText.toLowerCase() !== text) {
      result = sibText;
      return;
    }

    // Strategy 2: value inline within parent (label and value in same container)
    const parent = node.parent();
    const parentText = stripDiacritics(parent.text().trim());
    const escaped = stripDiacritics(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped + "[:\\s]+(.+)", "i");
    const m = parentText.match(re);
    if (m) {
      const val = m[1].trim().split("\n")[0].trim();
      if (val.length < 80) result = val;
    }
  });

  // Strategy 3: regex on diacritic-stripped raw HTML
  if (!result) {
    const escaped = stripDiacritics(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      escaped + `[^<]*<\\/[^>]+>\\s*(?:<[^>]+>\\s*)*([^<]{1,80})`,
      "i",
    );
    const m = stripDiacritics($.html()).match(re);
    if (m?.[1]) result = m[1].trim();
  }

  return result;
}

export const adapterHomezz: SourceAdapter = {
  domain: "homezz.ro",

  async discover(listUrl: URL): Promise<DiscoverResult> {
    const res = await fetch(listUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.8",
      },
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const links: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const absolute = new URL(href, listUrl).toString();
      if (!absolute.includes("homezz.ro")) return;
      if (/\d{4,}\.html$/.test(href) || /\/anunt\//.test(href) || /\/oferta\//.test(href) || /\/proprietate\//.test(href)) {
        links.push(absolute);
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

    // Try JSON-LD first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ld: any = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      if (ld) return;
      try {
        const raw = $(el).html()?.trim();
        if (!raw) return;
        const obj = JSON.parse(raw) as unknown;
        if (Array.isArray(obj)) {
          const product = obj.find(
            (n) =>
              n &&
              typeof n === "object" &&
              /Product|RealEstate|Residence|Apartment|House|Offer/i.test(
                String((n as { "@type"?: unknown })["@type"]),
              ),
          );
          ld = product ?? obj[0];
        } else if (obj && typeof obj === "object" && Array.isArray((obj as { "@graph"?: unknown[] })["@graph"])) {
          const g = (obj as { "@graph": Record<string, unknown>[] })["@graph"];
          ld =
            g.find(
              (n) =>
                n?.name &&
                /Product|RealEstate|Residence|Apartment|House|Offer/i.test(String(n["@type"])),
            ) ?? g[0];
        } else if (obj && typeof obj === "object") {
          ld = obj;
        }
      } catch {
        /* ignore */
      }
    });

    const title =
      (ld?.name as string) ||
      $('meta[property="og:title"]').attr("content")?.trim() ||
      ($("h1").first().text().trim() ||
        $("title").text().split(",")[0]?.trim() ||
        $("title").text().split("-")[0]?.trim());

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

    // Description (extract early for address fallback)
    const descEl = $('[class*="description"], [class*="descriere"]');
    const description = descEl.first().text().trim().slice(0, 2000) || undefined;

    let addressRaw =
      $('[itemprop="address"]').text().trim() ||
      $('[class*="location"], [class*="adresa"]').first().text().trim() ||
      undefined;

    // Homezz shows location as breadcrumb-like text
    if (!addressRaw) {
      const locText = $('a[href*="/bucuresti"], a[href*="/sector"], a[href*="/zona"]')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((t) => t.length > 2 && t.length < 50);
      if (locText.length > 0) {
        addressRaw = locText.join(", ");
      }
    }

    // Fallback from title
    if (!addressRaw && title) {
      const KNOWN_AREAS = /\b(Militari|Rahova|Berceni|Titan|Colentina|Pantelimon|Floreasca|Dorobanti|Pipera|Tineretului|Dristor|Iancului|Obor|Cotroceni|Lujerului|Crangasi|Drumul Taberei|Victoriei|Unirii|Baneasa|Herastrau|Giulesti)\b/i;
      const areaMatch = title.match(KNOWN_AREAS);
      if (areaMatch) addressRaw = `${areaMatch[1]}, Bucuresti`;
    }

    if (!addressRaw && description) {
      const addrMatch = description.match(
        /(?:pe\s+|strada\s+|str\.?\s+|bulevardul\s+|bd\.?\s+|calea\s+|aleea\s+|soseaua\s+|sos\.?\s+)([A-ZÀ-Ž][A-Za-zÀ-ž\s.-]{3,50})/i
      );
      if (addrMatch) {
        const street = addrMatch[0].trim();
        const sectorMatch = description.match(/sector(?:ul)?\s*(\d)/i);
        addressRaw = sectorMatch ? `${street}, Sector ${sectorMatch[1]}, Bucuresti` : street;
      }
    }

    function pushImageUrl(url: string, bucket: string[]) {
      if (!url.startsWith("http")) return;
      const s = url.toLowerCase();
      if (
        s.includes("logo") ||
        s.includes("icon") ||
        s.includes("avatar") ||
        s.includes("placeholder") ||
        s.includes("banner") ||
        s.includes("sponsor") ||
        s.includes("partner-") ||
        s.includes("footer") ||
        s.includes("nav-") ||
        s.includes("recommend") ||
        s.includes("related") ||
        s.includes("categorie") ||
        s.includes("category-icon")
      ) {
        return;
      }
      bucket.push(url);
    }

    const photos: string[] = [];
    // 1) JSON-LD (listing images only)
    if (ld?.image) {
      const img = ld.image as string | { url?: string } | (string | { url?: string })[];
      if (typeof img === "string") pushImageUrl(img, photos);
      else if (Array.isArray(img)) {
        for (const x of img) {
          if (typeof x === "string") pushImageUrl(x, photos);
          else if (x && typeof x === "object" && (x as { url?: string }).url) {
            pushImageUrl((x as { url: string }).url, photos);
          }
        }
      } else if (img && typeof img === "object" && "url" in (img as object)) {
        const u = (img as { url: string }).url;
        if (u) pushImageUrl(u, photos);
      }
    }
    const og = $('meta[property="og:image"]').attr("content");
    if (og) pushImageUrl(og, photos);

    // 2) Doar imagini din zona conținutului anunțului (fără header/footer/recomandări)
    const $inListing = $(
      "main, [class*='AnuntDetali'], [class*='anunt-detalii'], [class*='listing-detail'], [class*='property-'], [class*='gallery'], article",
    ).first();
    const $scope = $inListing.length ? $inListing : $("#content, .content, #main").first();
    const root = $scope.length ? $scope : $("body");
    root.find("img").each((_, el) => {
      const n = $(el);
      const src = n.attr("src") || n.attr("data-src") || n.attr("data-lazy");
      if (!src) return;
      const full = src.startsWith("//") ? `https:${src}` : src.startsWith("/") ? new URL(src, "https://www.homezz.ro").toString() : src;
      if (!full.startsWith("http")) return;
      const alt = (n.attr("alt") || "").toLowerCase();
      if (alt.includes("logo") || alt.includes("iconiț")) return;
      if (!/homezz|hzz|img\.|imgr|static|cloudfront|amazonaws|twimg|wp-content/i.test(full)) {
        if (!/\.(jpe?g|png|webp)/i.test(full)) return;
      }
      pushImageUrl(full, photos);
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
