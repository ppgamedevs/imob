import { NextResponse } from "next/server";

import { runDedupScan } from "@/lib/integrity/dedup";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/integrity/recompute
 * Admin-only endpoint to trigger dedup scan.
 * Requires ADMIN_TOKEN or CRON_SECRET in Authorization header.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const adminToken = process.env.ADMIN_TOKEN;
  const cronSecret = process.env.CRON_SECRET;

  const isAuthed =
    (adminToken && auth === adminToken) ||
    (cronSecret && auth === cronSecret);

  if (!isAuthed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (process.env.INTEGRITY_ENABLED !== "true") {
    return NextResponse.json({
      ok: false,
      message: "Integrity system disabled. Set INTEGRITY_ENABLED=true to enable.",
    });
  }

  let body: { daysBack?: number; limit?: number } = {};
  try {
    body = await req.json();
  } catch {
    // defaults are fine
  }

  const result = await runDedupScan({
    daysBack: body.daysBack ?? 14,
    limit: body.limit ?? 500,
  });

  return NextResponse.json({
    ok: true,
    ...result,
    total: result.textMatches + result.imageMatches + result.addressMatches,
  });
}
