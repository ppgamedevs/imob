/**
 * Day 25 - Crawl Refresh
 * Revisits recent analyses to check for price/content updates
 */

import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  // Re-visit analyses from last 21 days to check for updates
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
          priority: 2, // Medium priority
          analysisId: a.id,
        },
      });
      enqueued++;
    } catch {
      // Ignore duplicates or invalid URLs
    }
  }

  return new Response(JSON.stringify({ ok: true, checked: recent.length, enqueued }), {
    headers: { "Content-Type": "application/json" },
  });
}
