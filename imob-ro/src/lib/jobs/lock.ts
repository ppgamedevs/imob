/**
 * DB-backed advisory lock for import jobs.
 *
 * Uses CronLog to prevent double-runs: if a job with the same name
 * is already "started" (no completedAt) within the last N minutes,
 * the lock is considered held.
 */

import { prisma } from "@/lib/db";

const STALE_AFTER_MS = 30 * 60 * 1000; // 30 min - auto-expire stuck jobs

export interface LockResult {
  acquired: boolean;
  runId: string | null;
  reason?: string;
}

/**
 * Attempt to acquire an advisory lock for a named job.
 * Returns a runId that must be passed to `releaseLock` on completion.
 */
export async function acquireLock(jobName: string): Promise<LockResult> {
  const staleThreshold = new Date(Date.now() - STALE_AFTER_MS);

  const running = await prisma.cronLog.findFirst({
    where: {
      name: jobName,
      status: "started",
      startedAt: { gte: staleThreshold },
      completedAt: null,
    },
    orderBy: { startedAt: "desc" },
  });

  if (running) {
    return {
      acquired: false,
      runId: null,
      reason: `Job "${jobName}" already running since ${running.startedAt.toISOString()} (id: ${running.id})`,
    };
  }

  // Mark any truly stale "started" rows as failed
  await prisma.cronLog.updateMany({
    where: {
      name: jobName,
      status: "started",
      startedAt: { lt: staleThreshold },
      completedAt: null,
    },
    data: {
      status: "failed",
      error: "Auto-expired: exceeded 30 min without completion",
      completedAt: new Date(),
    },
  });

  const log = await prisma.cronLog.create({
    data: {
      name: jobName,
      status: "started",
      startedAt: new Date(),
    },
  });

  return { acquired: true, runId: log.id };
}

/**
 * Release the lock by marking the CronLog as completed or failed.
 */
export async function releaseLock(
  runId: string,
  outcome: "completed" | "failed",
  meta?: { error?: string; metadata?: Record<string, unknown> },
): Promise<void> {
  await prisma.cronLog.update({
    where: { id: runId },
    data: {
      status: outcome,
      completedAt: new Date(),
      duration: undefined, // will be set below
      error: meta?.error,
      metadata: meta?.metadata as never,
    },
  });
}

/**
 * Get last successful run time for a job.
 */
export async function getLastRun(jobName: string) {
  return prisma.cronLog.findFirst({
    where: { name: jobName, status: "completed" },
    orderBy: { completedAt: "desc" },
    select: { id: true, completedAt: true, duration: true, metadata: true },
  });
}
