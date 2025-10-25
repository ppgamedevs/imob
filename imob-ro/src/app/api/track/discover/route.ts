/**
 * /api/track/discover - Track discover card click events
 *
 * Logs BuyerEvent when user clicks on a property card
 * Updates user taste with lower weight (0.5x)
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
    const { groupId, analysisId, meta } = body;

    if (!groupId || !analysisId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Log BuyerEvent
    await prisma.buyerEvent.create({
      data: {
        userId: session.user.id,
        kind: "discover_card_click",
        meta: {
          groupId,
          analysisId,
          ...meta,
        },
        ts: new Date(),
      },
    });

    // Update user taste (0.5x weight for discover clicks)
    await updateUserTaste({
      userId: session.user.id,
      eventKind: "discover_card_click",
      meta: {
        areaSlug: meta.areaSlug,
        priceEur: meta.priceEur,
        rooms: meta.rooms,
        type: meta.type,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error tracking discover:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
