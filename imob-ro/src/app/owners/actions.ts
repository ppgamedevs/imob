"use server";

import { redirect } from "next/navigation";

import { startAnalysis, upsertAnalysisByUrl } from "@/lib/analysis";
import { prisma } from "@/lib/db";

export async function createOwnerDraft(prevState: any, formData: FormData) {
  const input = formData.get("input") as string;
  const areaM2Str = formData.get("areaM2") as string;
  const areaM2 = areaM2Str ? parseInt(areaM2Str, 10) : undefined;

  if (!input || input.trim().length < 3) {
    return { error: "Te rugăm să introduci o adresă sau un link valid." };
  }

  try {
    // Determine if input is URL or address
    const isUrl =
      input.startsWith("http://") || input.startsWith("https://") || input.includes(".");

    let analysis;

    if (isUrl) {
      // Create or reuse analysis for URL
      analysis = await upsertAnalysisByUrl(input, null);

      // Trigger analysis if queued
      if (analysis.status === "queued") {
        await startAnalysis(analysis.id, input);
      }
    } else {
      // Create minimal analysis for address-only
      const normalizedAddress = input.trim();

      // Check if we already have an analysis for this address
      const existing = await prisma.analysis.findFirst({
        where: {
          extractedListing: {
            addressRaw: normalizedAddress,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        analysis = existing;
      } else {
        // Create new analysis with minimal extracted listing
        analysis = await prisma.analysis.create({
          data: {
            sourceUrl: `address:${normalizedAddress}`,
            status: "done",
            extractedListing: {
              create: {
                addressRaw: normalizedAddress,
                areaM2: areaM2 ?? null,
              },
            },
          },
        });

        // TODO: Attempt geocoding and AVM estimation
        // For now, we create a minimal entry
      }
    }

    // Create owner draft if doesn't exist
    let draft = await prisma.ownerDraft.findUnique({
      where: { analysisId: analysis.id },
    });

    if (!draft) {
      draft = await prisma.ownerDraft.create({
        data: {
          analysisId: analysis.id,
          status: "draft",
        },
      });
    }

    // Redirect to owner dashboard
    redirect(`/owners/${analysis.id}`);
  } catch (error: any) {
    console.error("createOwnerDraft error:", error);
    return {
      error: "A apărut o eroare. Te rugăm să încerci din nou.",
    };
  }
}
