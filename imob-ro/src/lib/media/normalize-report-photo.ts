import { pickLargestSrcsetUrl, upgradeListingPhotoUrl } from "./upgrade-listing-photo-url";

const URL_KEYS_PREFERENCE = [
  "originalUrl",
  "original",
  "full",
  "large",
  "highRes",
  "high",
  "url",
  "src",
  "image",
  "photo",
  "medium",
  "thumb",
  "thumbnail",
  "small",
] as const;

/**
 * Normalize a photo entry from extracted JSON (string | { url, srcset, ... }) to a single HTTPS URL,
 * preferring the largest available variant before CDN-specific upgrades.
 */
export function normalizeReportPhotoEntry(entry: unknown): string | null {
  if (typeof entry === "string") {
    const u = entry.startsWith("//") ? `https:${entry}` : entry;
    if (u.startsWith("http")) return upgradeListingPhotoUrl(u);
    return null;
  }

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const o = entry as Record<string, unknown>;

  const srcsetRaw = o.srcset ?? o.srcSet ?? o.imageSrcset;
  if (typeof srcsetRaw === "string" && srcsetRaw.trim()) {
    const best = pickLargestSrcsetUrl(srcsetRaw);
    if (best?.startsWith("http") || best?.startsWith("//")) {
      const u = best.startsWith("//") ? `https:${best}` : best;
      return upgradeListingPhotoUrl(u);
    }
  }

  for (const k of URL_KEYS_PREFERENCE) {
    const v = o[k];
    if (typeof v !== "string" || !v.trim()) continue;
    const u = v.startsWith("//") ? `https:${v}` : v;
    if (u.startsWith("http")) return upgradeListingPhotoUrl(u);
  }

  return null;
}
