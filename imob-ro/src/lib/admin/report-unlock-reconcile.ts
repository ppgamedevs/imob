import type Stripe from "stripe";

import { isReportUnlockStripeMetadata } from "@/lib/billing/report-unlock-stripe-metadata";
import {
  findReportUnlockById,
  findReportUnlockByStripePaymentIntentId,
  findReportUnlockByStripeSessionId,
  markReportUnlockPaidFromStripe,
} from "@/lib/billing/report-unlock";
import { prisma } from "@/lib/db";

function normSearchEmail(e: string): string {
  return e.trim().toLowerCase();
}

export type AdminReportUnlockRow = Awaited<ReturnType<typeof findReportUnlockById>>;

export type LookupReportUnlocksResult = {
  matches: NonNullable<AdminReportUnlockRow>[];
};

/**
 * Find ReportUnlock rows by session id, payment intent id, CUID, analysis id, or exact email.
 */
export async function lookupReportUnlocksForAdmin(query: string): Promise<LookupReportUnlocksResult> {
  const q = query.trim();
  if (!q) {
    return { matches: [] };
  }

  const or: { stripeSessionId?: string; stripePaymentIntentId?: string; id?: string; analysisId?: string; email?: string }[] =
    [];

  or.push(
    { id: q },
    { analysisId: q },
    { stripeSessionId: q },
    { stripePaymentIntentId: q },
  );
  or.push({ email: normSearchEmail(q) });

  const matches = await prisma.reportUnlock.findMany({
    where: { OR: or },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  return { matches };
}

export type ReconcileFromStripeResult =
  | { ok: true; result: Awaited<ReturnType<typeof markReportUnlockPaidFromStripe>>; stripePaymentStatus: string }
  | {
      ok: false;
      error:
        | "not_found"
        | "refunded"
        | "stripe_unpaid"
        | "not_report_unlock"
        | "no_stripe_ids"
        | "no_stripe_key";
    };

/**
 * Re-fetch Stripe and mark paid only when the session or payment intent is actually paid
 * (recovery when webhook/redirect failed to update the DB).
 */
export async function reconcileReportUnlockMarkPaidIfStripePaid(
  stripe: Stripe,
  reportUnlockId: string,
): Promise<ReconcileFromStripeResult> {
  const row = await findReportUnlockById(reportUnlockId);
  if (!row) {
    return { ok: false, error: "not_found" };
  }
  if (row.status === "paid") {
    return {
      ok: true,
      result: { applied: false, reason: "already_paid" as const },
      stripePaymentStatus: "db_already_paid",
    };
  }
  if (row.status === "refunded") {
    return { ok: false, error: "refunded" };
  }

  if (row.stripeSessionId) {
    const s = await stripe.checkout.sessions.retrieve(row.stripeSessionId, { expand: ["payment_intent"] });
    if (!isReportUnlockStripeMetadata(s.metadata) || s.metadata?.reportUnlockId !== reportUnlockId) {
      return { ok: false, error: "not_report_unlock" };
    }
    if (s.metadata?.analysisId && s.metadata.analysisId !== row.analysisId) {
      return { ok: false, error: "not_report_unlock" };
    }
    if (s.payment_status !== "paid") {
      return { ok: false, error: "stripe_unpaid" };
    }
    const pi = s.payment_intent;
    const piId = typeof pi === "string" ? pi : (pi as Stripe.PaymentIntent | null)?.id ?? null;
    const email = s.customer_details?.email ?? s.customer_email ?? null;
    const r = await markReportUnlockPaidFromStripe({
      reportUnlockId,
      stripeSessionId: s.id,
      stripePaymentIntentId: piId,
      amountCents: s.amount_total ?? undefined,
      email: email ?? undefined,
    });
    return { ok: true, result: r, stripePaymentStatus: s.payment_status };
  }

  if (row.stripePaymentIntentId) {
    const pi = await stripe.paymentIntents.retrieve(row.stripePaymentIntentId);
    if (!isReportUnlockStripeMetadata(pi.metadata) || pi.metadata?.reportUnlockId !== reportUnlockId) {
      return { ok: false, error: "not_report_unlock" };
    }
    if (pi.metadata?.analysisId && pi.metadata.analysisId !== row.analysisId) {
      return { ok: false, error: "not_report_unlock" };
    }
    if (pi.status !== "succeeded") {
      return { ok: false, error: "stripe_unpaid" };
    }
    const r = await markReportUnlockPaidFromStripe({
      reportUnlockId,
      stripeSessionId: null,
      stripePaymentIntentId: pi.id,
      amountCents: pi.amount,
      email: (pi.receipt_email as string | null) ?? undefined,
    });
    return { ok: true, result: r, stripePaymentStatus: pi.status };
  }

  return { ok: false, error: "no_stripe_ids" };
}

export async function findReportUnlockByAnyStripeId(sessionOrPi: string) {
  if (sessionOrPi.startsWith("cs_")) {
    return findReportUnlockByStripeSessionId(sessionOrPi);
  }
  if (sessionOrPi.startsWith("pi_")) {
    return findReportUnlockByStripePaymentIntentId(sessionOrPi);
  }
  return null;
}
