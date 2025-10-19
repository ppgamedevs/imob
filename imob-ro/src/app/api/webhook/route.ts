import { NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2022-11-15" });

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature") || "";
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET || "");
  } catch (err) {
    console.error("webhook error", err);
    return NextResponse.json({ received: false }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    // Prefer matching by customer id; fallback to customer_email
    const customerId = (session.customer as string) || null;
    let user = null;
    if (customerId) {
      user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
    }
    if (!user && session.customer_email) {
      user = await prisma.user.findUnique({ where: { email: session.customer_email } });
    }

    if (user) {
      // If there is a subscription attached to the session, prefer that info
      const subscriptionId = (session.subscription as string) || null;
      if (subscriptionId) {
        // fetch subscription status from Stripe to store metadata
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await prisma.user.update({
            where: { id: user.id },
            data: {
              proTier: sub.status === "active" || sub.status === "trialing",
              stripeSubscriptionId: sub.id,
              stripeSubscriptionStatus: sub.status,
              stripeSubscriptionCurrentPeriodEnd: sub.current_period_end
                ? new Date(sub.current_period_end * 1000)
                : null,
              stripeCustomerId: customerId ?? undefined,
            },
          });
        } catch (e) {
          console.warn("webhook: failed to fetch subscription", e);
          await prisma.user.update({
            where: { id: user.id },
            data: { proTier: true, stripeCustomerId: customerId ?? undefined },
          });
        }
      } else {
        // one-time payment (no subscription) -> grant proTier flag for now
        await prisma.user.update({
          where: { id: user.id },
          data: { proTier: true, stripeCustomerId: customerId ?? undefined },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
