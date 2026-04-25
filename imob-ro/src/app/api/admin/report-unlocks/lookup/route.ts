import { NextResponse } from "next/server";

import { isAdminApiAccess } from "@/lib/auth-guards";
import { lookupReportUnlocksForAdmin } from "@/lib/admin/report-unlock-reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/report-unlocks/lookup?q= — find ReportUnlock by session id, pi id, CUID, analysis id, or email
 */
export async function GET(req: Request) {
  if (!(await isAdminApiAccess())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const { matches } = await lookupReportUnlocksForAdmin(q);
  return NextResponse.json({
    matches: matches.map((m) => ({
      id: m.id,
      analysisId: m.analysisId,
      userId: m.userId,
      email: m.email,
      status: m.status,
      amountCents: m.amountCents,
      currency: m.currency,
      stripeSessionId: m.stripeSessionId,
      stripePaymentIntentId: m.stripePaymentIntentId,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
  });
}
