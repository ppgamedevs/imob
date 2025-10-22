/**
 * Day 25 - Fetcher with Cache & Throttling
 * Polite crawler with ETag/Last-Modified support and per-host rate limiting
 */

import { prisma } from "@/lib/db";

// Per-host throttling: track last fetch timestamp
const timers = new Map<string, number>();

/**
 * Fetch URL with conditional requests (ETag/Last-Modified)
 * and per-host rate limiting
 */
export async function fetchWithCache(u: URL, init?: RequestInit) {
  const host = u.hostname.replace(/^www\./, "");
  const throttleMs = await hostDelay(host);

  // Per-host rate limiting
  const last = timers.get(host) || 0;
  const now = Date.now();
  const wait = Math.max(0, throttleMs - (now - last));
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }

  // Get cached headers
  const cache = await prisma.urlCache
    .findUnique({ where: { url: u.toString() } })
    .catch(() => null);

  const headers: HeadersInit = {
    ...((init?.headers as Record<string, string>) || {}),
    "User-Agent": "ImobIntelBot/1.0 (+https://imob.ro/bot)",
  };

  if (cache?.etag) headers["If-None-Match"] = cache.etag;
  if (cache?.lastMod) headers["If-Modified-Since"] = cache.lastMod;

  let res: Response | undefined;
  let err: Error | undefined;

  try {
    res = await fetch(u.toString(), {
      ...init,
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    timers.set(host, Date.now());

    // Log successful fetch
    await prisma.fetchLog
      .create({
        data: {
          url: u.toString(),
          domain: host,
          statusCode: res.status,
          etag: res.headers.get("etag") ?? undefined,
          lastMod: res.headers.get("last-modified") ?? undefined,
          bytes: Number(res.headers.get("content-length") || 0),
        },
      })
      .catch(() => {});
  } catch (e: unknown) {
    err = e as Error;
    timers.set(host, Date.now());

    // Log failed fetch
    await prisma.fetchLog
      .create({
        data: {
          url: u.toString(),
          domain: host,
          error: String(e),
        },
      })
      .catch(() => {});
  }

  if (err) throw err;
  if (!res) throw new Error("no response");

  // Handle 304 Not Modified
  if (res.status === 304) {
    return { status: 304, html: null as string | null, res };
  }

  // Update cache with new headers
  const etag = res.headers.get("etag");
  const lastMod = res.headers.get("last-modified");
  if (etag || lastMod) {
    await prisma.urlCache
      .upsert({
        where: { url: u.toString() },
        update: { etag: etag ?? undefined, lastMod: lastMod ?? undefined },
        create: { url: u.toString(), etag: etag ?? undefined, lastMod: lastMod ?? undefined },
      })
      .catch(() => {});
  }

  const html = await res.text();
  return { status: res.status, html, res };
}

/**
 * Get throttling delay for a host from ListingSource or default
 */
async function hostDelay(host: string): Promise<number> {
  const src = await prisma.listingSource.findUnique({ where: { domain: host } }).catch(() => null);
  return src?.minDelayMs ?? 2000;
}
