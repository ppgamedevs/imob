/**
 * Day 29: Saved Search Cron Runner
 * Batch process saved searches and detect new results
 */

import { prisma } from "@/lib/db";
import { runSavedSearch } from "@/lib/saved-search/run";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Fetch searches that need running (ordered by oldest first)
    const rows = await prisma.savedSearch.findMany({
      orderBy: { updatedAt: "asc" },
      take: 50, // Process max 50 per cron run
    });

    const results = [];

    for (const r of rows) {
      try {
        const res = await runSavedSearch(r.userId, r.queryJson);

        // TODO v2: Compare with lastRun results → find new groupIds → create notifications
        // For now, just update lastRunAt
        await prisma.savedSearch.update({
          where: { id: r.id },
          data: { lastRunAt: new Date() },
        });

        results.push({
          id: r.id,
          success: true,
          results: res.items?.length ?? 0,
        });
      } catch (err) {
        results.push({
          id: r.id,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed: rows.length,
        results,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
