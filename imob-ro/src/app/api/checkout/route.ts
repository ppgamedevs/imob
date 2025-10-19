import { NextResponse } from "next/server";
import Stripe from "stripe";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2022-11-15" });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json();
  const mode = body.mode === "subscription" ? "subscription" : "payment";

  // create customer if needed
  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  let customerId = user?.stripeCustomerId ?? null;
  if (!customerId) {
    const c = await stripe.customers.create({ email: session.user.email ?? undefined });
    customerId = c.id;
    await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
  }

  // create checkout session
  const sessionData = await stripe.checkout.sessions.create({
    mode: mode === "subscription" ? "subscription" : "payment",
    customer: customerId!,
    payment_method_types: ["card"],
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID || "",
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXTAUTH_URL}/?checkout=success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/?checkout=cancel`,
  });

  return NextResponse.json({ url: sessionData.url });
}
