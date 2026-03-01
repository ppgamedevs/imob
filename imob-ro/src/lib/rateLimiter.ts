import { RATE_BUCKET_MAX, RATE_MAX_REQUESTS, RATE_WINDOW_MS } from "@/lib/constants";

type Bucket = { tokens: number; lastRefill: number };

const buckets = new Map<string, Bucket>();

function evictStale(): void {
  if (buckets.size <= RATE_BUCKET_MAX) return;
  const now = Date.now();
  const staleThreshold = now - RATE_WINDOW_MS * 5;
  for (const [key, b] of buckets) {
    if (b.lastRefill < staleThreshold) buckets.delete(key);
    if (buckets.size <= RATE_BUCKET_MAX * 0.8) break;
  }
}

export function allowRequest(key: string): boolean {
  evictStale();
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: RATE_MAX_REQUESTS, lastRefill: now };

  const elapsed = now - b.lastRefill;
  if (elapsed > 0) {
    const refill = (elapsed / RATE_WINDOW_MS) * RATE_MAX_REQUESTS;
    b.tokens = Math.min(RATE_MAX_REQUESTS, b.tokens + refill);
    b.lastRefill = now;
  }

  if (b.tokens >= 1) {
    b.tokens -= 1;
    buckets.set(key, b);
    return true;
  }
  buckets.set(key, b);
  return false;
}

export function getBucketInfo(key: string) {
  const b = buckets.get(key) ?? { tokens: RATE_MAX_REQUESTS, lastRefill: Date.now() };
  return { tokens: b.tokens, lastRefill: b.lastRefill, max: RATE_MAX_REQUESTS, windowMs: RATE_WINDOW_MS };
}
