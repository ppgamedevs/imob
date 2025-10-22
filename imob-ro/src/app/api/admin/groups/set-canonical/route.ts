import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { rebuildGroupSnapshot } from "@/lib/dedup/snapshot";

export const runtime = "nodejs";

/**
 * POST /api/admin/groups/set-canonical
 * Sets the canonical URL for a group
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const groupId = formData.get("groupId") as string;
    const sourceUrl = formData.get("sourceUrl") as string;

    if (!groupId || !sourceUrl) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Update group canonical URL
    await prisma.dedupGroup.update({
      where: { id: groupId },
      data: { canonicalUrl: sourceUrl },
    });

    // Rebuild snapshot to reflect new canonical
    await rebuildGroupSnapshot(groupId).catch((e) =>
      console.warn("Failed to rebuild snapshot:", e),
    );

    // Redirect back to group detail page
    return NextResponse.redirect(new URL(`/admin/groups/${groupId}`, request.url));
  } catch (error) {
    console.error("Set canonical error:", error);
    return NextResponse.json({ error: "Failed to set canonical URL" }, { status: 500 });
  }
}
