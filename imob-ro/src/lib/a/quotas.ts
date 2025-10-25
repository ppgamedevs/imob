// Agent workspace quota enforcement

import { prisma } from "@/lib/db";

export type QuotaConfig = {
  dailyNew: number; // Max new analyses per day
  totalStored: number; // Max total analyses stored
};

const DEFAULT_QUOTAS: QuotaConfig = {
  dailyNew: 100,
  totalStored: 2000,
};

export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

export async function assertOrgQuota(
  agentEmail: string,
  config: Partial<QuotaConfig> = {},
): Promise<void> {
  const quotas = { ...DEFAULT_QUOTAS, ...config };

  // Check daily new analyses from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Count jobs created today by this agent
  const dailyCount = await prisma.bulkAnalysisJob.count({
    where: {
      agentEmail,
      createdAt: {
        gte: today,
      },
    },
  });

  const dailyTotal = await prisma.bulkAnalysisJob.aggregate({
    where: {
      agentEmail,
      createdAt: {
        gte: today,
      },
    },
    _sum: {
      total: true,
    },
  });

  const dailyAnalyses = dailyTotal._sum.total || 0;

  if (dailyAnalyses >= quotas.dailyNew) {
    throw new QuotaExceededError(
      `Daily analysis limit reached (${quotas.dailyNew}). Please try again tomorrow or contact support to increase your quota.`,
    );
  }

  // Check total stored analyses (all time)
  const totalCount = await prisma.bulkAnalysisJob.aggregate({
    where: {
      agentEmail,
    },
    _sum: {
      total: true,
    },
  });

  const totalAnalyses = totalCount._sum.total || 0;

  if (totalAnalyses >= quotas.totalStored) {
    throw new QuotaExceededError(
      `Storage limit reached (${quotas.totalStored} analyses). Please archive or delete old analyses, or contact support.`,
    );
  }
}

export async function getQuotaUsage(agentEmail: string): Promise<{
  dailyUsed: number;
  dailyLimit: number;
  totalUsed: number;
  totalLimit: number;
}> {
  const quotas = DEFAULT_QUOTAS;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyTotal = await prisma.bulkAnalysisJob.aggregate({
    where: {
      agentEmail,
      createdAt: {
        gte: today,
      },
    },
    _sum: {
      total: true,
    },
  });

  const totalCount = await prisma.bulkAnalysisJob.aggregate({
    where: {
      agentEmail,
    },
    _sum: {
      total: true,
    },
  });

  return {
    dailyUsed: dailyTotal._sum.total || 0,
    dailyLimit: quotas.dailyNew,
    totalUsed: totalCount._sum.total || 0,
    totalLimit: quotas.totalStored,
  };
}
