/**
 * Step 7: Client-side LRU cache for search suggestions
 * Reduces API calls for repeated queries
 */

import type { SuggestResponse } from "./types";

export class SearchCache {
  private cache: Map<string, { data: SuggestResponse; timestamp: number }>;
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = 30, ttlMs = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * Normalize query for cache key
   */
  private normalizeQuery(q: string): string {
    return q.toLowerCase().trim();
  }

  /**
   * Get cached result if exists and not expired
   */
  get(q: string): SuggestResponse | null {
    const key = this.normalizeQuery(q);
    const entry = this.cache.get(key);

    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      // Expired, remove from cache
      this.cache.delete(key);
      return null;
    }

    // Move to end (LRU access pattern)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  /**
   * Set cache entry
   */
  set(q: string, data: SuggestResponse): void {
    const key = this.normalizeQuery(q);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
let cacheInstance: SearchCache | null = null;

/**
 * Get or create cache instance
 */
export function getSearchCache(): SearchCache {
  if (!cacheInstance) {
    cacheInstance = new SearchCache();
  }
  return cacheInstance;
}

/**
 * Fetch suggestions with client-side caching
 */
export async function getSuggestCached(q: string, limit = 24): Promise<SuggestResponse> {
  const cache = getSearchCache();

  // Try cache first
  const cached = cache.get(q);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const params = new URLSearchParams({ q, limit: String(limit) });
  const response = await fetch(`/api/search/suggest?${params}`);

  if (!response.ok) {
    throw new Error(`Search API error: ${response.status}`);
  }

  const data: SuggestResponse = await response.json();

  // Store in cache
  cache.set(q, data);

  return data;
}
