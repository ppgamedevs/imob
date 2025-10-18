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

// Server-side: read whitelist from SERVER_WHITELIST env (comma separated), fallback to a small default set.
export function getServerWhitelist(): Set<string> {
  const raw = (process.env.SERVER_WHITELIST || "").trim();
  if (raw) {
    return new Set(
      raw
        .split(",")
        .map((s) =>
          s
            .trim()
            .replace(/^www\./i, "")
            .toLowerCase(),
        )
        .filter(Boolean),
    );
  }
  return new Set([
    "imobiliare.ro",
    "olx.ro",
    "storia.ro",
    "homezz.ro",
    "publi24.ro",
    "example.com",
  ]);
}
