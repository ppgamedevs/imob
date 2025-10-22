import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { rebuildGroupSnapshot } from "@/lib/dedup/snapshot";

export const runtime = "nodejs";

/**
 * POST /api/admin/groups/split
 * Splits an analysis out from its current group into a new adhoc group
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const groupId = formData.get("groupId") as string;
    const analysisId = formData.get("analysisId") as string;

    if (!groupId || !analysisId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Get the analysis
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      include: { featureSnapshot: true },
    });

    if (!analysis || analysis.groupId !== groupId) {
      return NextResponse.json({ error: "Analysis not found in group" }, { status: 404 });
    }

    // Create a new adhoc group for this analysis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f = (analysis.featureSnapshot as any)?.features ?? {};
    const newGroup = await prisma.dedupGroup.create({
      data: {
        signature: `adhoc:${analysisId}`,
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
      where: { id: analysisId },
      data: { groupId: newGroup.id },
    });

    // Remove old edge, create new edge
    await prisma.dedupEdge.deleteMany({
      where: { groupId, analysisId },
    });

    await prisma.dedupEdge.create({
      data: {
        groupId: newGroup.id,
        analysisId,
        score: 0.5,
        reason: { type: "manual_split" },
      },
    });

    // Rebuild snapshots for both groups
    await Promise.all([
      rebuildGroupSnapshot(groupId).catch((e) =>
        console.warn("Failed to rebuild old group snapshot:", e),
      ),
      rebuildGroupSnapshot(newGroup.id).catch((e) =>
        console.warn("Failed to rebuild new group snapshot:", e),
      ),
    ]);

    // Update old group itemCount
    const remainingCount = await prisma.analysis.count({
      where: { groupId },
    });
    await prisma.dedupGroup.update({
      where: { id: groupId },
      data: { itemCount: remainingCount },
    });

    // Redirect back to the original group
    return NextResponse.redirect(new URL(`/admin/groups/${groupId}`, request.url));
  } catch (error) {
    console.error("Split error:", error);
    return NextResponse.json({ error: "Failed to split analysis from group" }, { status: 500 });
  }
}
