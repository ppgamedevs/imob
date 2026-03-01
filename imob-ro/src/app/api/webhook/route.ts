import { NextResponse } from "next/server";
import Stripe from "stripe";

import { syncSubscription } from "@/lib/billing/sync-subscription";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/obs/logger";

export const runtime = "nodejs";

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
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
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
        break;
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
    }
  } catch (err) {
    logger.error({ eventType: event.type, err }, "Webhook handler error");
  }

  return NextResponse.json({ received: true });
}
