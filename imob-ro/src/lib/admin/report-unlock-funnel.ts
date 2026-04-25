import { prisma } from "@/lib/db";

import { last7dStart } from "@/lib/admin/money-dashboard";

const MS_30M = 30 * 60 * 1000;

export type ReportUnlockAdminData = {
  nowIso: string;
  pendingCount: number;
  pendingStale30mCount: number;
  /** Unlock rows created in last 7d (checkout attempts) */
  unlockRows7d: number;
  paidUnlocks7d: number;
  /** paid / (rows in 7d) */
  checkoutToPaid7d: string;
  paidUnlocksAll: number;
  refundedUnlocks7d: number;
  refundedUnlocksAll: number;
  remindersSentCount: number;
  stale30Sample: Awaited<ReturnType<typeof staleSample>>;
  recentPending: Awaited<ReturnType<typeof recentPendingList>>;
  recentPaid: Awaited<ReturnType<typeof recentPaidList>>;
  recentRefunded: Awaited<ReturnType<typeof recentRefundedList>>;
};

async function staleSample(since: Date) {
  return prisma.reportUnlock.findMany({
    where: {
      status: "pending",
      createdAt: { lt: since },
    },
    orderBy: { createdAt: "asc" },
    take: 30,
    select: {
      id: true,
      analysisId: true,
      createdAt: true,
      email: true,
      stripeSessionId: true,
      userId: true,
      analysis: { select: { extractedListing: { select: { title: true } } } },
    },
  });
}

async function recentPendingList() {
  return prisma.reportUnlock.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      analysisId: true,
      createdAt: true,
      email: true,
      stripeSessionId: true,
      userId: true,
      analysis: { select: { extractedListing: { select: { title: true } } } },
    },
  });
}

async function recentPaidList() {
  return prisma.reportUnlock.findMany({
    where: { status: "paid" },
    orderBy: { updatedAt: "desc" },
    take: 25,
    select: {
      id: true,
      analysisId: true,
      createdAt: true,
      updatedAt: true,
      email: true,
      amountCents: true,
      userId: true,
      analysis: { select: { extractedListing: { select: { title: true } } } },
    },
  });
}

async function recentRefundedList() {
  return prisma.reportUnlock.findMany({
    where: { status: "refunded" },
    orderBy: { updatedAt: "desc" },
    take: 25,
    select: {
      id: true,
      analysisId: true,
      createdAt: true,
      updatedAt: true,
      email: true,
      amountCents: true,
      userId: true,
      stripeSessionId: true,
      stripePaymentIntentId: true,
      analysis: { select: { extractedListing: { select: { title: true } } } },
    },
  });
}

export async function getReportUnlockFunnelAdmin(): Promise<ReportUnlockAdminData> {
  const now = new Date();
  const t7 = last7dStart();
  const staleBefore = new Date(now.getTime() - MS_30M);

  const [
    pendingCount,
    pendingStale30mCount,
    unlockRows7d,
    paidUnlocks7d,
    paidUnlocksAll,
    refundedUnlocks7d,
    refundedUnlocksAll,
    remindersSentCount,
    stale30SampleRows,
    recentPend,
    recentPaid,
    recentRefunded,
  ] = await Promise.all([
    prisma.reportUnlock.count({ where: { status: "pending" } }),
    prisma.reportUnlock.count({
      where: { status: "pending", createdAt: { lt: staleBefore } },
    }),
    prisma.reportUnlock.count({ where: { createdAt: { gte: t7 } } }),
    prisma.reportUnlock.count({ where: { status: "paid", createdAt: { gte: t7 } } }),
    prisma.reportUnlock.count({ where: { status: "paid" } }),
    prisma.reportUnlock.count({ where: { status: "refunded", updatedAt: { gte: t7 } } }),
    prisma.reportUnlock.count({ where: { status: "refunded" } }),
    prisma.reportUnlock.count({ where: { abandonmentReminderSentAt: { not: null } } }),
    staleSample(staleBefore),
    recentPendingList(),
    recentPaidList(),
    recentRefundedList(),
  ]);

  const checkoutToPaid7d =
    unlockRows7d > 0 ? `${((100 * paidUnlocks7d) / unlockRows7d).toFixed(1)}%` : "— (fără încercări în 7z)";

  return {
    nowIso: now.toISOString(),
    pendingCount,
    pendingStale30mCount,
    unlockRows7d,
    paidUnlocks7d,
    checkoutToPaid7d,
    paidUnlocksAll,
    refundedUnlocks7d,
    refundedUnlocksAll,
    remindersSentCount,
    stale30Sample: stale30SampleRows,
    recentPending: recentPend,
    recentPaid: recentPaid,
    recentRefunded: recentRefunded,
  };
}
