import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/http/rate";

const ALLOWED_SHORTLINK_HOSTS = new Set([
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NEXTAUTH_URL,
  "https://imobintel.ro",
  "http://localhost:3000",
].filter(Boolean).map((u) => { try { return new URL(u!).hostname; } catch { return ""; } }));

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    try {
      await rateLimit(`shortlink:${ip}`, 10, 60_000);
    } catch {
      return NextResponse.json({ error: "rate_limit" }, { status: 429 });
    }

    const body = await req.json();
    const target = body?.target;
    if (!target || typeof target !== "string") {
      return NextResponse.json({ error: "missing_target" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return NextResponse.json({ error: "invalid_url" }, { status: 400 });
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "invalid_scheme" }, { status: 400 });
    }

    if (!ALLOWED_SHORTLINK_HOSTS.has(parsed.hostname)) {
      return NextResponse.json({ error: "domain_not_allowed" }, { status: 400 });
    }

    const slug = nanoid(7);
    await (prisma as any).shortLink.create({ data: { slug, targetUrl: target } });

    const base =
      process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    return NextResponse.json({ url: `${base}/s/${slug}` });
  } catch (err) {
    console.error("[shortlink]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
