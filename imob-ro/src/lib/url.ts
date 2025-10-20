export function normalizeUrl(u: string | null | undefined) {
  if (!u) return null;
  try {
    const url = new URL(String(u).trim());
    // strip hash + common trackers
    url.hash = "";
    const p = url.searchParams;
    const toDelete = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
    ];
    for (const k of toDelete) p.delete(k);
    return url.toString();
  } catch {
    return null;
  }
}
