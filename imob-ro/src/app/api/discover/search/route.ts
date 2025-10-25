import { NextResponse } from "next/server";

import { discoverSearch } from "@/lib/discover/search";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const result = await discoverSearch(url.searchParams);
  if (!result.ok) {
    return NextResponse.json({ ok: result.ok, error: result.error }, { status: 400 });
  }
  return NextResponse.json(
    {
      ok: result.ok,
      items: result.items,
      nextCursor: result.nextCursor,
      countApprox: result.countApprox,
    },
    {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=3600",
      },
    },
  );
}
