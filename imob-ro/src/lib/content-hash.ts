/**
 * Content hashing utilities for deduplication
 */

import crypto from "crypto";

export interface ExtractedContent {
  title?: string | null;
  price?: number | null;
  currency?: string | null;
  areaM2?: number | null;
  rooms?: number | null;
  floor?: number | null;
  yearBuilt?: number | null;
  addressRaw?: string | null;
  lat?: number | null;
  lng?: number | null;
  photos?: unknown[];
  sourceMeta?: unknown;
}

/**
 * Generate SHA256 hash of extracted listing content for deduplication.
 * Only hashes meaningful fields (title, price, areaM2, lat/lng, photos count).
 * Ignores temporal metadata and source-specific fields.
 */
export function generateContentHash(content: ExtractedContent): string {
  // Normalize content to stable fields for hashing
  const normalizedContent = {
    title: normalizeString(content.title),
    price: content.price || null,
    currency: content.currency || null,
    areaM2: content.areaM2 || null,
    rooms: content.rooms || null,
    floor: content.floor || null,
    yearBuilt: content.yearBuilt || null,
    addressRaw: normalizeString(content.addressRaw),
    lat: content.lat ? Number(content.lat.toFixed(6)) : null, // 6 decimals = ~10cm precision
    lng: content.lng ? Number(content.lng.toFixed(6)) : null,
    photosCount: Array.isArray(content.photos) ? content.photos.length : 0,
  };

  // Create deterministic string representation
  const contentString = JSON.stringify(normalizedContent, Object.keys(normalizedContent).sort());

  // Generate SHA256 hash
  return crypto.createHash("sha256").update(contentString).digest("hex");
}

/**
 * Normalize string for comparison (lowercase, trim, remove extra whitespace)
 */
function normalizeString(str: string | null | undefined): string | null {
  if (!str || typeof str !== "string") return null;
  return str.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Check if two content hashes indicate duplicate content
 */
export function isDuplicateContent(hash1: string | null, hash2: string | null): boolean {
  if (!hash1 || !hash2) return false;
  return hash1 === hash2;
}
