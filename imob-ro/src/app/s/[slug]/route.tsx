import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const slug = parts[parts.length - 1];
  if (!slug) return NextResponse.redirect("/", 302);

  const record = await prisma.shortLink.findUnique({ where: { slug } });
  if (!record) return NextResponse.redirect("/", 302);

  return NextResponse.redirect(record.targetUrl, 302);
}
