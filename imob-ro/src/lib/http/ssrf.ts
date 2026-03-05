/**
 * SSRF (Server-Side Request Forgery) protection.
 *
 * Validates URLs before server-side fetching to block requests
 * to internal networks, cloud metadata endpoints, and non-HTTP schemes.
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
  "metadata.google.com",
  "169.254.169.254",
]);

const PRIVATE_IP_RANGES = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  /^100\.(6[4-9]|[7-9]\d|1[0-2]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/,
  /^0\.0\.0\.0$/,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^\[?fe80:/i,
  /^\[?fd[0-9a-f]{2}:/i,
  /^\[?::1\]?$/,
];

function isPrivateIp(hostname: string): boolean {
  return PRIVATE_IP_RANGES.some((re) => re.test(hostname));
}

export interface SsrfCheckResult {
  safe: boolean;
  reason?: string;
}

/**
 * Check whether a URL is safe to fetch from the server.
 * Returns `{ safe: true }` if OK, or `{ safe: false, reason }` if blocked.
 */
export function isSafeUrl(raw: string): SsrfCheckResult {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { safe: false, reason: "invalid_url" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { safe: false, reason: "blocked_scheme" };
  }

  const host = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTS.has(host)) {
    return { safe: false, reason: "blocked_host" };
  }

  if (isPrivateIp(host)) {
    return { safe: false, reason: "private_ip" };
  }

  if (parsed.username || parsed.password) {
    return { safe: false, reason: "credentials_in_url" };
  }

  return { safe: true };
}

/**
 * Validate a URL against SSRF and an optional domain allowlist.
 * Throws if the URL is unsafe.
 */
export function assertSafeUrl(
  raw: string,
  opts?: { allowedDomains?: string[] },
): URL {
  const check = isSafeUrl(raw);
  if (!check.safe) {
    throw new Error(`Blocked URL (${check.reason})`);
  }

  const parsed = new URL(raw);

  if (opts?.allowedDomains?.length) {
    const host = parsed.hostname.toLowerCase();
    const allowed = opts.allowedDomains.some(
      (d) => host === d || host.endsWith(`.${d}`),
    );
    if (!allowed) {
      throw new Error("Blocked URL (domain_not_allowed)");
    }
  }

  return parsed;
}

/** Listing site domains we actually support */
export const LISTING_DOMAINS = [
  "imobiliare.ro",
  "olx.ro",
  "storia.ro",
  "publi24.ro",
  "anuntul.ro",
];

/** Image CDN domains safe to proxy */
export const IMAGE_DOMAINS = [
  "imobiliare.ro",
  "olx.ro",
  "storia.ro",
  "images.unsplash.com",
  "res.cloudinary.com",
];
