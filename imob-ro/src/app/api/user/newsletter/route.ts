import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const optIn = body.optIn === true;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { newsletterOptIn: optIn },
  });

  return NextResponse.json({ ok: true, newsletterOptIn: optIn });
}
