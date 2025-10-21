"use server";

import { createAlertRule } from "@/lib/alerts";
import { auth } from "@/lib/auth";
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
 * Creates a short share link for an analysis report.
 * Returns existing link if already created, otherwise generates new slug.
 */
export async function createShareLink(analysisId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  // Check if short link already exists for this analysis
  const existing = await prisma.shortLink.findFirst({
    where: { analysisId },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return { slug: existing.slug };
  }

  // Generate new short slug (6 chars, alphanumeric)
  const slug = Math.random().toString(36).slice(2, 8);

  // Create short link record
  await prisma.shortLink.create({
    data: {
      slug,
      analysisId,
      userId: session.user.id,
      targetUrl: null, // construct dynamically from slug
      meta: { kind: "report", createdBy: session.user.email || "" },
    },
  });

  return { slug };
}
