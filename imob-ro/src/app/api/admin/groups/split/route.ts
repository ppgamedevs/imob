import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { rebuildGroupSnapshot } from "@/lib/dedup/snapshot";

export const runtime = "nodejs";

// Validation schema
const splitGroupSchema = z.object({
  groupId: z.string().uuid("Invalid group ID"),
  analysisId: z.string().uuid("Invalid analysis ID"),
});

/**
 * POST /api/admin/groups/split
 * Splits an analysis out from its current group into a new adhoc group
 * Requires: Admin role
 */
export async function POST(request: NextRequest) {
  try {
    // Admin guard
    await requireAdmin();

    const formData = await request.formData();
    const groupId = formData.get("groupId") as string;
    const analysisId = formData.get("analysisId") as string;

    // Validate input
    const validated = splitGroupSchema.parse({ groupId, analysisId });

    // Get the analysis
    const analysis = await prisma.analysis.findUnique({
      where: { id: validated.analysisId },
      include: { featureSnapshot: true },
    });

    if (!analysis || analysis.groupId !== validated.groupId) {
      return NextResponse.json({ error: "Analysis not found in group" }, { status: 404 });
    }

    // Create a new adhoc group for this analysis

    const f = (analysis.featureSnapshot as any)?.features ?? {};
    const newGroup = await prisma.dedupGroup.create({
      data: {
        signature: `adhoc:${validated.analysisId}`,
        city: f.city ?? null,
        areaSlug: f.areaSlug ?? null,
        centroidLat: f.lat ?? null,
        centroidLng: f.lng ?? null,
        canonicalUrl: analysis.sourceUrl ?? undefined,
        itemCount: 1,
      },
    });

    // Move the analysis to the new group
    await prisma.analysis.update({
      where: { id: validated.analysisId },
      data: { groupId: newGroup.id },
    });

    // Remove old edge, create new edge
    await prisma.dedupEdge.deleteMany({
      where: { groupId: validated.groupId, analysisId: validated.analysisId },
    });

    await prisma.dedupEdge.create({
      data: {
        groupId: newGroup.id,
        analysisId: validated.analysisId,
        score: 0.5,
        reason: { type: "manual_split" },
      },
    });

    // Rebuild snapshots for both groups
    await Promise.all([
      rebuildGroupSnapshot(validated.groupId).catch((e) =>
        console.warn("Failed to rebuild old group snapshot:", e),
      ),
      rebuildGroupSnapshot(newGroup.id).catch((e) =>
        console.warn("Failed to rebuild new group snapshot:", e),
      ),
    ]);

    // Update old group itemCount
    const remainingCount = await prisma.analysis.count({
      where: { groupId: validated.groupId },
    });
    await prisma.dedupGroup.update({
      where: { id: validated.groupId },
      data: { itemCount: remainingCount },
    });

    // Redirect back to the original group
    return NextResponse.redirect(new URL(`/admin/groups/${validated.groupId}`, request.url));
  } catch (error) {
    console.error("Split error:", error);
    return NextResponse.json({ error: "Failed to split analysis from group" }, { status: 500 });
  }
}
