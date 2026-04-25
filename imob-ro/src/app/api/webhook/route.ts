import { NextResponse } from "next/server";
import Stripe from "stripe";

import { isReportUnlockStripeMetadata } from "@/lib/billing/report-unlock-stripe-metadata";
import {
  findReportUnlockById,
  findReportUnlockByStripePaymentIntentId,
  markReportUnlockPaidFromStripe,
  markReportUnlockRefundedFromStripe,
} from "@/lib/billing/report-unlock";
import { syncSubscription } from "@/lib/billing/sync-subscription";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/obs/logger";

export const runtime = "nodejs";

/** Resolve our `ReportUnlock` id from a Stripe PaymentIntent id (column or metadata). */
async function reportUnlockIdForPaymentIntent(
  stripe: Stripe,
  paymentIntentId: string,
): Promise<string | null> {
  const byCol = await findReportUnlockByStripePaymentIntentId(paymentIntentId);
  if (byCol) {
    return byCol.id;
  }
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (isReportUnlockStripeMetadata(pi.metadata) && pi.metadata?.reportUnlockId) {
    return pi.metadata.reportUnlockId;
  }
  return null;
}

/**
 * @throws On Prisma or Stripe read errors; HTTP handler returns 5xx for Stripe to retry.
 */
async function handleReportUnlockCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  if (!isReportUnlockStripeMetadata(session.metadata) || !session.metadata?.reportUnlockId) {
    return;
  }
  if (session.payment_status !== "paid") {
    return;
  }
  const reportUnlockId = session.metadata.reportUnlockId;
  const row = await findReportUnlockById(reportUnlockId);
  if (!row) {
    logger.error(
      { reportUnlockId, sessionId: session.id },
      "Report unlock checkout.session.completed: missing ReportUnlock row; use admin reconcile after fixing data",
    );
    return;
  }
  if (session.metadata?.analysisId && row.analysisId !== session.metadata.analysisId) {
    logger.warn(
      { reportUnlockId, rowAnalysisId: row.analysisId, metaAnalysisId: session.metadata.analysisId },
      "Report unlock checkout.session.completed: analysisId mismatch; skipping",
    );
    return;
  }
  if (row.status === "paid") {
    return;
  }
  const pi = session.payment_intent;
  const piId = typeof pi === "string" ? pi : (pi as Stripe.PaymentIntent | null)?.id ?? null;
  const email = session.customer_details?.email ?? session.customer_email;
  const result = await markReportUnlockPaidFromStripe({
    reportUnlockId,
    stripeSessionId: session.id,
    stripePaymentIntentId: piId,
    amountCents: session.amount_total ?? undefined,
    email: email ?? undefined,
  });
  if (result.applied === false && result.reason === "blocked_refunded") {
    logger.warn(
      { reportUnlockId, sessionId: session.id },
      "Report unlock: paid session received but row is refunded; skipping",
    );
  }
}

/**
 * @throws on DB failure
 */
async function handleProCheckoutSession(stripe: Stripe, session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;

  if (userId && customerId) {
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId, proTier: true },
    });

    if (session.subscription) {
      const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
      await syncSubscription(userId, stripeSub);
    }
  }
}

/**
 * @throws on DB failure
 */
async function handleReportUnlockPaymentIntentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
  if (!isReportUnlockStripeMetadata(pi.metadata) || !pi.metadata?.reportUnlockId) {
    return;
  }
  const id = pi.metadata.reportUnlockId;
  const row = await findReportUnlockById(id);
  if (row && row.status !== "paid" && (!pi.metadata?.analysisId || row.analysisId === pi.metadata.analysisId)) {
    const result = await markReportUnlockPaidFromStripe({
      reportUnlockId: id,
      stripeSessionId: null,
      stripePaymentIntentId: pi.id,
      amountCents: pi.amount,
      email: (pi.receipt_email as string | null) ?? undefined,
    });
    if (result.applied === false && result.reason === "blocked_refunded") {
      logger.warn({ reportUnlockId: id, paymentIntent: pi.id }, "Report unlock PI succeeded but row refunded; skipping");
    }
  }
}

/**
 * @throws on DB read/write failure; charge.refunded is a critical state change.
 */
async function handleChargeRefunded(stripe: Stripe, charge: Stripe.Charge): Promise<void> {
  const piId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : (charge.payment_intent as Stripe.PaymentIntent | null)?.id;
  if (!piId) {
    return;
  }
  const reportUnlockId = await reportUnlockIdForPaymentIntent(stripe, piId);
  if (!reportUnlockId) {
    return;
  }
  const result = await markReportUnlockRefundedFromStripe(reportUnlockId);
  if (result.applied) {
    logger.info(
      { reportUnlockId, chargeId: charge.id, paymentIntentId: piId, amountRefunded: charge.amount_refunded },
      "Report unlock marked refunded after charge.refunded",
    );
  } else if (result.reason === "not_paid" || result.reason === "not_found") {
    logger.warn(
      { reportUnlockId, reason: result.reason, chargeId: charge.id },
      "charge.refunded: ReportUnlock not marked refunded (row not paid or missing)",
    );
  }
}

async function processStripeEvent(stripe: Stripe, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (isReportUnlockStripeMetadata(session.metadata) && session.metadata?.reportUnlockId) {
        await handleReportUnlockCheckoutSession(session);
        return;
      }
      await handleProCheckoutSession(stripe, session);
      return;
    }

    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await handleReportUnlockPaymentIntentSucceeded(pi);
      return;
    }

    case "payment_intent.canceled": {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (isReportUnlockStripeMetadata(pi.metadata) && pi.metadata?.reportUnlockId) {
        logger.info(
          { reportUnlockId: pi.metadata.reportUnlockId, paymentIntent: pi.id },
          "Report unlock payment_intent.canceled (row may stay pending; no access granted)",
        );
      }
      return;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      await handleChargeRefunded(stripe, charge);
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const stripeSub = event.data.object as Stripe.Subscription;
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: stripeSub.customer as string },
      });

      if (user) {
        await syncSubscription(user.id, stripeSub);
      }
      break;
    }
    default:
      break;
  }
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe not configured", { status: 501 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error({ err }, "Webhook signature verification failed");
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  try {
    await processStripeEvent(stripe, event);
  } catch (err) {
    logger.error(
      { err, eventId: event.id, eventType: event.type },
      "Stripe webhook handler failed; returning 5xx for retry",
    );
    return new Response("Processing failed", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
