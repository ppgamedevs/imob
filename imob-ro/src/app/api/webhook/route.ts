/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Day 23 - Stripe Webhook v2
 * Handles subscription lifecycle events with signature verification
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// Avoid Prisma/Stripe type conflicts
type StripeSubscription = Stripe.Subscription;

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe not configured", { status: 501 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Verify webhook signature
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e: any) {
    console.error("Webhook signature verification failed:", e.message);
    return new Response(`Webhook Error: ${e.message}`, { status: 400 });
  }

  // Handle subscription events
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;

        if (userId && customerId) {
          // Update user with customer ID and mark as Pro (legacy proTier for backward compat)
          await prisma.user.update({
            where: { id: userId },
            data: {
              stripeCustomerId: customerId,
              proTier: true,
            },
          });

          // Create Subscription record
          if (session.subscription) {
            const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (prisma as any).subscription.upsert({
              where: { userId },
              create: {
                userId,
                planCode: "pro",
                status: stripeSub.status,
                stripeSubId: stripeSub.id,
                renewsAt: (stripeSub as any).current_period_end
                  ? new Date((stripeSub as any).current_period_end * 1000)
                  : null,
                cancelAt: (stripeSub as any).cancel_at
                  ? new Date((stripeSub as any).cancel_at * 1000)
                  : null,
              },
              update: {
                planCode: "pro",
                status: stripeSub.status,
                stripeSubId: stripeSub.id,
                renewsAt: (stripeSub as any).current_period_end
                  ? new Date((stripeSub as any).current_period_end * 1000)
                  : null,
                cancelAt: (stripeSub as any).cancel_at
                  ? new Date((stripeSub as any).cancel_at * 1000)
                  : null,
              },
            });
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as StripeSubscription;

        // Find user by customer ID
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: stripeSub.customer as string },
        });

        if (user) {
          const status = stripeSub.status; // active, past_due, canceled, trialing, etc.
          const planCode =
            stripeSub.status === "active" || stripeSub.status === "trialing" ? "pro" : "free";

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma as any).subscription.upsert({
            where: { userId: user.id },
            update: {
              planCode,
              status,
              stripeSubId: stripeSub.id,
              renewsAt: (stripeSub as any).current_period_end
                ? new Date((stripeSub as any).current_period_end * 1000)
                : null,
              cancelAt: (stripeSub as any).cancel_at
                ? new Date((stripeSub as any).cancel_at * 1000)
                : null,
            },
            create: {
              userId: user.id,
              planCode,
              status,
              stripeSubId: stripeSub.id,
              renewsAt: (stripeSub as any).current_period_end
                ? new Date((stripeSub as any).current_period_end * 1000)
                : null,
              cancelAt: (stripeSub as any).cancel_at
                ? new Date((stripeSub as any).cancel_at * 1000)
                : null,
            },
          });

          // Update legacy proTier flag
          await prisma.user.update({
            where: { id: user.id },
            data: { proTier: planCode === "pro" },
          });
        }
        break;
      }
    }
  } catch (e) {
    console.error("Webhook handler error:", e);
  }

  return NextResponse.json({ received: true });
}
