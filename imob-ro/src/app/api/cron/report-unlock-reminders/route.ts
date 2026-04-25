import { NextResponse } from "next/server";

import { processReportUnlockAbandonmentReminders } from "@/lib/billing/report-unlock-reminder";
import { withCronTracking } from "@/lib/obs/cron-tracker";

export const runtime = "nodejs";

/**
 * Call daily (Vercel cron or similar) with header `x-cron-secret` = CRON_SECRET.
 * Sends at most one 24h abandon email per ReportUnlock, only with e-mail + ReportLead.consent.
 */
export const GET = withCronTracking("report_unlock_reminders", async () => {
  const result = await processReportUnlockAbandonmentReminders();
  return NextResponse.json({ ok: true, ...result });
});
