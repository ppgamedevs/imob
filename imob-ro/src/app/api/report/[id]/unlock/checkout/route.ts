import { NextResponse } from "next/server";
import Stripe from "stripe";

import { auth } from "@/lib/auth";
import { buildReportUnlockStripeMetadata } from "@/lib/billing/report-unlock-stripe-metadata";
import {
  canViewFullReportFromRequest,
  createPendingReportUnlock,
  getReportUnlockAmountCents,
} from "@/lib/billing/report-unlock";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/obs/logger";
import { trackFunnelEvent } from "@/lib/tracking/funnel";

export const runtime = "nodejs";

function isGuestReportUnlockAllowed(): boolean {
  return process.env.NEXT_PUBLIC_REPORT_UNLOCK_GUEST_CHECKOUT !== "0";
}

/**
 * One-time payment to unlock a single report. Logged-in and (unless disabled) anonymous checkout.
 * POST /api/report/[id]/unlock/checkout
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: analysisId } = await params;
  const cookieHeader = req.headers.get("cookie");

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 501 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  if (!isGuestReportUnlockAllowed() && !userId) {
    return NextResponse.json(
      { error: "signin_required", signInPath: "/auth/signin" },
      { status: 401 },
    );
  }

  const limitsOff = process.env.BILLING_LIMITS_DISABLED === "true";
  if (
    !limitsOff &&
    (await canViewFullReportFromRequest(analysisId, userId, cookieHeader, null))
  ) {
    return NextResponse.json(
      { error: "already_unlocked", reportUrl: `/report/${analysisId}` },
      { status: 409 },
    );
  }

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, stripeCustomerId: true },
      })
    : null;

  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    select: { id: true, status: true },
  });
  if (!analysis || analysis.status !== "done") {
    return NextResponse.json({ error: "analysis_not_available" }, { status: 404 });
  }

  const pending = await createPendingReportUnlock({
    analysisId,
    userId,
    email: user?.email ?? null,
  });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const amountCents = getReportUnlockAmountCents();

  const metadata = buildReportUnlockStripeMetadata({
    reportUnlockId: pending.id,
    analysisId,
    userId,
  });
  const paymentMetadata: Record<string, string> = { ...metadata };

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      ...(user?.stripeCustomerId
        ? { customer: user.stripeCustomerId }
        : user?.email
          ? { customer_email: user.email }
          : {}),
      line_items: [
        {
          price_data: {
            currency: "ron",
            product_data: {
              name: "Raport complet ImobIntel",
              description:
                "Acces la detaliile acestui raport (estimare orientativă, comparabile, riscuri, negociere).",
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/api/report/${analysisId}/unlock/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/report/${analysisId}?checkout=cancelled`,
      metadata,
      payment_intent_data: { metadata: paymentMetadata },
    });

    if (checkoutSession.id) {
      await prisma.reportUnlock.update({
        where: { id: pending.id },
        data: { stripeSessionId: checkoutSession.id },
      });
    }

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "checkout_no_url" }, { status: 500 });
    }

    void trackFunnelEvent("checkout_started", {
      analysisId,
      userId,
      path: `/api/report/${analysisId}/unlock/checkout`,
      metadata: { reportUnlockId: pending.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    await prisma.reportUnlock.delete({ where: { id: pending.id } }).catch(() => {
      // row may be missing; ignore
    });
    logger.error({ error, analysisId }, "Report unlock checkout failed");
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }
}
