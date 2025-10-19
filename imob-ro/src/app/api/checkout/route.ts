import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // If Stripe is not configured, return helpful error so build doesn't require stripe SDK
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 501 });
  }

  // In a real deployment this handler should create a Stripe customer (if missing) and a Checkout session.
  // We avoid importing the stripe SDK in the build to keep the repo lightweight here.

  // Attempt to persist stripeCustomerId if provided in body (best-effort, runtime-only)
  try {
    const body = await req.json();
    const userId = session.user.id;
    const providedCustomerId = body?.customerId;
    if (providedCustomerId) {
      // persist stripeCustomerId to user
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: providedCustomerId },
      });
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ url: null });
}
