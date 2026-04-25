/**
 * `unlock_token` and similar query values are bearer-style credentials. Never log or store raw in analytics.
 */

const REDACT = "[redacted]";

const SENSITIVE_PARAM_NAMES = new Set([
  "unlock_token",
  "token",
  "access_token",
  "refresh_token",
  "id_token",
  "code",
  "client_secret",
]);

/**
 * Redacts known sensitive search params. Safe for logging funnel path/referrer and client beacons.
 * Absolute or relative URL strings; unknown shapes are returned unchanged if parsing fails.
 */
export function redactSensitiveUrlParams(url: string | null | undefined): string {
  if (url == null || url === "") return "";
  const trimmed = url.trim();
  if (!trimmed.includes("?") && !trimmed.includes("=")) return trimmed;
  try {
    const u = /^https?:\/\//i.test(trimmed) ? new URL(trimmed) : new URL(trimmed, "https://example.com");
    let changed = false;
    for (const key of u.searchParams.keys()) {
      const lower = key.toLowerCase();
      if (SENSITIVE_PARAM_NAMES.has(lower) || lower.endsWith("_token")) {
        u.searchParams.set(key, REDACT);
        changed = true;
      }
    }
    if (!changed) return trimmed;
    if (/^https?:\/\//i.test(trimmed)) {
      return u.toString();
    }
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return trimmed;
  }
}

/**
 * Strips only pathname + search for beacons, after redaction (no full URL with host if you pass path-only).
 */
export function redactSensitivePathForTracking(path: string | null | undefined): string {
  if (path == null || path === "") return "/";
  return redactSensitiveUrlParams(path);
}
