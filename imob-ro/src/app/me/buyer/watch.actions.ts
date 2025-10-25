/**
 * Day 29: Watchlist Server Actions
 * Add/remove/list favorite properties (by group)
 */

"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateUserTaste } from "@/lib/reco/taste";

export async function addWatchAction(groupId: string, note?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  const watchItem = await prisma.watchItem.upsert({
    where: {
      userId_groupId: {
        userId: session.user.id,
        groupId,
      },
    },
    update: {
      note: note ?? undefined,
    },
    create: {
      userId: session.user.id,
      groupId,
      note: note ?? undefined,
    },
  });

  // Get group details for taste tracking (Day 35)
  const group = await prisma.dedupGroup.findUnique({
    where: { id: groupId },
    include: {
      analyses: {
        where: { status: "done" },
        include: {
          extractedListing: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (group && group.analyses.length > 0) {
    const analysis = group.analyses[0];
    const extracted = analysis.extractedListing;

    // Log BuyerEvent
    await prisma.buyerEvent.create({
      data: {
        userId: session.user.id,
        kind: "add_to_watch",
        meta: {
          groupId,
          analysisId: analysis.id,
          areaSlug: group.areaSlug,
          priceEur: extracted?.price,
          rooms: extracted?.rooms,
        },
        ts: new Date(),
      },
    });

    // Update user taste (5.0x weight for watch events)
    await updateUserTaste({
      userId: session.user.id,
      eventKind: "add_to_watch",
      meta: {
        areaSlug: group.areaSlug ?? undefined,
        priceEur: extracted?.price ?? undefined,
        rooms: extracted?.rooms ?? undefined,
      },
    });
  }

  revalidatePath("/me/buyer");
  return { ok: true };
}

export async function removeWatchAction(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  await prisma.watchItem.delete({
    where: {
      userId_groupId: {
        userId: session.user.id,
        groupId,
      },
    },
  });

  revalidatePath("/me/buyer");
  return { ok: true };
}

export async function listWatchItemsAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { items: [] };
  }

  const items = await prisma.watchItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      group: {
        include: {
          snapshots: {
            orderBy: { createdAt: "desc" },
            take: 2, // Latest 2 to detect price changes
          },
          analyses: {
            where: { status: "done" },
            include: {
              featureSnapshot: true,
              extractedListing: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  return {
    items: items.map((w) => ({
      id: w.id,
      groupId: w.groupId,
      note: w.note,
      createdAt: w.createdAt,
      group: w.group,
    })),
  };
}

export async function checkIsWatchedAction(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { watched: false };
  }

  const item = await prisma.watchItem.findUnique({
    where: {
      userId_groupId: {
        userId: session.user.id,
        groupId,
      },
    },
  });

  return { watched: !!item };
}
