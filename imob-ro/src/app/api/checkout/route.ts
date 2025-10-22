/**
 * Day 23 - Stripe Checkout v2
 * Creates Stripe Checkout Session for Pro subscription
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";

import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Check if Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_PRO) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 501 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const price = process.env.STRIPE_PRICE_PRO;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      success_url: `${url}/billing/success`,
      cancel_url: `${url}/pricing`,
      metadata: { userId: session.user.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }
}
