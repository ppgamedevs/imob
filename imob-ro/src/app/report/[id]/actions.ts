"use server";

import { createAlertRule } from "@/lib/alerts";
import { auth } from "@/lib/auth";
import { canUse, incUsage } from "@/lib/billing/entitlements";
import { prisma } from "@/lib/db";
// AlertType intentionally not needed here to avoid unused-import linting

export async function createPriceBelowAlert(analysisId: string, thresholdEur: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("auth");
  await createAlertRule({
    userId: session.user.id,
    type: "PRICE_BELOW",
    analysisId,
    params: { thresholdEur },
  });
  return { ok: true };
}

export async function createUnderpricedAlert(analysisId: string, underPct = 0.05) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("auth");
  await createAlertRule({
    userId: session.user.id,
    type: "UNDERPRICED",
    analysisId,
    params: { underpricedPct: underPct },
  });
  return { ok: true };
}

/**
 * Creates a short share link for an analysis report with privacy options.
 * Returns existing enabled link if found, otherwise generates new slug.
 */
export async function createShareLink(
  analysisId: string,
  options?: {
    scrub?: boolean;
    watermark?: boolean;
    hideSource?: boolean;
    hidePrice?: boolean;
    ttlDays?: number;
    brand?: string;
    color?: string;
  },
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  // Day 23 - Check share link limit
  const check = await canUse(session.user.id, "share");
  if (!check.allowed) {
    throw new Error(
      `${check.plan === "free" ? "Free plan" : "Pro plan"} limit reached: ${check.used}/${check.max} share links this month. Upgrade to Pro for more.`,
    );
  }

  // Check if enabled short link already exists for this analysis
  const existing = await prisma.shortLink.findFirst({
    where: { analysisId, enabled: true },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return { slug: existing.slug };
  }

  // Generate new short slug (6 chars, alphanumeric)
  const slug = Math.random().toString(36).slice(2, 8);

  // Calculate expiration
  const expiresAt = options?.ttlDays ? new Date(Date.now() + options.ttlDays * 86400 * 1000) : null;

  // Create short link record
  await prisma.shortLink.create({
    data: {
      slug,
      analysisId,
      userId: session.user.id,
      meta: { kind: "report", createdBy: session.user.email || "" },

      options: (options || {}) as any,
      enabled: true,
      expiresAt,
    },
  });

  // Day 23 - Increment share usage counter (only for new shares)
  await incUsage(session.user.id, "share", 1);

  return { slug };
}

/**
 * Revokes (disables) a share link.
 */
export async function revokeShareLink(slug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  await prisma.shortLink.update({
    where: { slug },
    data: { enabled: false },
  });

  return { ok: true };
}
