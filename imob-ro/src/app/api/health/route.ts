import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLastCronExecution } from "@/lib/obs/cron-tracker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check endpoint
 * Returns system status, database connectivity, and last cron execution times
 *
 * GET /api/health
 * Response: {
 *   ok: boolean,
 *   timestamp: string,
 *   checks: {
 *     database: { ok: boolean, latency?: number, error?: string },
 *     crons: { name: string, lastRun?: string, status?: string }[]
 *   }
 * }
 */
export async function GET() {
  const startTime = Date.now();
  const checks: any = {};

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;

    checks.database = {
      ok: true,
      latency: dbLatency,
    };
  } catch (error) {
    checks.database = {
      ok: false,
      error: (error as Error).message,
    };
  }

  // Check last cron executions
  const cronNames = [
    "crawl-tick",
    "crawl-seed",
    "dedup-tick",
    "provenance-tick",
    "avm-train",
    "tiles/rebuild",
    "revalidate-zones",
    "taste/decay",
    "saved-search",
  ];

  checks.crons = await Promise.all(
    cronNames.map(async (name) => {
      try {
        const lastExecution = await getLastCronExecution(name);
        return {
          name,
          lastRun: lastExecution?.completedAt?.toISOString() || null,
          status: lastExecution?.status || "never_run",
          duration: lastExecution?.duration || null,
        };
      } catch (error) {
        return {
          name,
          error: (error as Error).message,
        };
      }
    }),
  );

  // Overall health status
  const isHealthy = checks.database.ok;

  const response = {
    ok: isHealthy,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
    responseTime: Date.now() - startTime,
  };

  return NextResponse.json(response, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
