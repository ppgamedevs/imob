/**
 * Day 23 - Stripe Customer Portal
 * Redirects users to Stripe's hosted portal for subscription management
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 501 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    // Get user's Stripe customer ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: "no_customer" }, { status: 404 });
    }

    const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${url}/account`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json({ error: "portal_failed" }, { status: 500 });
  }
}
