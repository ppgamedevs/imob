import { NextResponse } from "next/server";

import { runExtractor } from "@/lib/extract/run";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { url, html } = await req.json();
  if (!url && !html)
    return NextResponse.json({ ok: false, error: "need url or html" }, { status: 400 });

  let pageHtml = html as string | undefined;
  if (!pageHtml && url) {
    const res = await fetch(url, {
      headers: { "user-agent": "ImobIntelBot/0.1" },
    });
    pageHtml = await res.text();
  }
  const data = await runExtractor(pageHtml!, url || "about:blank");
  return NextResponse.json({ ok: true, data });
}
