import { NextResponse } from "next/server";
import { startAnalysis } from "@/lib/analysis";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.analysisId || "");
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    const a = await prisma.analysis.findUnique({ where: { id } });
    if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });

    // start background analysis (don't await fully)
    startAnalysis(id, a.sourceUrl).catch((e) => console.error("startAnalysis failed", e));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
