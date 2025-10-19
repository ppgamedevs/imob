import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, analysisId, notes } = body as {
      userId?: string;
      analysisId?: string;
      notes?: string;
    };
    if (!userId || !analysisId) return NextResponse.json({ error: "invalid" }, { status: 400 });

    const db = prisma as unknown as {
      savedAnalysis: {
        create: (args: unknown) => Promise<unknown>;
      };
    };
    const saved = await db.savedAnalysis.create({ data: { userId, analysisId, notes } } as unknown);
    return NextResponse.json({ ok: true, saved });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "missing userId" }, { status: 400 });
    const db = prisma as unknown as {
      savedAnalysis: {
        findMany: (args: unknown) => Promise<unknown[]>;
      };
    };
    const list = await db.savedAnalysis.findMany({ where: { userId } } as unknown);
    return NextResponse.json({ ok: true, list });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
