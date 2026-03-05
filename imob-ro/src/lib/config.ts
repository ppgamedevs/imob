// Centralized config helper.
// Use NEXT_PUBLIC_ANALYZE_ENDPOINT to override in client builds (e.g. Vercel env).
export const getAnalyzeEndpoint = () => {
  // prefer public env var for client-side builds
  if (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_ANALYZE_ENDPOINT) {
    return process.env.NEXT_PUBLIC_ANALYZE_ENDPOINT;
  }
  // fallback placeholder
  return "https://YOUR_DOMAIN/api/analyze/client-push";
};

export const ANALYZE_ENDPOINT = getAnalyzeEndpoint();

const SUPPORTED_DOMAINS = [
  "imobiliare.ro",
  "storia.ro",
  "olx.ro",
  "publi24.ro",
  "lajumate.ro",
  "homezz.ro",
];

// Server-side: read whitelist from SERVER_WHITELIST env (comma separated).
// Always includes all supported adapter domains so they can never be accidentally excluded.
export function getServerWhitelist(): Set<string> {
  const raw = (process.env.SERVER_WHITELIST || "").trim();
  const extra = raw
    ? raw
        .split(",")
        .map((s) =>
          s
            .trim()
            .replace(/^www\./i, "")
            .toLowerCase(),
        )
        .filter(Boolean)
    : [];
  return new Set([...SUPPORTED_DOMAINS, ...extra]);
}
