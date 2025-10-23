/**
 * /api/cron/taste/decay - Weekly taste decay job
 *
 * Applies 7-day half-life decay to all user taste profiles
 * Should be called weekly via cron
 */

import { NextRequest, NextResponse } from "next/server";
import { decayAllTastes } from "@/lib/reco/taste";

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET || "dev-secret";

    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Run decay
    const stats = await decayAllTastes();

    return NextResponse.json({
      ok: true,
      ...stats,
    });
  } catch (error) {
    console.error("Error in taste decay cron:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
