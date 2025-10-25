"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Generate or retrieve share link for owner dashboard
 */
export async function generateShareLink(analysisId: string) {
  try {
    const draft = await prisma.ownerDraft.findUnique({
      where: { analysisId },
    });

    if (!draft) {
      return { error: "Draft not found" };
    }

    // Update status to shared
    await prisma.ownerDraft.update({
      where: { id: draft.id },
      data: { status: "shared" },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/owners/${analysisId}/share?token=${draft.shareToken}`;

    return {
      shareToken: draft.shareToken,
      shareUrl,
    };
  } catch (error) {
    console.error("generateShareLink error:", error);
    return { error: "Failed to generate share link" };
  }
}

/**
 * Toggle ROI fix selection
 */
export async function toggleRoiFix(analysisId: string, fixId: string, selected: boolean) {
  try {
    const draft = await prisma.ownerDraft.findUnique({
      where: { analysisId },
    });

    if (!draft) {
      return { error: "Draft not found" };
    }

    // Get current toggles
    const currentToggles = (draft.roiToggles as Record<string, boolean> | null) ?? {};

    // Update toggle
    const newToggles = {
      ...currentToggles,
      [fixId]: selected,
    };

    // Save to database
    await prisma.ownerDraft.update({
      where: { id: draft.id },
      data: { roiToggles: newToggles },
    });

    // Revalidate the page to update Pre-Market Score
    revalidatePath(`/owners/${analysisId}`);

    return { success: true };
  } catch (error) {
    console.error("toggleRoiFix error:", error);
    return { error: "Failed to toggle fix" };
  }
}

/**
 * Update owner contact information
 */
export async function updateOwnerContact(
  analysisId: string,
  data: {
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    addressNote?: string;
  },
) {
  try {
    await prisma.ownerDraft.update({
      where: { analysisId },
      data,
    });

    revalidatePath(`/owners/${analysisId}`);

    return { success: true };
  } catch (error) {
    console.error("updateOwnerContact error:", error);
    return { error: "Failed to update contact info" };
  }
}
