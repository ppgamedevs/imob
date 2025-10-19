import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

// Lightweight webhook handler that accepts Stripe's webhook POST body and extracts a few known fields.
// We avoid importing stripe SDK at build-time; instead use a runtime-safe best-effort parser.
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let payload: unknown = {};
    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      payload = JSON.parse((await req.text()) || "{}");
    }

    const payloadObj = (payload as Record<string, unknown>) ?? {};
    const eventType = payloadObj.type as string | undefined;
    if (eventType === "checkout.session.completed") {
      const data = payloadObj.data as Record<string, unknown> | undefined;
      const session = data?.object as Record<string, unknown> | undefined;
      const customerId = (session?.customer as string) ?? null;
      const customerEmail = (session?.customer_email as string) ?? null;

      let user: { id: string } | null = null;
      if (customerId) {
        // build where clause using Prisma types
        const where: Prisma.UserWhereInput = {
          stripeCustomerId: customerId,
        } as Prisma.UserWhereInput;
        user = await prisma.user.findFirst({ where });
      }
      if (!user && customerEmail) {
        user = await prisma.user.findUnique({ where: { email: customerEmail } });
      }

      if (user) {
        // store basic customer info and mark proTier; build data using Prisma types
        const data: Prisma.UserUpdateInput = { proTier: true } as Prisma.UserUpdateInput;
        if (customerId) {
          (data as unknown as Record<string, unknown>).stripeCustomerId = customerId;
        }

        await prisma.user.update({ where: { id: user.id }, data });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ received: false }, { status: 400 });
  }
}
