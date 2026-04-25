import { pickAdapter } from "./crawl/adapters";
import { getServerWhitelist } from "./config";
import { extractLatLngFromHtml } from "@/lib/geo/extract-coords-from-html";
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

  // Coordinates (imobiliare.ro / map widgets / ld+json) — critical for POI + risk proxies
  if (result.lat == null || result.lng == null) {
    const geo = extractLatLngFromHtml(html);
    if (geo) {
      result.lat = geo.lat;
      result.lng = geo.lng;
    }
  }

  return result;
}

const FETCH_HEADERS_SETS: Record<string, string>[] = [
  {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
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
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ro,en;q=0.5",
    "Upgrade-Insecure-Requests": "1",
  },
  {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "ro-RO,ro;q=0.8,en-US;q=0.5,en;q=0.3",
  },
  {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7",
  },
];

/** Publi24 / Lajumate / Homezz often return 403 or empty shells to “bot” patterns — rotate UAs and referrers. */
const MAX_SERVER_FETCH_RETRIES = 4;

function extraFetchHeadersForHost(urlStr: string): Record<string, string> {
  try {
    const host = new URL(urlStr).hostname.replace(/^www\./, "").toLowerCase();
    if (host === "publi24.ro" || host === "m.publi24.ro") {
      return { Referer: "https://www.publi24.ro/" };
    }
    if (host === "lajumate.ro") {
      return { Referer: "https://lajumate.ro/" };
    }
    if (host === "homezz.ro") {
      return { Referer: "https://www.homezz.ro/" };
    }
  } catch {
    /* ignore */
  }
  return {};
}

type FetchWithRetryResult =
  | { kind: "ok"; html: string }
  | { kind: "no_html"; sub: "timeout" | "blocked" | "other" };

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

async function fetchWithRetry(url: string, timeoutMs = 15_000): Promise<FetchWithRetryResult> {
  const log = logger.child({ url, fn: "fetchWithRetry" });
  const hostExtra = extraFetchHeadersForHost(url);
  let noHtml: "timeout" | "blocked" | "other" = "other";

  for (let attempt = 0; attempt < MAX_SERVER_FETCH_RETRIES; attempt++) {
    const base = FETCH_HEADERS_SETS[attempt % FETCH_HEADERS_SETS.length];
    const headers = { ...base, ...hostExtra };
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
        if (res.status === 403 || res.status === 429 || res.status === 503) {
          noHtml = "blocked";
          await new Promise((r) => setTimeout(r, 1000 + attempt * 1000));
          continue;
        }
        if (res.status === 408 || res.status === 504) {
          noHtml = "timeout";
        }
        if (attempt < MAX_SERVER_FETCH_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, 1000 + attempt * 1000));
        }
        continue;
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        log.warn({ attempt, contentType }, "Server fetch non-HTML content type");
        if (attempt < MAX_SERVER_FETCH_RETRIES - 1) {
          continue;
        }
        return { kind: "no_html", sub: noHtml };
      }

      const html = await res.text();
      const looksLikeListing = /og:title|ld\+json|h1|anunt|pret|preț|price|vanzare/i.test(html);
      if (html.length < 500 && !looksLikeListing) {
        log.warn({ attempt, htmlLen: html.length }, "Server fetch returned suspiciously short HTML");
        if (attempt < MAX_SERVER_FETCH_RETRIES - 1) {
          continue;
        }
        return { kind: "no_html", sub: "other" };
      }
      if (html.length < 200) {
        log.warn({ attempt, htmlLen: html.length }, "Server fetch HTML too short to parse");
        if (attempt < MAX_SERVER_FETCH_RETRIES - 1) {
          continue;
        }
        return { kind: "no_html", sub: "other" };
      }

      return { kind: "ok", html };
    } catch (err) {
      if (isAbortError(err)) noHtml = "timeout";
      log.warn({ attempt, err }, "Server fetch attempt failed");
      if (attempt < MAX_SERVER_FETCH_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 1000 + attempt * 1000));
      }
    }
  }

  return { kind: "no_html", sub: noHtml };
}

