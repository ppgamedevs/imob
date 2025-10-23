import { prisma } from "@/lib/db";
import { logger, logCron } from "./logger";
import { captureException } from "./sentry";

/**
 * Track cron job execution in database and logs
 */
export class CronTracker {
  private cronLogId: string | null = null;
  private startTime: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = Date.now();
  }

  /**
   * Mark cron job as started
   */
  async start(metadata?: Record<string, any>) {
    try {
      const log = await prisma.cronLog.create({
        data: {
          name: this.name,
          status: "started",
          metadata: metadata ?? undefined,
          startedAt: new Date(),
        },
      });

      this.cronLogId = log.id;
      logCron(this.name, "started");
      logger.info({ cronLogId: this.cronLogId, metadata }, `Cron ${this.name} started`);
    } catch (error) {
      logger.error({ error }, `Failed to create CronLog for ${this.name}`);
    }
  }

  /**
   * Mark cron job as completed
   */
  async complete(metadata?: Record<string, any>) {
    const duration = Date.now() - this.startTime;

    try {
      if (this.cronLogId) {
        await prisma.cronLog.update({
          where: { id: this.cronLogId },
          data: {
            status: "completed",
            duration,
            completedAt: new Date(),
            metadata: metadata ?? undefined,
          },
        });
      }

      logCron(this.name, "completed", duration);
      logger.info(
        { cronLogId: this.cronLogId, duration, metadata },
        `Cron ${this.name} completed in ${duration}ms`,
      );
    } catch (error) {
      logger.error({ error }, `Failed to update CronLog for ${this.name}`);
    }
  }

  /**
   * Mark cron job as failed
   */
  async fail(error: Error, metadata?: Record<string, any>) {
    const duration = Date.now() - this.startTime;

    try {
      if (this.cronLogId) {
        await prisma.cronLog.update({
          where: { id: this.cronLogId },
          data: {
            status: "failed",
            duration,
            error: error.message + "\n" + error.stack,
            completedAt: new Date(),
            metadata: metadata ?? undefined,
          },
        });
      }

      logCron(this.name, "failed", duration, error);
      captureException(error, {
        cron: this.name,
        cronLogId: this.cronLogId,
        duration,
        metadata,
      });

      logger.error(
        { cronLogId: this.cronLogId, duration, error, metadata },
        `Cron ${this.name} failed after ${duration}ms: ${error.message}`,
      );
    } catch (updateError) {
      logger.error({ error: updateError }, `Failed to update CronLog for ${this.name}`);
    }
  }
}

/**
 * Wrapper for cron job handlers with automatic tracking
 */
export function withCronTracking<T extends (...args: any[]) => Promise<any>>(
  name: string,
  handler: T,
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const tracker = new CronTracker(name);

    try {
      await tracker.start();
      const result = await handler(...args);
      await tracker.complete(typeof result === "object" && result !== null ? result : undefined);
      return result;
    } catch (error) {
      await tracker.fail(error as Error);
      throw error;
    }
  }) as T;
}

/**
 * Get recent cron logs for monitoring
 */
export async function getRecentCronLogs(limit: number = 50) {
  return prisma.cronLog.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

/**
 * Get last execution time for a specific cron
 */
export async function getLastCronExecution(name: string) {
  return prisma.cronLog.findFirst({
    where: { name, status: "completed" },
    orderBy: { completedAt: "desc" },
  });
}

/**
 * Get cron execution statistics
 */
export async function getCronStats(name?: string, hours: number = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const where = {
    startedAt: { gte: since },
    ...(name && { name }),
  };

  const [total, completed, failed, avgDuration] = await Promise.all([
    prisma.cronLog.count({ where }),
    prisma.cronLog.count({ where: { ...where, status: "completed" } }),
    prisma.cronLog.count({ where: { ...where, status: "failed" } }),
    prisma.cronLog.aggregate({
      where: { ...where, status: "completed", duration: { not: null } },
      _avg: { duration: true },
    }),
  ]);

  return {
    total,
    completed,
    failed,
    running: total - completed - failed,
    successRate: total > 0 ? (completed / total) * 100 : 0,
    avgDuration: avgDuration._avg.duration || 0,
    since,
  };
}

/**
 * Clean up old cron logs (keep last 7 days)
 */
export async function cleanupOldCronLogs(daysToKeep: number = 7) {
  const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

  const deleted = await prisma.cronLog.deleteMany({
    where: {
      startedAt: { lt: cutoff },
    },
  });

  logger.info({ deletedCount: deleted.count, cutoff }, `Cleaned up old cron logs`);
  return deleted.count;
}
