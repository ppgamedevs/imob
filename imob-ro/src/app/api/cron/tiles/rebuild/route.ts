/**
 * Day 34: Tile Rebuild Cron Endpoint
 *
 * Endpoint: /api/cron/tiles/rebuild
 * Schedule: Weekly (Sundays at 3 AM UTC)
 *
 * Regenerates all area intelligence tiles with latest data
 */

import { NextResponse } from "next/server";

import { clearTileCache } from "@/lib/tiles/loader";
import { buildAreaTiles } from "@/scripts/build-area-tiles";

export async function GET() {
  const startTime = Date.now();

  try {
    console.log("[Cron] Starting tile rebuild...");

    // Run tile generation
    const metadata = await buildAreaTiles();

    // Clear tile cache to force reload of new tiles
    clearTileCache();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`[Cron] Tile rebuild completed in ${duration}s`);

    return NextResponse.json({
      success: true,
      message: "Tiles rebuilt successfully",
      duration: `${duration}s`,
      tileCount: metadata.tileCount,
      cellCount: metadata.cellCount,
      stats: metadata.stats,
      generated: metadata.generated,
    });
  } catch (error: any) {
    console.error("[Cron] Tile rebuild failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
      },
      { status: 500 },
    );
  }
}
