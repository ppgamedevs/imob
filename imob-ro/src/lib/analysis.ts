import { prisma } from "./db";

/**
 * Placeholder startAnalysis worker.
 * In production this would enqueue a job or trigger the analyzer.
 */
export async function startAnalysis(analysisId: string, url: string) {
  // minimal placeholder: mark as started then completed after a short delay
  try {
    await prisma.analysis.update({ where: { id: analysisId }, data: { status: "running" } });
    console.log(`startAnalysis: ${analysisId} -> ${url}`);

    // Simulate background work (non-blocking caller should not await this long)
    setTimeout(async () => {
      try {
        await prisma.analysis.update({ where: { id: analysisId }, data: { status: "completed" } });
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
