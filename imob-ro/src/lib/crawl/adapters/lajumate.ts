import * as cheerio from "cheerio";

import type { DiscoverResult, SourceAdapter } from "../types";

export const adapterLajumate: SourceAdapter = {
  domain: "lajumate.ro",

  async discover(listUrl: URL): Promise<DiscoverResult> {
    const res = await fetch(listUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const links: string[] = [];
    $('a[href*="/ad/"], a[href*="/imobiliare/"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const absolute = new URL(href, listUrl).toString();
        if (absolute.includes("lajumate.ro") && !absolute.includes("?page=")) {
          links.push(absolute);
        }
      }
    });

    const nextHref =
      $('a[rel="next"]').attr("href") ||
      $('a:contains("Pagina urmatoare")').attr("href") ||
      $(".pagination a.next").attr("href");
    const next = nextHref ? new URL(nextHref, listUrl).toString() : null;

    return { links: [...new Set(links)], next };
  },

  async extract({ url, html }) {
    const $ = cheerio.load(html);
    const rawHtml = html as string;

    // --- JSON-LD ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ld: any = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      if (ld) return;
      try {
        const obj = JSON.parse($(el).html() ?? "");
        const node = Array.isArray(obj) ? obj[0] : obj;
        if (node?.["@type"] || node?.name) ld = node;
      } catch { /* ignore */ }
    });

    // --- Title ---
    const title =
      (ld?.name as string) ??
      ($("h1").first().text().trim() ||
        $("title").text().split("|")[0]?.trim() ||
        $("title").text().split("-")[0]?.trim());

    // --- Price ---
    let price: number | undefined;
    let currency = "EUR";

    const ldPrice = ld?.offers
      ? (ld.offers as Record<string, unknown>)?.price
      : ld?.price;
    if (ldPrice) {
      price = parseInt(String(ldPrice).replace(/[\s,.]/g, ""));
      const ldCurrency = ld?.offers
        ? (ld.offers as Record<string, unknown>)?.priceCurrency
        : ld?.priceCurrency;
      if (ldCurrency) currency = String(ldCurrency).toUpperCase();
    }

    if (!price) {
      const priceTexts = [
        $(".offer-price, .price, [class*=price]").first().text(),
        $('[itemprop="price"]').attr("content"),
      ];
      for (const pt of priceTexts) {
        if (!pt) continue;
        const m = pt.replace(/[\s.]/g, "").match(/([\d,]+)/);
        if (m) {
          price = parseInt(m[1].replace(",", ""));
          if (/lei|ron/i.test(pt)) currency = "RON";
          break;
        }
      }
    }

    // Fallback: regex on full text near title
    if (!price) {
      const priceMatch = rawHtml.match(/([\d][.\d\s]*\d)\s*(?:eur|€)/i);
      if (priceMatch) price = parseInt(priceMatch[1].replace(/[\s.]/g, ""));
    }

    // --- Specs: lajumate uses labeled pairs in the specs section ---
    function findSpecValue(label: string): string | undefined {
      let result: string | undefined;
      // Look for text nodes containing the label, then grab next sibling/adjacent value
      $("div, li, span, td, dt, th").each((_, el) => {
        if (result) return;
        const text = $(el).text().trim();
        if (text.toLowerCase().includes(label.toLowerCase()) && text.length < 100) {
          // Often the value is in the same element or the next sibling
          const next = $(el).next();
          const nextText = next.text().trim();
          if (nextText && nextText.length < 50 && nextText !== text) {
            result = nextText;
            return;
          }
          // Value might be inline: "Numar Camere2" or "Etaj3"
          const inlineMatch = text.match(new RegExp(label + "\\s*:?\\s*(.+)", "i"));
          if (inlineMatch) {
            result = inlineMatch[1].trim();
          }
        }
      });
      return result;
    }

    // Area
    let areaM2: number | undefined;
    const areaText = findSpecValue("Suprafat") ?? findSpecValue("suprafata");
    if (areaText) {
      const m = areaText.match(/(\d+)/);
      if (m) areaM2 = parseInt(m[1]);
    }
    if (!areaM2) {
      const areaMatch = rawHtml.match(/(\d{2,3})\s*(?:m²|mp|m2)/i);
      if (areaMatch) areaM2 = parseInt(areaMatch[1]);
    }

    // Rooms
    let rooms: number | undefined;
    const roomsText = findSpecValue("Numar Camere") ?? findSpecValue("camere");
    if (roomsText) {
      const m = roomsText.match(/(\d+)/);
      if (m) rooms = parseInt(m[1]);
    }
    if (!rooms && /\bgarsonier/i.test(title ?? "")) rooms = 1;

    // Floor
    let floorRaw: string | undefined;
    const floorText = findSpecValue("Etaj");
    if (floorText && floorText.length < 30) {
      floorRaw = floorText.replace(/[^\d\/a-zA-Z\s]/g, "").trim();
    }

    // Year built
    let yearBuilt: number | undefined;
    const yearText = findSpecValue("An construc") ?? findSpecValue("constructie");
    if (yearText) {
      const m = yearText.match(/(\d{4})/);
      if (m) yearBuilt = parseInt(m[1]);
    }

    // Compartimentare
    const compartiment = findSpecValue("Compartimentare") ?? findSpecValue("compartimentare");

    // Address
    const addressRaw =
      $('[class*="location"], [class*="Location"]').first().text().trim().replace(/\s+/g, " ") ||
      $('span:contains("Bucuresti"), span:contains("Cluj"), span:contains("Iasi")').first().text().trim() ||
      $('[itemprop="address"]').text().trim() ||
      undefined;

    // Photos
    const photos: string[] = [];
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
      if (
        src &&
        src.startsWith("http") &&
        !src.includes("placeholder") &&
        !src.includes("no-photo") &&
        !src.includes("logo") &&
        !src.includes("icon") &&
        !src.includes("badge") &&
        !src.includes("avatar") &&
        !src.includes("google") &&
        !src.includes("facebook") &&
        (src.includes("lajumate") || src.includes("cloudfront") || src.includes("cdn"))
      ) {
        photos.push(src);
      }
    });

    // Also try og:image
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogImage && ogImage.startsWith("http")) photos.unshift(ogImage);

    // Geocode
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

    // Description
    let description: string | undefined;
    const descSection = $("h2:contains('Descriere'), h3:contains('Descriere'), h4:contains('Descriere'), h5:contains('Descriere')");
    if (descSection.length > 0) {
      const descEl = descSection.first().nextAll("div, p").first();
      description = descEl.text().trim().slice(0, 2000) || undefined;
    }
    if (!description) {
      const descEl = $(".offer-description, .description-text, [class*=descriere], [class*=description]").first();
      description = descEl.text().trim().slice(0, 2000) || undefined;
    }
    // Fallback: grab meta description
    if (!description) {
      description = $('meta[name="description"]').attr("content")?.trim() || undefined;
    }

    // Seller type
    let sellerType: string | undefined;
    const bodyText = rawHtml.toLowerCase();
    if (/\b(?:agentie|agenție|agent imobiliar|intermediar)\b/.test(bodyText)) sellerType = "agentie";
    else if (/\b(?:proprietar|particular)\b/.test(bodyText)) sellerType = "proprietar";
    else if (/\b(?:dezvoltator|constructor)\b/.test(bodyText)) sellerType = "dezvoltator";

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
          source: "lajumate.ro",
          description,
          sellerType,
          compartimentare: compartiment,
          extractedAt: new Date().toISOString(),
        },
      },
    };
  },
};
