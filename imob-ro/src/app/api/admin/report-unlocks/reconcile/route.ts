import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { reconcileReportUnlockMarkPaidIfStripePaid } from "@/lib/admin/report-unlock-reconcile";
import { logger } from "@/lib/obs/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  reportUnlockId: z.string().min(1),
});

async function requireAdminApi(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === "admin";
}

/**
 * POST /api/admin/report-unlocks/reconcile — verify Stripe and mark `ReportUnlock` paid if payment succeeded
 * (used when webhooks/redirect did not update the row).
 */
export async function POST(req: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 501 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  try {
    const r = await reconcileReportUnlockMarkPaidIfStripePaid(stripe, parsed.data.reportUnlockId);
    if (r.ok) {
      return NextResponse.json({
        ok: true,
        applied: r.result.applied,
        reason: r.result.reason,
        stripePaymentStatus: r.stripePaymentStatus,
      });
    }
    return NextResponse.json({ ok: false, error: r.error }, { status: r.error === "stripe_unpaid" ? 409 : 400 });
  } catch (e) {
    logger.error({ e, reportUnlockId: parsed.data.reportUnlockId }, "admin report unlock reconcile failed");
    return NextResponse.json({ ok: false, error: "stripe_or_db_error" }, { status: 500 });
  }
}
