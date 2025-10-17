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
