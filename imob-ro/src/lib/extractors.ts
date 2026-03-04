import { pickAdapter } from "./crawl/adapters";
import { getServerWhitelist } from "./config";

type Extracted = {
  title?: string | null;
  price?: number | null;
  currency?: string | null;
  areaM2?: number | null;
  titleAreaM2?: number | null;
  rooms?: number | null;
  floor?: number | null;
  floorRaw?: string | null;
  yearBuilt?: number | null;
  addressRaw?: string | null;
  lat?: number | null;
  lng?: number | null;
  photos?: string[] | null;
  sourceMeta?: Record<string, unknown> | null;
};

// Simple in-memory rate limiter per hostname: allow 1 request per 2 seconds by default
const rateLimits: Record<string, { last: number }> = {};
const RATE_WINDOW_MS = 2000;

function parseNumberFromText(s?: string | null) {
  if (!s) return null;
  // remove common thousands separators: comma, dot, middle-dot, spaces
  const cleaned = s.replace(/[.,·\s]+/g, "").match(/(\d+)/);
  return cleaned ? parseInt(cleaned[1], 10) : null;
}

export function extractGeneric(html: string): Extracted {
  const result: Extracted = {};
  // quick DOM via DOMParser isn't available server-side; use regex heuristics

  // og:title
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitle) result.title = ogTitle[1].trim();

  // ld+json parsing for common schemas
  const ldMatches = Array.from(
    html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  );
  for (const m of ldMatches) {
    try {
      const obj = JSON.parse(m[1]);
      const node = Array.isArray(obj) ? obj[0] : obj;
      if (!result.title && (node.name || node.title))
        result.title = (node.name || node.title).toString();
      // Offer/Product/RealEstateListing structures
      const offer =
        node.offers ||
        node.offer ||
        (node["@type"] && node["@type"].toLowerCase().includes("offer"))
          ? node
          : null;
      if (offer) {
        if (!result.price && offer.price) result.price = parseNumberFromText(String(offer.price));
        if (!result.currency && offer.priceCurrency) result.currency = String(offer.priceCurrency);
      }
      if (!result.areaM2 && node["floorSize"]) {
        result.areaM2 = parseNumberFromText(String(node["floorSize"]?.value || node["floorSize"]));
      }
    } catch {
      // ignore parse errors
    }
  }

  // fallbacks via regex: price and area (m²)
  if (!result.price) {
    const priceMatch = html.match(
      /(?:pret|preț|price|€|lei)[:\s\n]*([0-9][0-9\s\.,]*)\s*(?:lei|€|eur)?/i,
    );
    if (priceMatch) result.price = parseNumberFromText(priceMatch[1]);
  }

  if (!result.areaM2) {
    const areaMatch = html.match(/(\d+[\s\.,]*\d*)\s*(?:m2|m²|mp|mp\.|mp\b)/i);
    if (areaMatch) result.areaM2 = parseNumberFromText(areaMatch[1]);
  }

  // rooms from HTML heuristics
  if (!result.rooms) {
    const roomsMatch = html.match(/(\d)\s*(?:camere|camera|cam\.?)\b/i);
    if (roomsMatch) result.rooms = parseInt(roomsMatch[1], 10);
    else if (/\bgarsonier[aă]\b/i.test(html) || /\bstud?io\b/i.test(html)) {
      result.rooms = 1;
    }
  }

  // floor from HTML heuristics
  if (!result.floorRaw) {
    const floorMatch = html.match(/(?:etaj|floor)[:\s]*([^<,]{1,30})/i);
    if (floorMatch) result.floorRaw = floorMatch[1].trim();
  }

  // year built from HTML
  if (!result.yearBuilt) {
    const yearMatch = html.match(/(?:an\s+construc[tț]ie|year\s*built)[:\s]*(\d{4})/i);
    if (yearMatch) result.yearBuilt = parseInt(yearMatch[1], 10);
  }

  // simple address heuristics
  if (!result.addressRaw) {
    const addr =
      html.match(/<meta[^>]+property=["']og:street-address["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/address[^>]*>([^<]{10,200})</i);
    if (addr) result.addressRaw = addr[1].trim();
  }

  // Fallback: extract Romanian street address from description in HTML
  if (!result.addressRaw) {
    const textBlob = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const addrMatch = textBlob.match(
      /(?:pe\s+|strada\s+|str\.?\s+|bulevardul\s+|bd\.?\s+|calea\s+|aleea\s+|soseaua\s+|sos\.?\s+|splaiul\s+)([A-ZÀ-Ž][A-Za-zÀ-ž\s.-]{3,50})/i
    );
    if (addrMatch) {
      const street = addrMatch[0].trim();
      const sectorMatch = textBlob.match(/sector(?:ul)?\s*(\d)/i);
      result.addressRaw = sectorMatch ? `${street}, Sector ${sectorMatch[1]}, Bucuresti` : street;
    }
  }

  // Extract area from title (often inflated with balcony)
  if (result.title) {
    const titleArea = result.title.match(/(\d{2,3})\s*(?:m2|m²|mp)\b/i);
    if (titleArea) {
      result.titleAreaM2 = parseInt(titleArea[1], 10);
    }
  }

  // photos from og:image
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImage) result.photos = [ogImage[1]];

  return result;
}

export async function maybeFetchServer(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    // allow server scraping only when explicitly enabled
    if (!process.env.ALLOW_SERVER_SCRAPE || process.env.ALLOW_SERVER_SCRAPE === "false") {
      return null;
    }
    const whitelist = getServerWhitelist();
    if (!whitelist.has(host)) return null;

    // disallowed domains env (explicit blocklist) - quick check
    const disallowed = (process.env.DISALLOWED_DOMAINS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (disallowed.includes(host)) return null;

    const now = Date.now();
    const rl = rateLimits[host] || { last: 0 };
    if (now - rl.last < RATE_WINDOW_MS) {
      // rate-limited
      return null;
    }
    rl.last = now;
    rateLimits[host] = rl;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;
    const html = await res.text();

    // Use crawl adapter for known domains (richer extraction)
    try {
      const adapter = pickAdapter(u);
      if (adapter.domain !== "*") {
        const result = await adapter.extract({ url: u, html });
        return result.extracted as Extracted;
      }
    } catch {
      // Fall through to generic
    }

    return extractGeneric(html);
  } catch {
    return null;
  }
}

export type { Extracted };
