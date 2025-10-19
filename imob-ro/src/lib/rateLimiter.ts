// Simple in-memory rate limiter (token bucket) for quick anti-abuse protection.
// Not suitable for multi-instance production; consider Redis-backed limiter for scale.

type Bucket = { tokens: number; lastRefill: number };

const buckets: Record<string, Bucket> = {};

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10); // refill window
const MAX_TOKENS = parseInt(process.env.RATE_LIMIT_MAX || "30", 10); // tokens per window

export function allowRequest(key: string): boolean {
  const now = Date.now();
  const b = buckets[key] || { tokens: MAX_TOKENS, lastRefill: now };
  // refill proportionally
  const elapsed = now - b.lastRefill;
  if (elapsed > 0) {
    const refill = (elapsed / WINDOW_MS) * MAX_TOKENS;
    b.tokens = Math.min(MAX_TOKENS, b.tokens + refill);
    b.lastRefill = now;
  }
  if (b.tokens >= 1) {
    b.tokens -= 1;
    buckets[key] = b;
    return true;
  }
  buckets[key] = b;
  return false;
}

export function getBucketInfo(key: string) {
  const b = buckets[key] || { tokens: MAX_TOKENS, lastRefill: Date.now() };
  return { tokens: b.tokens, lastRefill: b.lastRefill, max: MAX_TOKENS, windowMs: WINDOW_MS };
}
