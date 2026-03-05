import { NextResponse } from "next/server";

import { runExtractor } from "@/lib/extract/run";
import { assertSafeUrl, LISTING_DOMAINS } from "@/lib/http/ssrf";
import { rateLimit } from "@/lib/http/rate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  try {
    await rateLimit(`extract-preview:${ip}`, 10, 60_000);
  } catch {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }

  const { url, html } = await req.json();
  if (!url && !html)
    return NextResponse.json({ ok: false, error: "need url or html" }, { status: 400 });

  let pageHtml = html as string | undefined;
  if (!pageHtml && url) {
    try {
      assertSafeUrl(url, { allowedDomains: LISTING_DOMAINS });
    } catch {
      return NextResponse.json({ ok: false, error: "url_not_allowed" }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: { "user-agent": "ImobIntelBot/0.1" },
      signal: AbortSignal.timeout(15_000),
    });
    pageHtml = await res.text();
  }

  if (typeof pageHtml === "string" && pageHtml.length > 2_000_000) {
    return NextResponse.json({ ok: false, error: "response_too_large" }, { status: 413 });
  }

  const data = await runExtractor(pageHtml!, url || "about:blank");
  return NextResponse.json({ ok: true, data });
}
