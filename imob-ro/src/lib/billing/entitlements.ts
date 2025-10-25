/**
 * Day 23 - Entitlements & Usage Tracking
 * Central logic for checking if user can perform actions (analyze, PDF, share)
 */

import { prisma } from "@/lib/db";

import { monthStartUTC } from "./period";

type Limits = { analyze: number; pdf: number; share: number };

/**
 * Get user's subscription or default to free
 */
export async function getSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return { planCode: "free", status: "active" } as const;
  return sub;
}

/**
 * Get limits for a given plan code from Plan.features JSON
 */
export async function getPlanLimits(planCode: string): Promise<Limits> {
  const plan = await prisma.plan.findUnique({ where: { code: planCode } });

  const f = (plan?.features as any) || {};
  return {
    analyze: Number(f.analyze ?? 20),
    pdf: Number(f.pdf ?? 3),
    share: Number(f.share ?? 3),
  };
}

/**
 * Get current month's usage for a user
 */
export async function getUsage(userId: string) {
  const periodStart = monthStartUTC();
  const rows = await prisma.usageCounter.findMany({ where: { userId, periodStart } });
  const m: Record<string, number> = {};
  for (const r of rows) m[r.kind] = r.count;
  return {
    periodStart,
    analyze: m.analyze ?? 0,
    pdf: m.pdf ?? 0,
    share: m.share ?? 0,
  };
}

/**
 * Check if user can perform an action
 * Returns: allowed (boolean), used (count), max (limit), plan (code)
 */
export async function canUse(userId: string, kind: "analyze" | "pdf" | "share") {
  const sub = await getSubscription(userId);
  const limits = await getPlanLimits(sub.planCode);
  const usage = await getUsage(userId);
  const used = usage[kind];
  const max = limits[kind];
  return { allowed: used < max, used, max, plan: sub.planCode };
}

/**
 * Increment usage counter for a user
 */
export async function incUsage(userId: string, kind: "analyze" | "pdf" | "share", delta = 1) {
  const periodStart = monthStartUTC();
  await prisma.usageCounter.upsert({
    where: {
      userId_periodStart_kind: { userId, periodStart, kind },
    },
    update: { count: { increment: delta } },
    create: { userId, periodStart, kind, count: delta },
  });
}
