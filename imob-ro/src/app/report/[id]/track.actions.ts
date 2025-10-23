"use server";

/**
 * track.actions.ts - Server actions for tracking user behavior
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateUserTaste } from "@/lib/reco/taste";

/**
 * Track view_property event
 * Called when user views a property report page
 */
export async function trackPropertyView(params: {
  groupId: string;
  analysisId: string;
  areaSlug?: string;
  priceEur?: number;
  rooms?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "Not authenticated" };
    }

    const { groupId, analysisId, areaSlug, priceEur, rooms } = params;

    // Log BuyerEvent
    await prisma.buyerEvent.create({
      data: {
        userId: session.user.id,
        kind: "view_property",
        meta: {
          groupId,
          analysisId,
          areaSlug,
          priceEur,
          rooms,
        },
        ts: new Date(),
      },
    });

    // Update user taste (1.0x weight for view events)
    await updateUserTaste({
      userId: session.user.id,
      eventKind: "view_property",
      meta: {
        areaSlug,
        priceEur,
        rooms,
      },
    });

    return { ok: true };
  } catch (error) {
    console.error("Error tracking property view:", error);
    return { ok: false, error: "Failed to track view" };
  }
}
