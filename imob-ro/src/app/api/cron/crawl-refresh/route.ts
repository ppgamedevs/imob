/**
 * Day 25 - Crawl Refresh
 * Revisits recent analyses to check for price/content updates
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { withCronTracking } from "@/lib/obs/cron-tracker";

export const runtime = "nodejs";
export const maxDuration = 30;

export const GET = withCronTracking("crawl-refresh", async () => {
  const cutoff = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);

  const recent = await prisma.analysis.findMany({
    where: {
      createdAt: { gte: cutoff },
      sourceUrl: { not: "" },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  let enqueued = 0;
  for (const a of recent) {
    if (!a.sourceUrl || a.sourceUrl === "") continue;

    try {
      const u = new URL(a.sourceUrl);
      const normalized = u.toString();

      await prisma.crawlJob.create({
        data: {
          url: normalized,
          normalized,
          domain: u.hostname.replace(/^www\./, ""),
          kind: "detail",
          status: "queued",
          priority: 2,
          analysisId: a.id,
        },
      });
      enqueued++;
    } catch {
      // duplicate or invalid URL
    }
  }

  if (enqueued > 0) {
    triggerCrawlTick().catch(() => {});
  }

  return NextResponse.json({ ok: true, checked: recent.length, enqueued });
});

async function triggerCrawlTick() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL;
  if (!baseUrl) return;
  const secret = process.env.CRON_SECRET;
  const headers: Record<string, string> = {};
  if (secret) headers["authorization"] = `Bearer ${secret}`;

  try {
    await fetch(`${baseUrl}/api/cron/crawl-tick`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // best-effort trigger
  }
}
