import { NextResponse } from "next/server";

/**
 * Lightweight liveness probe for Docker/K8s — no DB or external APIs.
 * Use /api/health for deep checks (DB, Stripe, Resend, crons).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { ok: true, live: true },
    {
      status: 200,
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    },
  );
}
