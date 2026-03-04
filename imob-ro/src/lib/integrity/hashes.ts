import { createHash } from "crypto";

/**
 * Normalize text for hashing: lowercase, strip diacritics, collapse whitespace,
 * remove punctuation noise.
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sha1(text: string): string {
  return createHash("sha1").update(text, "utf8").digest("hex");
}

/**
 * Compute a stable text hash from listing title + description.
 * Normalizes before hashing so minor formatting changes don't create new hashes.
 */
export function computeTextHash(title?: string | null, description?: string | null): string {
  const parts = [
    title ? normalizeText(title) : "",
    description ? normalizeText(description) : "",
  ].filter(Boolean);

  return sha1(parts.join("|"));
}

/**
 * Compute a stable hash from image URLs.
 * Sorts URLs alphabetically for stability across different page orderings.
 * In the future this can be replaced with perceptual hashing (pHash).
 */
export function computeImagesHash(imageUrls: string[]): string | null {
  if (!imageUrls || imageUrls.length === 0) return null;

  const normalized = imageUrls
    .map((u) => {
      try {
        const url = new URL(u);
        url.searchParams.delete("w");
        url.searchParams.delete("h");
        url.searchParams.delete("q");
        url.searchParams.delete("width");
        url.searchParams.delete("height");
        url.searchParams.delete("quality");
        return url.pathname + url.search;
      } catch {
        return u;
      }
    })
    .sort();

  return sha1(normalized.join("\n"));
}
