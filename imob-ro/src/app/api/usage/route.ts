import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Beacon endpoint for tracking usage actions (DOWNLOAD_PDF, SAVE_REPORT, etc.)
 * Designed to be called via navigator.sendBeacon() for fire-and-forget tracking
 */
export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);

    if (!json?.analysisId || !json?.action) {
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
