import { prisma } from "@/lib/db";
import type { PlanFeatures } from "@/lib/types/pipeline";

import { monthStartUTC } from "./period";

type CountableKind = "analyze" | "pdf" | "share" | "alerts";

/** Set BILLING_LIMITS_DISABLED=true in .env to bypass all limits during testing */
const LIMITS_DISABLED = () => process.env.BILLING_LIMITS_DISABLED === "true";

const FREE_DEFAULTS: PlanFeatures = {
  analyze: 10,
  pdf: 1,
  share: 0,
  alerts: 0,
  advancedComps: false,
  detailedScore: false,
  history: false,
  historyDays: 0,
  csvExport: false,
  support: "community",
};

export async function getSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return { planCode: "free", status: "active" } as const;
  return sub;
}

export async function getPlanFeatures(planCode: string): Promise<PlanFeatures> {
  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  if (!plan) return FREE_DEFAULTS;
  return { ...FREE_DEFAULTS, ...(plan.features as PlanFeatures) };
}

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
    alerts: m.alerts ?? 0,
  };
}

/**
 * Check if user can perform a countable action (analyze, pdf, share, alerts).
 * A limit of -1 means unlimited.
 * When BILLING_LIMITS_DISABLED=true, always returns allowed.
 */
export async function canUse(userId: string, kind: CountableKind) {
  if (LIMITS_DISABLED()) return { allowed: true, used: 0, max: -1, unlimited: true, plan: "enterprise" };
  const sub = await getSubscription(userId);
  const features = await getPlanFeatures(sub.planCode);
  const usage = await getUsage(userId);
  const used = usage[kind];
  const max = Number(features[kind] ?? 0);
  const unlimited = max === -1;
  return { allowed: unlimited || used < max, used, max, unlimited, plan: sub.planCode };
}

/**
 * Check if user has access to a boolean feature (advancedComps, detailedScore, etc.)
 * When BILLING_LIMITS_DISABLED=true, always returns allowed.
 */
export async function canAccess(
  userId: string,
  feature: "advancedComps" | "detailedScore" | "history" | "csvExport",
) {
  if (LIMITS_DISABLED()) return { allowed: true, plan: "enterprise" };
  const sub = await getSubscription(userId);
  const features = await getPlanFeatures(sub.planCode);
  return { allowed: !!features[feature], plan: sub.planCode };
}

/** Alias for getPlanFeatures (used by account page) */
export const getPlanLimits = getPlanFeatures;

export async function incUsage(userId: string, kind: CountableKind, delta = 1) {
  const periodStart = monthStartUTC();
  await prisma.usageCounter.upsert({
    where: {
      userId_periodStart_kind: { userId, periodStart, kind },
    },
    update: { count: { increment: delta } },
    create: { userId, periodStart, kind, count: delta },
  });
}
