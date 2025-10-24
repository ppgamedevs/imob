/**
 * HTTP Rate Limiting - Prevent abuse with sliding window
 *
 * In-memory implementation with LRU eviction
 * For production, use Redis or Upstash
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
  requests: number[];
}

const limiter = new Map<string, RateLimitEntry>();
const MAX_ENTRIES = 10000; // LRU size

/**
 * Rate limit a key
 * @param key - Unique identifier (e.g., "lead:analysisId" or "ip:127.0.0.1")
 * @param maxRequests - Max requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @throws Error if rate limit exceeded
 */
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<void> {
  const now = Date.now();
  const entry = limiter.get(key);

  if (!entry) {
    // First request
    limiter.set(key, {
      count: 1,
      resetAt: now + windowMs,
      requests: [now],
    });
    evictOldEntries();
    return;
  }

  // Remove requests outside window
  entry.requests = entry.requests.filter((time) => time > now - windowMs);
  entry.count = entry.requests.length;

  if (entry.count >= maxRequests) {
    const resetIn = Math.ceil((entry.resetAt - now) / 1000);
    throw new Error(
      `Rate limit exceeded. Try again in ${resetIn} seconds.`,
    );
  }

  // Add new request
  entry.requests.push(now);
  entry.count++;
  entry.resetAt = now + windowMs;
  limiter.set(key, entry);
}

/**
 * Check if key is rate limited without incrementing
 */
export function isRateLimited(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const entry = limiter.get(key);
  if (!entry) return false;

  const now = Date.now();
  const validRequests = entry.requests.filter(
    (time) => time > now - windowMs,
  );
  return validRequests.length >= maxRequests;
}

/**
 * Get remaining requests for key
 */
export function getRemainingRequests(
  key: string,
  maxRequests: number,
  windowMs: number,
): { remaining: number; resetAt: number } {
  const entry = limiter.get(key);
  if (!entry) {
    return { remaining: maxRequests, resetAt: Date.now() + windowMs };
  }

  const now = Date.now();
  const validRequests = entry.requests.filter(
    (time) => time > now - windowMs,
  );
  const remaining = Math.max(0, maxRequests - validRequests.length);

  return { remaining, resetAt: entry.resetAt };
}

/**
 * Reset rate limit for key
 */
export function resetRateLimit(key: string): void {
  limiter.delete(key);
}

/**
 * Clear all rate limits (for testing)
 */
export function clearAllRateLimits(): void {
  limiter.clear();
}

/**
 * Evict old entries (LRU)
 */
function evictOldEntries(): void {
  if (limiter.size <= MAX_ENTRIES) return;

  // Remove oldest 10% of entries
  const toRemove = Math.floor(MAX_ENTRIES * 0.1);
  const entries = Array.from(limiter.entries()).sort(
    (a, b) => a[1].resetAt - b[1].resetAt,
  );

  for (let i = 0; i < toRemove; i++) {
    limiter.delete(entries[i][0]);
  }
}

/**
 * Get rate limiter stats (for monitoring)
 */
export function getRateLimiterStats(): {
  size: number;
  oldestResetAt: number;
} {
  if (limiter.size === 0) {
    return { size: 0, oldestResetAt: 0 };
  }

  const entries = Array.from(limiter.values());
  const oldestResetAt = Math.min(...entries.map((e) => e.resetAt));

  return { size: limiter.size, oldestResetAt };
}

/**
 * Composite rate limiter for multiple keys
 * Useful for checking both IP and listing limits
 */
export async function rateLimitComposite(
  keys: Array<{ key: string; max: number; windowMs: number }>,
): Promise<void> {
  for (const { key, max, windowMs } of keys) {
    await rateLimit(key, max, windowMs);
  }
}
