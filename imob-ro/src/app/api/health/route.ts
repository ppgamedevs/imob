import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getLastCronExecution } from "@/lib/obs/cron-tracker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CheckResult {
  ok: boolean;
  latency?: number;
  error?: string;
}

interface CronCheck {
  name: string;
  lastRun?: string | null;
  status?: string;
  duration?: number | null;
  error?: string;
}

interface HealthResponse {
  ok: boolean;
  timestamp: string;
  uptime: number;
  checks: {
    database: CheckResult;
    stripe: CheckResult;
    resend: CheckResult;
    baseUrl: CheckResult;
    crons: CronCheck[];
  };
  responseTime: number;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latency: Date.now() - start };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

async function checkStripe(): Promise<CheckResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, error: "STRIPE_SECRET_KEY not set" };
  const start = Date.now();
  try {
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${key}` },
    });
    return { ok: res.ok, latency: Date.now() - start, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

async function checkResend(): Promise<CheckResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY not set" };
  const start = Date.now();
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    return { ok: res.ok, latency: Date.now() - start, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

function checkBaseUrl(): CheckResult {
  const url = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) return { ok: false, error: "NEXT_PUBLIC_BASE_URL not set" };
  try {
    new URL(url);
    return { ok: true };
  } catch {
    return { ok: false, error: `Invalid URL: ${url}` };
  }
}

const MVP_CRONS = ["crawl-tick", "dedup-tick", "area-aggregator"];

/**
 * Deep health check - verifies DB, Stripe, Resend, env config, and cron status.
 * GET /api/health
 */
export async function GET() {
  const startTime = Date.now();

  const [database, stripe, resend, crons] = await Promise.all([
    checkDatabase(),
    checkStripe(),
    checkResend(),
    Promise.all(
      MVP_CRONS.map(async (name): Promise<CronCheck> => {
        try {
          const last = await getLastCronExecution(name);
          return {
            name,
            lastRun: last?.completedAt?.toISOString() ?? null,
            status: last?.status ?? "never_run",
            duration: last?.duration ?? null,
          };
        } catch (error) {
          return { name, error: (error as Error).message };
        }
      }),
    ),
  ]);

  const baseUrl = checkBaseUrl();
  const isHealthy = database.ok;

  const response: HealthResponse = {
    ok: isHealthy,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: { database, stripe, resend, baseUrl, crons },
    responseTime: Date.now() - startTime,
  };

  return NextResponse.json(response, {
    status: isHealthy ? 200 : 503,
    headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
  });
}
