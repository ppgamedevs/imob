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
        // allow a temporary cast until prisma client is regenerated
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user = await (prisma as any).user.findFirst({ where: { stripeCustomerId: customerId } });
      }
      if (!user && customerEmail) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user = await (prisma as any).user.findUnique({ where: { email: customerEmail } });
      }

      if (user) {
        // store basic customer info and mark proTier
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).user.update({
          where: { id: user.id },
          data: { proTier: true, stripeCustomerId: customerId ?? undefined },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ received: false }, { status: 400 });
  }
}
