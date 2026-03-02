import type Stripe from "stripe";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/obs/logger";

/**
 * Upsert a Subscription record from a Stripe subscription object.
 * Single source of truth - used by all webhook event handlers.
 */
export async function syncSubscription(
  userId: string,
  stripeSub: Stripe.Subscription,
): Promise<void> {
  const status = stripeSub.status;

  // Determine plan from Stripe price ID
  let planCode = "free";
  if (status === "active" || status === "trialing") {
    const priceId = stripeSub.items?.data?.[0]?.price?.id;
    if (priceId === process.env.STRIPE_PRICE_STANDARD) {
      planCode = "standard";
    } else {
      planCode = "pro";
    }
  }

  const renewsAt = stripeSub.current_period_end
    ? new Date(stripeSub.current_period_end * 1000)
    : null;
  const cancelAt = stripeSub.cancel_at
    ? new Date(stripeSub.cancel_at * 1000)
    : null;

  try {
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planCode,
        status,
        stripeSubId: stripeSub.id,
        renewsAt,
        cancelAt,
      },
      update: {
        planCode,
        status,
        stripeSubId: stripeSub.id,
        renewsAt,
        cancelAt,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { proTier: planCode === "pro" || planCode === "standard" },
    });

    logger.info({ userId, planCode, status }, "Subscription synced");
  } catch (err) {
    logger.error({ userId, err }, "Failed to sync subscription");
    throw err;
  }
}
