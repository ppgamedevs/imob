/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "./db";
import { Extracted, maybeFetchServer } from "./extractors";
import { applyAvmToAnalysis } from "./ml/apply-avm";
import { applyTtsToAnalysis } from "./ml/apply-tts";
import { updateFeatureSnapshot } from "./normalize-pipeline";

// Helper: load analysis including snapshots for SSR
export async function getAnalysis(id: string) {
  return prisma.analysis.findUnique({
    where: { id },
    include: {
      extractedListing: true,
      featureSnapshot: true,
      scoreSnapshot: true,
    },
  });
}

// Helper: reuse analysis for same URL in last 7 days, otherwise create queued
export async function upsertAnalysisByUrl(sourceUrl: string, userId?: string | null) {
  const recent = await prisma.analysis.findFirst({
    where: { sourceUrl },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < 7 * 24 * 3600 * 1000) {
    return recent;
  }
  return prisma.analysis.create({ data: { userId: userId ?? null, sourceUrl, status: "queued" } });
}

/**
 * Placeholder startAnalysis worker.
 * In production this would enqueue a job or trigger the analyzer.
 */
export async function startAnalysis(analysisId: string, url: string) {
  // minimal placeholder: mark as started then completed after a short delay
  try {
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { status: "running" },
    });
    console.log(`startAnalysis: ${analysisId} -> ${url}`);

    // Wait up to 5s for a client-pushed ExtractedListing
    const deadline = Date.now() + 5000;
    let extracted: Extracted | null = null;
    while (Date.now() < deadline) {
      // Prisma returns any-typed records; cast to Extracted-like shape when present

      extracted = (await prisma.extractedListing.findUnique({ where: { analysisId } })) as any;
      if (extracted) break;
      // sleep 500ms
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!extracted) {
      // try server-side fetch/extract if the domain is whitelisted
      const serverData: Extracted | null = await maybeFetchServer(url);
      if (serverData) {
        // upsert ExtractedListing
        await prisma.extractedListing.upsert({
          where: { analysisId },
          create: {
            analysisId,
            title: serverData.title || undefined,
            price: serverData.price || undefined,
            currency: serverData.currency || undefined,
            areaM2: serverData.areaM2 || undefined,
            rooms: serverData.rooms || undefined,
            addressRaw: serverData.addressRaw || undefined,
          },
          update: {
            title: serverData.title || undefined,
            price: serverData.price || undefined,
            currency: serverData.currency || undefined,
            areaM2: serverData.areaM2 || undefined,
            rooms: serverData.rooms || undefined,
            addressRaw: serverData.addressRaw || undefined,
          },
        });

        // Day 20: Log provenance (Sight + PhotoAssets)
        try {
          const { logSight, logPhotoAssets } = await import("./provenance/ingest");
          await logSight(analysisId, url);
          await logPhotoAssets(analysisId);
        } catch (e) {
          console.warn("provenance ingestion failed", e);
        }

        // Run the normalization pipeline and persist the snapshot
        try {
          await prisma.analysis.update({
            where: { id: analysisId },
            data: { status: "normalizing" },
          });
          await updateFeatureSnapshot(analysisId);
          await prisma.analysis.update({ where: { id: analysisId }, data: { status: "scoring" } });

          // apply AVM and persist score snapshot
          try {
            const fsnap = await prisma.featureSnapshot.findUnique({
              where: { analysisId },
              select: { features: true },
            });
            if (fsnap?.features) {
              await applyAvmToAnalysis(analysisId, fsnap.features as any);
              try {
                await applyTtsToAnalysis(analysisId, fsnap.features as any);
              } catch (e) {
                console.warn("applyTtsToAnalysis failed", e);
              }
              try {
                // yield depends on est rent and price; compute and persist
                const { applyYieldToAnalysis } = await import("./ml/apply-yield");
                await applyYieldToAnalysis(analysisId, fsnap.features as any);
                try {
                  const { applySeismicToAnalysis } = await import("./risk/apply-seismic");
                  await applySeismicToAnalysis(analysisId, fsnap.features as any);
                  try {
                    const { applyCompsToAnalysis } = await import("./comps/apply-comps");
                    await applyCompsToAnalysis(analysisId);
                    try {
                      const { applyQualityToAnalysis } = await import("./quality/apply-quality");
                      await applyQualityToAnalysis(analysisId);
                      // Day 19: Attach to dedup group after all analysis complete
                      try {
                        const { attachToGroup } = await import("./dedup/group");
                        await attachToGroup(analysisId);
                      } catch (e) {
                        console.warn("attachToGroup failed", e);
                      }
                      // Day 20: Build provenance timeline + trust score
                      try {
                        const { rebuildProvenance } = await import("./provenance/build-events");
                        const { findReusedPhotos } = await import("./provenance/photo-reuse");
                        const { computeTrustScore } = await import("./provenance/trust");

                        await rebuildProvenance(analysisId);

                        // Check for photo reuse
                        const reused = await findReusedPhotos(analysisId);
                        if (reused.length > 0) {
                          await prisma.provenanceEvent.create({
                            data: {
                              analysisId,
                              kind: "PHOTO_REUSED",
                              payload: { matches: reused } as never,
                            },
                          });
                        }

                        await computeTrustScore(analysisId);
                      } catch (e) {
                        console.warn("provenance computation failed", e);
                      }
                    } catch (e) {
                      console.warn("applyQualityToAnalysis failed", e);
                    }
                  } catch (e) {
                    console.warn("applyCompsToAnalysis failed", e);
                  }
                } catch (e) {
                  console.warn("applySeismicToAnalysis failed", e);
                }
              } catch (e) {
                console.warn("applyYieldToAnalysis failed", e);
              }
            }
          } catch (e) {
            console.warn("applyAvmToAnalysis failed", e);
          }
        } catch (err) {
          console.warn("updateFeatureSnapshot failed", err);
        }
      }
    } else {
      // If a client provided extracted listing exists, run the normalization pipeline
      // Day 20: Log provenance first (Sight + PhotoAssets)
      try {
        const { logSight, logPhotoAssets } = await import("./provenance/ingest");
        await logSight(analysisId, url);
        await logPhotoAssets(analysisId);
      } catch (e) {
        console.warn("provenance ingestion failed", e);
      }

      try {
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { status: "normalizing" },
        });
        await updateFeatureSnapshot(analysisId);
        await prisma.analysis.update({ where: { id: analysisId }, data: { status: "scoring" } });
        try {
          const fsnap = await prisma.featureSnapshot.findUnique({
            where: { analysisId },
            select: { features: true },
          });
          if (fsnap?.features) {
            await applyAvmToAnalysis(analysisId, fsnap.features as any);
            try {
              await applyTtsToAnalysis(analysisId, fsnap.features as any);
            } catch (e) {
              console.warn("applyTtsToAnalysis failed", e);
            }
            try {
              const { applyYieldToAnalysis } = await import("./ml/apply-yield");
              await applyYieldToAnalysis(analysisId, fsnap.features as any);
              try {
                const { applySeismicToAnalysis } = await import("./risk/apply-seismic");
                await applySeismicToAnalysis(analysisId, fsnap.features as any);
                try {
                  const { applyCompsToAnalysis } = await import("./comps/apply-comps");
                  await applyCompsToAnalysis(analysisId);
                  try {
                    const { applyQualityToAnalysis } = await import("./quality/apply-quality");
                    await applyQualityToAnalysis(analysisId);
                    // Day 19: Attach to dedup group after all analysis complete
                    try {
                      const { attachToGroup } = await import("./dedup/group");
                      await attachToGroup(analysisId);
                    } catch (e) {
                      console.warn("attachToGroup failed", e);
                    }
                    // Day 20: Build provenance timeline + trust score
                    try {
                      const { rebuildProvenance } = await import("./provenance/build-events");
                      const { findReusedPhotos } = await import("./provenance/photo-reuse");
                      const { computeTrustScore } = await import("./provenance/trust");

                      await rebuildProvenance(analysisId);

                      // Check for photo reuse
                      const reused = await findReusedPhotos(analysisId);
                      if (reused.length > 0) {
                        await prisma.provenanceEvent.create({
                          data: {
                            analysisId,
                            kind: "PHOTO_REUSED",
                            payload: { matches: reused } as never,
                          },
                        });
                      }

                      await computeTrustScore(analysisId);
                    } catch (e) {
                      console.warn("provenance computation failed", e);
                    }
                  } catch (e) {
                    console.warn("applyQualityToAnalysis failed", e);
                  }
                } catch (e) {
                  console.warn("applyCompsToAnalysis failed", e);
                }
              } catch (e) {
                console.warn("applySeismicToAnalysis failed", e);
              }
            } catch (e) {
              console.warn("applyYieldToAnalysis failed", e);
            }
          }
        } catch (e) {
          console.warn("applyAvmToAnalysis failed", e);
        }
      } catch (e) {
        console.warn("updateFeatureSnapshot failed", e);
      }
    }

    // Simulate finishing work: mark as done after short delay
    setTimeout(async () => {
      try {
        await prisma.analysis.update({ where: { id: analysisId }, data: { status: "done" } });
      } catch (e) {
        console.error("Error finishing analysis", analysisId, e);
        await prisma.analysis.update({ where: { id: analysisId }, data: { status: "failed" } });
      }
    }, 2000);
  } catch (e) {
    console.error("startAnalysis error", e);
    await prisma.analysis.update({ where: { id: analysisId }, data: { status: "failed" } });
  }
}
