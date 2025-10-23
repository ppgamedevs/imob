/**
 * Enhanced rate limiting with per-endpoint controls and proper 429 responses
 */

import { NextResponse } from "next/server";

type Bucket = { tokens: number; lastRefill: number };

const buckets: Record<string, Bucket> = {};

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// Rate limit configurations per endpoint type
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  analyze: {
    windowMs: 60_000, // 1 minute
    maxRequests: 30, // 30 requests per minute per IP
  },
  "public-api": {
    windowMs: 60_000, // 1 minute
    maxRequests: 60, // 60 requests per minute (will be overridden by API key rate limit)
  },
  "crawler-domain": {
    windowMs: 1_000, // 1 second
    maxRequests: 1, // 1 request per second per domain
  },
  default: {
    windowMs: 60_000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },
};

/**
 * Check if request should be allowed based on rate limit
 */
export function allowRequest(
  key: string,
  limitType: keyof typeof RATE_LIMITS = "default",
): boolean {
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.default;
  const now = Date.now();
  const b = buckets[key] || { tokens: config.maxRequests, lastRefill: now };

  // Refill tokens proportionally based on time elapsed
  const elapsed = now - b.lastRefill;
  if (elapsed > 0) {
    const refill = (elapsed / config.windowMs) * config.maxRequests;
    b.tokens = Math.min(config.maxRequests, b.tokens + refill);
    b.lastRefill = now;
  }

  // Check if we have tokens available
  if (b.tokens >= 1) {
    b.tokens -= 1;
    buckets[key] = b;
    return true;
  }

  buckets[key] = b;
  return false;
}

/**
 * Get bucket info for debugging
 */
export function getBucketInfo(key: string, limitType: keyof typeof RATE_LIMITS = "default") {
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.default;
  const b = buckets[key] || { tokens: config.maxRequests, lastRefill: Date.now() };
  return {
    tokens: Math.floor(b.tokens),
    lastRefill: b.lastRefill,
    max: config.maxRequests,
    windowMs: config.windowMs,
  };
}

/**
 * Calculate Retry-After header value in seconds
 */
export function getRetryAfter(
  key: string,
  limitType: keyof typeof RATE_LIMITS = "default",
): number {
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.default;
  const b = buckets[key];

  if (!b) {
    return Math.ceil(config.windowMs / 1000);
  }

  // Calculate when bucket will have at least 1 token
  const tokensNeeded = 1 - b.tokens;
  if (tokensNeeded <= 0) return 0;

  const timeNeeded = (tokensNeeded / config.maxRequests) * config.windowMs;
  return Math.ceil(timeNeeded / 1000);
}

/**
 * Create rate limit exceeded response (429)
 */
export function createRateLimitResponse(
  key: string,
  limitType: keyof typeof RATE_LIMITS = "default",
): NextResponse {
  const retryAfter = getRetryAfter(key, limitType);
  const bucketInfo = getBucketInfo(key, limitType);

  return NextResponse.json(
    {
      error: "rate_limit_exceeded",
      message: "Too many requests. Please try again later.",
      retryAfter,
      limit: bucketInfo.max,
      windowMs: bucketInfo.windowMs,
    },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfter.toString(),
        "X-RateLimit-Limit": bucketInfo.max.toString(),
        "X-RateLimit-Remaining": Math.max(0, Math.floor(bucketInfo.tokens)).toString(),
        "X-RateLimit-Reset": new Date(bucketInfo.lastRefill + bucketInfo.windowMs).toISOString(),
      },
    },
  );
}

/**
 * Extract IP from request headers
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Rate limit middleware for crawler (domain-based)
 */
export class CrawlerRateLimiter {
  private static domainBuckets: Record<string, Bucket> = {};
  private static readonly MAX_CONCURRENCY = 2;
  private static activeCrawls: Record<string, number> = {};

  static canCrawl(domain: string): boolean {
    // Check concurrency limit
    const active = this.activeCrawls[domain] || 0;
    if (active >= this.MAX_CONCURRENCY) {
      return false;
    }

    // Check rate limit (1 req/sec per domain)
    return allowRequest(`crawler:${domain}`, "crawler-domain");
  }

  static startCrawl(domain: string): void {
    this.activeCrawls[domain] = (this.activeCrawls[domain] || 0) + 1;
  }

  static endCrawl(domain: string): void {
    this.activeCrawls[domain] = Math.max(0, (this.activeCrawls[domain] || 0) - 1);
    if (this.activeCrawls[domain] === 0) {
      delete this.activeCrawls[domain];
    }
  }

  static getConcurrency(domain: string): number {
    return this.activeCrawls[domain] || 0;
  }
}
