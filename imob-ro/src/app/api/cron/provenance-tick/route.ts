import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { rebuildProvenance } from "@/lib/provenance/build-events";
import { computeTrustScore } from "@/lib/provenance/trust";

/**
 * Cron endpoint for backfilling provenance data.
 * Processes analyses that don't have a TrustSnapshot yet.
 *
 * Usage: Schedule as Vercel Cron (every 10 minutes)
 */
export async function GET() {
  try {
    // Find analyses without trust snapshot
    const candidates = await prisma.analysis.findMany({
      where: {
        status: "done",
        trustSnapshot: null,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    let processed = 0;

    for (const a of candidates) {
      try {
        await rebuildProvenance(a.id);
        await computeTrustScore(a.id);
        processed++;
      } catch (err) {
        console.error(`provenance-tick failed for ${a.id}:`, err);
      }
    }

    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    console.error("provenance-tick error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
