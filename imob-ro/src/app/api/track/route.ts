import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

type TrackBody = { areaSlug: string; event: string };

function isTrackBody(u: unknown): u is TrackBody {
  if (!u || typeof u !== "object") return false;
  const o = u as Record<string, unknown>;
  return typeof o.areaSlug === "string" && typeof o.event === "string";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!isTrackBody(body)) return NextResponse.json({ error: "invalid" }, { status: 400 });

    const { areaSlug, event } = body;
    const today = new Date();
    // normalize to yyyy-mm-dd (date only)
    const dateOnly = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );

    // Use index-access to avoid TS compile errors until `prisma generate` is run
    const db = prisma as unknown as {
      areaEvent: {
        upsert: (args: unknown) => Promise<unknown>;
      };
    };
    await db.areaEvent.upsert({
      where: { areaSlug_date_event: { areaSlug, date: dateOnly, event } },
      create: { areaSlug, date: dateOnly, event, count: 1 },
      update: { count: { increment: 1 } },
    } as unknown);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("track error", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
