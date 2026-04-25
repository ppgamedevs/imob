import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/http/rate";
import { sendReportPreviewLeadEmail } from "@/lib/report-lead/send-report-lead-email";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().trim().email().max(320),
  consent: z.boolean().optional().default(false),
  /** Honeypot — must stay empty */
  website: z.string().max(200).optional(),
});

function appBaseUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  return "https://imobintel.ro";
}

/**
 * POST /api/report/[id]/report-lead
 * Save email from locked report preview; optionally send follow-up via Resend.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: analysisId } = await ctx.params;
  if (!analysisId) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try {
    await rateLimit(`report-lead:ip:${ip}`, 20, 60_000);
    await rateLimit(`report-lead:analysis:${analysisId}`, 8, 60_000);
  } catch {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { email, consent, website } = parsed.data;
  if (website) {
    return NextResponse.json({ ok: true });
  }

  const emailNorm = email.toLowerCase();

  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    select: {
      id: true,
      status: true,
      extractedListing: { select: { title: true } },
    },
  });
  if (!analysis || analysis.status !== "done") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const existing = await prisma.reportLead.findUnique({
    where: {
      analysisId_email: { analysisId, email: emailNorm },
    },
  });

  let shouldSendEmail = false;

  if (existing) {
    if (consent && !existing.consent) {
      await prisma.reportLead.update({
        where: { id: existing.id },
        data: { consent: true, source: "report_preview_lock" },
      });
      shouldSendEmail = true;
    }
  } else {
    await prisma.reportLead.create({
      data: {
        analysisId,
        email: emailNorm,
        consent,
        source: "report_preview_lock",
      },
    });
    shouldSendEmail = consent;
  }

  if (shouldSendEmail) {
    const base = appBaseUrl(req);
    const reportUrl = `${base}/report/${analysisId}`;
    await sendReportPreviewLeadEmail({
      to: emailNorm,
      reportUrl,
      propertyTitle: analysis.extractedListing?.title ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
