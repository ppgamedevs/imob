/**
 * /api/track/dwell - Track dwell time events
 *
 * Logs BuyerEvent when user spends >= 15s on a property page
 * Updates user taste with higher weight (3.0x)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateUserTaste } from "@/lib/reco/taste";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { groupId, analysisId, dwellSeconds, meta } = body;

    if (!groupId || !analysisId || typeof dwellSeconds !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Only track if dwell >= 15s
    if (dwellSeconds < 15) {
      return NextResponse.json({ ok: true, tracked: false });
    }

    // Log BuyerEvent
    await prisma.buyerEvent.create({
      data: {
        userId: session.user.id,
        kind: "dwell_property",
        meta: {
          groupId,
          analysisId,
          dwellSeconds,
          ...meta,
        },
        ts: new Date(),
      },
    });

    // Update user taste (3.0x weight for dwell events)
    await updateUserTaste({
      userId: session.user.id,
      eventKind: "dwell_property",
      meta: {
        areaSlug: meta.areaSlug,
        priceEur: meta.priceEur,
        rooms: meta.rooms,
        type: meta.type,
      },
    });

    return NextResponse.json({ ok: true, tracked: true });
  } catch (error) {
    console.error("Error tracking dwell:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
