import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeUrl } from "@/lib/url";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const { urls } = await req.json();
  const list = String(urls || "")
    .split(/\r?\n/)
    .map((s: string) => s.trim())
    .filter(Boolean);

  const batch = await prisma.importBatch.create({
    data: { userId: session.user.id, source: "paste", total: list.length },
  });

  let accepted = 0,
    skipped = 0;
  for (const raw of list) {
    const norm = normalizeUrl(raw) ?? raw;
    try {
      await prisma.importItem.create({
        data: { batchId: batch.id, url: raw, normalized: norm },
      });
      // creează job – dacă nu există deja în CrawlJob
      await prisma.crawlJob.upsert({
        where: { normalized: norm },
        update: {},
        create: {
          url: raw,
          normalized: norm,
          domain: new URL(norm).hostname.replace(/^www\./, ""),
        },
      });
      accepted++;
    } catch {
      skipped++;
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { accepted, skipped },
  });
  return NextResponse.json({ ok: true, batchId: batch.id, accepted, skipped });
}
