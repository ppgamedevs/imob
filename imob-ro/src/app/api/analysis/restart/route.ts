import { NextResponse } from "next/server";

import { startAnalysis } from "@/lib/analysis";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/http/rate";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    try {
      await rateLimit(`restart:${ip}`, 5, 60_000);
    } catch {
      return NextResponse.json({ error: "rate_limit" }, { status: 429 });
    }

    const body = await req.json();
    const id = String(body.analysisId || "");
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    const a = await prisma.analysis.findUnique({ where: { id } });
    if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });

    try {
      await rateLimit(`restart:id:${id}`, 3, 300_000);
    } catch {
      return NextResponse.json({ error: "analysis_restart_limit" }, { status: 429 });
    }

    startAnalysis(id, a.sourceUrl).catch((err) => console.error("startAnalysis failed", err));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
