import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const slug = parts[parts.length - 1];
  if (!slug) return NextResponse.redirect("/", 302);

  // prisma client typings may be stale here; use a cast to any to access the shortLink model
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record = await (prisma as any).shortLink.findUnique({ where: { slug } });
  if (!record) return NextResponse.redirect("/", 302);

  return NextResponse.redirect(record.targetUrl, 302);
}
