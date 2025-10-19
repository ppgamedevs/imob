/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { analysisId, sold, price, notes } = body as {
      analysisId: string;
      sold: boolean;
      price?: number;
      notes?: string;
    };

    if (!analysisId) {
      return NextResponse.json({ error: "missing analysisId" }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user?.id ?? null;

    // record feedback (cast prisma to any in case generated client is out-of-sync)
    await (prisma as any).feedback.create({
      data: {
        analysisId,
        userId,
        sold: !!sold,
        price: price ?? null,
        notes: notes ?? null,
      },
    });

    // grant credit if user present
    if (userId) {
      await (prisma as any).user.update({
        where: { id: userId },
        data: { freeCredits: { increment: 1 } },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
