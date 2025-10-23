import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { rebuildGroupSnapshot } from "@/lib/dedup/snapshot";

export const runtime = "nodejs";

// Validation schema
const setCanonicalSchema = z.object({
  groupId: z.string().uuid("Invalid group ID"),
  sourceUrl: z.string().url("Invalid source URL"),
});

/**
 * POST /api/admin/groups/set-canonical
 * Sets the canonical URL for a group
 * Requires: Admin role
 */
export async function POST(request: NextRequest) {
  try {
    // Admin guard
    await requireAdmin();

    const formData = await request.formData();
    const groupId = formData.get("groupId") as string;
    const sourceUrl = formData.get("sourceUrl") as string;

    // Validate input
    const validated = setCanonicalSchema.parse({ groupId, sourceUrl });

    // Update group canonical URL
    await prisma.dedupGroup.update({
      where: { id: validated.groupId },
      data: { canonicalUrl: validated.sourceUrl },
    });

    // Rebuild snapshot to reflect new canonical
    await rebuildGroupSnapshot(validated.groupId).catch((e) =>
      console.warn("Failed to rebuild snapshot:", e),
    );

    // Redirect back to group detail page
    return NextResponse.redirect(new URL(`/admin/groups/${validated.groupId}`, request.url));
  } catch (error) {
    console.error("Set canonical error:", error);
    return NextResponse.json({ error: "Failed to set canonical URL" }, { status: 500 });
  }
}
