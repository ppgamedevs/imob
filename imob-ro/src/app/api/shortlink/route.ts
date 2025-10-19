import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const target = body?.target;
    if (!target) return NextResponse.json({ error: "missing_target" }, { status: 400 });

    const slug = nanoid(7);
    await prisma.shortLink.create({ data: { slug, targetUrl: target } });

    const base =
      process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    return NextResponse.json({ url: `${base}/s/${slug}` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
