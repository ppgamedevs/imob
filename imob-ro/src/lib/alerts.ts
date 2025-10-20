/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/db";
import type { AlertType, AlertParams } from "@/types/alerts";

export async function createAlertRule(args: {
  userId: string;
  type: AlertType;
  analysisId?: string | null;
  areaSlug?: string | null;
  params?: AlertParams;
}) {
  // use any on prisma here until you run prisma generate/migrate
  return (prisma as any).alertRule.create({
    data: {
      userId: args.userId,
      type: args.type,
      analysisId: args.analysisId ?? null,
      areaSlug: args.areaSlug ?? null,
      params: (args.params ?? {}) as any,
    },
  });
}

export function listAlertRules(userId: string) {
  return (prisma as any).alertRule.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

export function disableAlertRule(id: string) {
  return (prisma as any).alertRule.update({ where: { id }, data: { isActive: false } });
}
