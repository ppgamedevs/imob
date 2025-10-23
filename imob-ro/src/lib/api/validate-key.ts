/**
 * API Key Validation Middleware
 * Validates x-api-key header, checks rate limits, tracks usage
 */

import { prisma } from "@/lib/db";

export interface ValidatedApiKey {
  id: string;
  key: string;
  userId: string | null;
  name: string | null;
  domain: string | null;
  rateLimit: number;
}

/**
 * Validate API key from request headers
 * Returns null if invalid/expired/rate-limited
 */
export async function validateApiKey(
  req: Request
): Promise<ValidatedApiKey | null> {
  const key = req.headers.get("x-api-key");
  if (!key) return null;

  // Find API key
  const apiKey = await prisma.apiKey.findUnique({
    where: { key, isActive: true },
  });

  if (!apiKey) return null;

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Check rate limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const usageCount = await prisma.apiUsage.count({
    where: {
      apiKeyId: apiKey.id,
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  if (usageCount >= apiKey.rateLimit) return null;

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    id: apiKey.id,
    key: apiKey.key,
    userId: apiKey.userId,
    name: apiKey.name,
    domain: apiKey.domain,
    rateLimit: apiKey.rateLimit,
  };
}

/**
 * Track API usage
 */
export async function trackApiUsage(params: {
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseMs?: number;
  req: Request;
}) {
  const { apiKeyId, endpoint, method, statusCode, responseMs, req } = params;

  // Extract IP and user agent
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");
  const referer = req.headers.get("referer");

  await prisma.apiUsage.create({
    data: {
      apiKeyId,
      endpoint,
      method,
      statusCode,
      responseMs: responseMs ?? null,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      referer: referer ?? null,
    },
  });
}

/**
 * Generate a new API key (64-char hex string)
 */
export function generateApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}
