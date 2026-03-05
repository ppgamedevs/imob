/**
 * GET /api/cron/geo-signals
 *
 * Daily cron job that aggregates demand/supply signals
 * from internal data (Analysis, UserEstimate, ExtractedListing)
 * into the GeoDemandSignal table.
 *
 * Auth handled by middleware (CRON_SECRET).
 */
import { NextResponse } from "next/server";
import { withCronTracking } from "@/lib/obs/cron-tracker";
import { aggregateDailySignals } from "@/lib/geo/signals/aggregateDaily";

export const runtime = "nodejs";
export const maxDuration = 120;

export const GET = withCronTracking("geo-signals", async () => {
  // Aggregate yesterday by default
  const result = await aggregateDailySignals();

  return NextResponse.json({
    ok: true,
    ...result,
  });
});
