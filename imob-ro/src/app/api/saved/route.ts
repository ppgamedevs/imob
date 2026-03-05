import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/http/rate";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    try { await rateLimit(`saved:${ip}`, 20, 60_000); } catch {
      return NextResponse.json({ error: "rate_limit" }, { status: 429 });
    }

    const body = await req.json();
    const { analysisId, notes } = body as {
      analysisId?: string;
      notes?: string;
    };
    if (!analysisId) return NextResponse.json({ error: "invalid" }, { status: 400 });

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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

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
