import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/http/rate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    try { await rateLimit(`usage:${ip}`, 60, 60_000); } catch {
      return NextResponse.json({ ok: true });
    }

    const json = await req.json().catch(() => null);

    if (!json?.analysisId || !json?.action || typeof json.action !== "string" || json.action.length > 50) {
      return NextResponse.json(
        { ok: false, error: "Missing analysisId or action" },
        { status: 400 },
      );
    }

    // Create usage record
    await prisma.reportUsage.create({
      data: {
        userId: "", // anonymous for public actions
        analysisId: json.analysisId,
        action: json.action,
        meta: json.meta ?? {},
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Usage tracking error:", error);
    // Return success anyway for beacons (don't block user)
    return NextResponse.json({ ok: true });
  }
}
