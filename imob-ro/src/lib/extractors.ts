import { pickAdapter } from "./crawl/adapters";
import { getServerWhitelist } from "./config";
import { logger } from "./obs/logger";

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

  // Fallback: extract address from title using neighborhoods and project names
  if (!result.addressRaw && result.title) {
    const titleLower = result.title.toLowerCase();
    // Known Bucharest neighborhoods
    const NEIGHBORHOODS = [
      "Militari", "Drumul Taberei", "Crangasi", "Rahova", "Berceni", "Titan",
      "Colentina", "Pantelimon", "Floreasca", "Dorobanti", "Pipera", "Aviatorilor",
      "Aviației", "Tineretului", "Dristor", "Iancului", "Obor", "Mosilor",
      "Cotroceni", "Grozavesti", "Lujerului", "Politehnica", "Victoriei",
      "Unirii", "Universitate", "Romana", "Piata Muncii", "1 Mai", "Giulesti",
      "Bucurestii Noi", "Pajura", "Damaroaia", "Grivita", "Chitila",
      "Baneasa", "Herastrau", "Primaverii", "Domenii", "Kiseleff",
      "13 Septembrie", "Sebastian", "Ferentari", "Giurgiului",
      "Timpuri Noi", "Vitan", "Mihai Bravu", "Decebal", "Alba Iulia",
      "Nerva Traian", "Calea Calarasi", "Calea Mosilor",
      "Popesti Leordeni", "Voluntari", "Chiajna", "Bragadiru", "Magurele",
      "Otopeni", "Stefanestii de Jos",
    ];
    for (const n of NEIGHBORHOODS) {
      if (titleLower.includes(n.toLowerCase())) {
        const sectorMatch = result.title.match(/sector(?:ul)?\s*(\d)/i);
        result.addressRaw = sectorMatch
          ? `${n}, Sector ${sectorMatch[1]}, Bucuresti`
          : `${n}, Bucuresti`;
        break;
      }
    }

    // Known residential projects - extract project name + area, not the full title
    if (!result.addressRaw) {
      const projectNameMatch = result.title.match(
        /\b((?:\w+\s+){0,2}(?:Residence|Residences|Residential|Park|Garden|City|Plaza|Towers?|Heights?|Greenfield|Gran Via|Cortina|Cosmopolis|Rin Grand|One Herastrau|Asmita|Ivory|Nusco|Sky|Upground|Belvedere|Premium|Luxuria|Horizon|Aviatiei\s+Park|West\s+Park|New\s+Point|Colina|Sema)(?:\s+\w+)?)\b/i
      );
      if (projectNameMatch) {
        const projectName = projectNameMatch[1].trim();
        const sectorMatch = result.title.match(/sector(?:ul)?\s*(\d)/i);
        const areaMatch = result.title.match(/[-–—]\s*(Pipera|Militari|Titan|Berceni|Colentina|Drumul Taberei|Rahova|Baneasa|Floreasca|Dorobanti|Cotroceni|Lujerului|Pallady|Pantelimon|Voluntari|Popesti|Chiajna|Bragadiru)\b/i);
        const parts = [projectName];
        if (areaMatch) parts.push(areaMatch[1].trim());
        if (sectorMatch) parts.push(`Sector ${sectorMatch[1]}`);
        parts.push("Bucuresti");
        result.addressRaw = parts.join(", ");
      }
    }

    // Sector mention in title
    if (!result.addressRaw) {
      const sectorMatch = result.title.match(/sector(?:ul)?\s*(\d)/i);
      if (sectorMatch) {
        result.addressRaw = `Sector ${sectorMatch[1]}, Bucuresti`;
      }
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

const FETCH_HEADERS_SETS: Record<string, string>[] = [
  {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  },
  {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ro,en;q=0.5",
    "Upgrade-Insecure-Requests": "1",
  },
];

const MAX_SERVER_FETCH_RETRIES = 2;

async function fetchWithRetry(url: string, timeoutMs = 15_000): Promise<{ ok: boolean; html: string } | null> {
  const log = logger.child({ url, fn: "fetchWithRetry" });

  for (let attempt = 0; attempt < MAX_SERVER_FETCH_RETRIES; attempt++) {
    const headers = FETCH_HEADERS_SETS[attempt % FETCH_HEADERS_SETS.length];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (!res.ok) {
        log.warn({ attempt, status: res.status }, "Server fetch non-OK status");
        if (res.status === 403 || res.status === 503) {
          await new Promise((r) => setTimeout(r, 1000 + attempt * 1000));
          continue;
        }
        return null;
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        log.warn({ attempt, contentType }, "Server fetch non-HTML content type");
        return null;
      }

      const html = await res.text();
      if (html.length < 500) {
        log.warn({ attempt, htmlLen: html.length }, "Server fetch returned suspiciously short HTML");
        continue;
      }

      return { ok: true, html };
    } catch (err) {
      log.warn({ attempt, err }, "Server fetch attempt failed");
      if (attempt < MAX_SERVER_FETCH_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 1000 + attempt * 1000));
      }
    }
  }

  return null;
}

export async function maybeFetchServer(url: string) {
  const log = logger.child({ url, fn: "maybeFetchServer" });

  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    if (!process.env.ALLOW_SERVER_SCRAPE || process.env.ALLOW_SERVER_SCRAPE === "false") {
      log.debug("Server scraping disabled (ALLOW_SERVER_SCRAPE not set)");
      return null;
    }
    const whitelist = getServerWhitelist();
    if (!whitelist.has(host)) {
      log.debug({ host }, "Host not in server whitelist");
      return null;
    }

    const disallowed = (process.env.DISALLOWED_DOMAINS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (disallowed.includes(host)) {
      log.debug({ host }, "Host in disallowed domains");
      return null;
    }

    const now = Date.now();
    const rl = rateLimits[host] || { last: 0 };
    if (now - rl.last < RATE_WINDOW_MS) {
      log.debug({ host }, "Host rate-limited");
      return null;
    }
    rl.last = now;
    rateLimits[host] = rl;

    const result = await fetchWithRetry(url);
    if (!result) {
      log.warn({ host }, "Server fetch failed after retries");
      return null;
    }

    const { html } = result;

    try {
      const adapter = pickAdapter(u);
      if (adapter.domain !== "*") {
        const adapterResult = await adapter.extract({ url: u, html });
        log.info({ host, adapter: adapter.domain }, "Adapter extraction succeeded");
        return adapterResult.extracted as Extracted;
      }
    } catch (err) {
      log.warn({ host, err }, "Adapter extraction failed, falling back to generic");
    }

    return extractGeneric(html);
  } catch (err) {
    log.error({ err }, "maybeFetchServer unexpected error");
    return null;
  }
}

export type { Extracted };
