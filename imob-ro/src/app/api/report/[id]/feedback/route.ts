import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { canViewFullReportFromRequest } from "@/lib/billing/report-unlock";
import { prisma } from "@/lib/db";
import { trackFunnelEvent } from "@/lib/tracking/funnel";

export const runtime = "nodejs";

const RATINGS = new Set(["yes", "partial", "no"]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: analysisId } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const cookieHeader = req.headers.get("cookie");

  const full = await canViewFullReportFromRequest(analysisId, userId, cookieHeader, null);
  if (!full) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { reportUnlockId?: string; rating?: string; comment?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const reportUnlockId = typeof body.reportUnlockId === "string" ? body.reportUnlockId.trim() : "";
  const rating = typeof body.rating === "string" ? body.rating.trim() : "";
  const comment =
    typeof body.comment === "string" ? body.comment.trim().slice(0, 8000) : null;

  if (!reportUnlockId || !RATINGS.has(rating)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const unlock = await prisma.reportUnlock.findFirst({
    where: {
      id: reportUnlockId,
      analysisId,
      status: "paid",
    },
    select: { id: true },
  });
  if (!unlock) {
    return NextResponse.json({ error: "invalid_unlock" }, { status: 400 });
  }

  const existing = await prisma.reportFeedback.findUnique({
    where: { analysisId },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    await prisma.reportFeedback.create({
      data: {
        analysisId,
        reportUnlockId: unlock.id,
        userId,
        rating,
        comment: comment && comment.length > 0 ? comment : null,
      },
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw e;
  }

  await trackFunnelEvent("paid_report_feedback_submitted", {
    userId,
    analysisId,
    path: `/report/${analysisId}`,
    metadata: { rating },
  });

  return NextResponse.json({ ok: true });
}