/** Păstrează câmpurile bune din adapter, completează golurile din heuristica generică. */
function mergeWithGenericExtraction(adapter: Extracted, html: string): Extracted {
  const gen = extractGeneric(html);
  return {
    ...gen,
    ...adapter,
    title: (adapter.title && String(adapter.title).trim()) || gen.title,
    price:
      adapter.price != null && (adapter.price as number) > 0
        ? adapter.price
        : gen.price,
    currency: adapter.currency || gen.currency,
    areaM2:
      adapter.areaM2 != null && (adapter.areaM2 as number) > 0
        ? adapter.areaM2
        : gen.areaM2,
    titleAreaM2: adapter.titleAreaM2 ?? gen.titleAreaM2,
    rooms:
      adapter.rooms != null && (adapter.rooms as number) > 0
        ? adapter.rooms
        : gen.rooms,
    floor: adapter.floor ?? gen.floor,
    floorRaw: adapter.floorRaw || gen.floorRaw,
    yearBuilt: adapter.yearBuilt ?? gen.yearBuilt,
    addressRaw: adapter.addressRaw || gen.addressRaw,
    lat: adapter.lat ?? gen.lat,
    lng: adapter.lng ?? gen.lng,
    photos: adapter.photos && adapter.photos.length > 0 ? adapter.photos : gen.photos,
    sourceMeta: (() => {
      const a = (adapter.sourceMeta as Record<string, unknown> | null) ?? null;
      const g = (gen.sourceMeta as Record<string, unknown> | null) ?? null;
      if (a && Object.keys(a).length > 0) return { ...g, ...a };
      return g ?? a;
    })(),
  };
}

export type ServerScrapeDeclineReason = "fetch_timeout_blocked" | "extraction_failed";

/**
 * Server-side fetch + parse (when allowed). Distinguish timeout / blocked from generic extraction failure.
 */
export async function tryServerScrapeForAnalysis(
  url: string,
): Promise<{ ok: true; data: Extracted } | { ok: false; reason: ServerScrapeDeclineReason }> {
  const log = logger.child({ url, fn: "tryServerScrapeForAnalysis" });

  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    if (!process.env.ALLOW_SERVER_SCRAPE || process.env.ALLOW_SERVER_SCRAPE === "false") {
      log.debug("Server scraping disabled (ALLOW_SERVER_SCRAPE not set)");
      return { ok: false, reason: "extraction_failed" };
    }
    const whitelist = getServerWhitelist();
    if (!whitelist.has(host)) {
      log.debug({ host }, "Host not in server whitelist");
      return { ok: false, reason: "extraction_failed" };
    }

    const disallowed = (process.env.DISALLOWED_DOMAINS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (disallowed.includes(host)) {
      log.debug({ host }, "Host in disallowed domains");
      return { ok: false, reason: "extraction_failed" };
    }

    const now = Date.now();
    const rl = rateLimits[host] || { last: 0 };
    if (now - rl.last < RATE_WINDOW_MS) {
      log.debug({ host }, "Host rate-limited");
      return { ok: false, reason: "extraction_failed" };
    }
    rl.last = now;
    rateLimits[host] = rl;

    const result = await fetchWithRetry(url);
    if (result.kind === "no_html") {
      if (result.sub === "timeout" || result.sub === "blocked") {
        log.warn({ host, sub: result.sub }, "Server fetch not usable (timeout/blocked)");
        return { ok: false, reason: "fetch_timeout_blocked" };
      }
      log.warn({ host }, "Server fetch failed after retries");
      return { ok: false, reason: "extraction_failed" };
    }

    const { html } = result;

    try {
      const adapter = pickAdapter(u);
      if (adapter.domain !== "*") {
        const adapterResult = await adapter.extract({ url: u, html });
        const merged = mergeWithGenericExtraction(adapterResult.extracted as Extracted, html);
        log.info({ host, adapter: adapter.domain }, "Adapter extraction + generic merge");
        return { ok: true, data: merged };
      }
    } catch (err) {
      log.warn({ host, err }, "Adapter extraction failed, falling back to generic");
    }

    return { ok: true, data: extractGeneric(html) };
  } catch (err) {
    log.error({ err }, "tryServerScrapeForAnalysis unexpected error");
    return { ok: false, reason: "extraction_failed" };
  }
}

export async function maybeFetchServer(url: string): Promise<Extracted | null> {
  const r = await tryServerScrapeForAnalysis(url);
  return r.ok ? r.data : null;
}

export type { Extracted };
