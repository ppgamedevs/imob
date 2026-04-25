import { NextResponse } from "next/server";
import Stripe from "stripe";

import { isReportUnlockCheckoutSessionForAnalysis } from "@/lib/billing/report-unlock-stripe-metadata";
import { markReportUnlockPaidFromStripe, findReportUnlockById } from "@/lib/billing/report-unlock";
import { reportUnlockCookieName, signReportUnlockCookie } from "@/lib/billing/report-unlock-cookie";
import { logger } from "@/lib/obs/logger";

export const runtime = "nodejs";

/**
 * Stripe success redirect target: verifies session server-side, syncs payment if needed, sets guest cookie, redirects to report.
 * Does not trust ?unlocked=1 alone; DB + cookie are used on the report page.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: analysisId } = await params;
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!sessionId || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.redirect(`${baseUrl}/report/${analysisId}?checkout=error`, 302);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (!isReportUnlockCheckoutSessionForAnalysis(s.metadata, analysisId)) {
      return NextResponse.redirect(`${baseUrl}/report/${analysisId}?checkout=error`, 302);
    }

    const reportUnlockId = s.metadata?.reportUnlockId;
    if (!reportUnlockId) {
      return NextResponse.redirect(`${baseUrl}/report/${analysisId}?checkout=error`, 302);
    }

    const paid = s.payment_status === "paid";
    if (!paid) {
      return NextResponse.redirect(`${baseUrl}/report/${analysisId}?checkout=unpaid`, 302);
    }

    const pi = s.payment_intent;
    const piId = typeof pi === "string" ? pi : (pi as Stripe.PaymentIntent | null)?.id ?? null;

    const email = s.customer_details?.email ?? s.customer_email ?? null;

    const row = await findReportUnlockById(reportUnlockId);
    if (!row || row.analysisId !== analysisId) {
      return NextResponse.redirect(`${baseUrl}/report/${analysisId}?checkout=error`, 302);
    }

    if (row.status === "refunded") {
      return NextResponse.redirect(`${baseUrl}/report/${analysisId}?checkout=refunded`, 302);
    }

    if (row.status !== "paid") {
      const r = await markReportUnlockPaidFromStripe({
        reportUnlockId,
        stripeSessionId: s.id,
        stripePaymentIntentId: piId,
        amountCents: s.amount_total ?? undefined,
        email,
      });
      if (r.reason === "blocked_refunded") {
        return NextResponse.redirect(`${baseUrl}/report/${analysisId}?checkout=refunded`, 302);
      }
    }

    const token = signReportUnlockCookie(reportUnlockId, analysisId);
    const res = NextResponse.redirect(
      `${baseUrl}/report/${analysisId}?unlocked=1`,
      302,
    );
    res.cookies.set(reportUnlockCookieName(analysisId), token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 400,
    });
    return res;
  } catch (e) {
    logger.error({ e, analysisId }, "unlock complete redirect failed");
    return NextResponse.redirect(`${baseUrl}/report/${analysisId}?checkout=error`, 302);
  }
}
