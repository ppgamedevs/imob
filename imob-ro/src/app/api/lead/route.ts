import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/http/rate";

export const runtime = "nodejs";

async function resolveAssignee(analysisId: string) {
  // agent aprobat?
  const approved = await prisma.listingClaim.findFirst({
    where: { analysisId, status: "approved" },
    include: { agent: { include: { user: true } } },
  });
  if (approved?.agent?.userId) return approved.agent.userId;

  // fallback: owner-ul analizei
  const a = await prisma.analysis.findUnique({ where: { id: analysisId } });
  return a?.userId ?? null;
}

async function notifyUser(
  userId: string | null,
  analysisId: string,

  payload: any,
) {
  // află emailul userului
  if (!userId) return;
  const u = await prisma.user.findUnique({ where: { id: userId } });
  const to = u?.email;
  if (!to) return;

  const body = `Lead nou pentru raport ${analysisId}
Nume: ${payload.name}
Email: ${payload.email}
Telefon: ${payload.phone || "-"}
Mesaj: ${payload.message || "-"}`;

  const key = process.env.RESEND_API_KEY;
  if (key) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: "Imob <leads@your-domain>",
        to: [to],
        subject: "Lead nou pe raport",
        text: body,
      }),
    }).catch(() => {});
  }
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try {
    await rateLimit(`lead:${ip}`, 5, 60_000);
  } catch {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }

  const json = await req.json();
  const { analysisId, name, email, phone, message, source } = json || {};
  if (!analysisId || !name || !email) return NextResponse.json({ ok: false }, { status: 400 });

  if (typeof name !== "string" || name.length > 200) return NextResponse.json({ ok: false }, { status: 400 });
  if (typeof email !== "string" || email.length > 320 || !email.includes("@")) return NextResponse.json({ ok: false }, { status: 400 });
  if (message && (typeof message !== "string" || message.length > 2000)) return NextResponse.json({ ok: false }, { status: 400 });

  const assignedTo = await resolveAssignee(analysisId);

  // persistă lead
  const lead = await prisma.lead.create({
    data: {
      analysisId,
      assignedTo,
      name,
      email,
      phone,
      message,
      source: source ?? "share",
    },
  });

  // tracking best-effort
  await prisma.reportUsage
    .create({
      data: {
        userId: assignedTo ?? "",
        analysisId,
        action: "CONTACT_REQUEST",

        meta: { name, email, phone } as any,
      } as any,
    })
    .catch(() => {});

  await notifyUser(assignedTo, analysisId, { name, email, phone, message });

  return NextResponse.json({ ok: true, id: lead.id });
}
