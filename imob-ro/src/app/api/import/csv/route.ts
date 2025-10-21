import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeUrl } from "@/lib/url";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ ok: false }, { status: 400 });

  const text = await file.text();
  const lines = text.split(/\r?\n/);
  const header =
    lines
      .shift()
      ?.split(",")
      .map((h) => h.trim().toLowerCase()) ?? [];
  const col = header.indexOf("url");
  if (col === -1)
    return NextResponse.json(
      { ok: false, error: "CSV trebuie să conțină coloana `url`" },
      { status: 400 },
    );

  const urls = lines.map((l) => l.split(",")[col]?.trim()).filter(Boolean);

  const batch = await prisma.importBatch.create({
    data: {
      userId: session.user.id,
      source: "csv",
      filename: file.name,
      total: urls.length,
    },
  });

  let accepted = 0,
    skipped = 0;
  for (const raw of urls) {
    const norm = normalizeUrl(raw) ?? raw;
    try {
      await prisma.importItem.create({
        data: { batchId: batch.id, url: raw, normalized: norm },
      });
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
