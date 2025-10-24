/**
 * Backup Cron Job
 *
 * Runs daily to create database backups with configurable retention:
 * - Recent backups: 7-day retention (daily snapshots)
 * - Monthly backups: 30-day retention (kept on 1st of month)
 *
 * Storage: Vercel Blob or local filesystem (configurable via env)
 *
 * Usage: POST /api/cron/backup
 * Headers: Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { createLogger } from "@/lib/obs/logger";
import { withCronTracking } from "@/lib/obs/cron-tracker";

// Simple backup to JSON (for databases without native export tools)
async function exportDatabaseToJSON() {
  const logger = createLogger({ name: "backup-export" });

  const data: Record<string, any> = {};

  // Export core tables (add more as needed)
  // Note: Large tables like Listing/Analysis are kept minimal for backup size
  const tables = [
    { name: "User", model: prisma.user },
    { name: "Area", model: prisma.area },
    { name: "SavedSearch", model: prisma.savedSearch },
    { name: "WatchItem", model: prisma.watchItem },
    { name: "CompareSet", model: prisma.compareSet },
    { name: "OwnerLead", model: prisma.ownerLead },
    { name: "ApiKey", model: prisma.apiKey },
  ];

  for (const { name, model } of tables) {
    try {
      // @ts-expect-error - Dynamic model access
      data[name] = await model.findMany();
      logger.info({ table: name, count: data[name].length }, `Exported ${name}`);
    } catch (err) {
      logger.error({ table: name, error: err }, `Failed to export ${name}`);
      throw err;
    }
  }

  // Add metadata
  data._metadata = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    tables: tables.map((t) => t.name),
  };

  logger.info({ totalTables: tables.length }, "Database export complete");
  return data;
}

// Save backup to storage
async function saveBackup(data: any, isMonthly: boolean) {
  const logger = createLogger({ name: "backup-save" });
  const timestamp = new Date().toISOString().replace(/:/g, "-");
  const prefix = isMonthly ? "monthly" : "daily";
  const filename = `${prefix}-backup-${timestamp}.json`;

  const storageUrl = process.env.BACKUP_STORAGE_URL;

  if (!storageUrl || storageUrl === "local" || storageUrl.startsWith("file://")) {
    // Local filesystem backup (development only)
    const fs = await import("fs/promises");
    const path = await import("path");

    const backupDir = path.join(process.cwd(), "backups", prefix);
    await fs.mkdir(backupDir, { recursive: true });

    const filepath = path.join(backupDir, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));

    logger.info({ filepath, size: JSON.stringify(data).length }, "Saved to local filesystem");
    return { url: filepath, size: JSON.stringify(data).length };
  }

  if (storageUrl.startsWith("blob:") || storageUrl.includes("vercel")) {
    // Vercel Blob storage
    const { put } = await import("@vercel/blob");

    const blob = await put(filename, JSON.stringify(data), {
      access: "public",
      addRandomSuffix: false,
    });

    const dataSize = JSON.stringify(data).length;
    logger.info({ url: blob.url, size: dataSize }, "Saved to Vercel Blob");
    return { url: blob.url, size: dataSize };
  }

  throw new Error(`Unsupported storage URL: ${storageUrl}`);
}

// Cleanup old backups
async function cleanupOldBackups() {
  const logger = createLogger({ name: "backup-cleanup" });
  const storageUrl = process.env.BACKUP_STORAGE_URL;
  const dailyRetentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || "7");
  const monthlyRetentionDays = parseInt(process.env.BACKUP_MONTHLY_RETENTION_DAYS || "30");

  if (!storageUrl || storageUrl === "local" || storageUrl.startsWith("file://")) {
    // Local filesystem cleanup
    const fs = await import("fs/promises");
    const path = await import("path");

    const backupDir = path.join(process.cwd(), "backups");

    try {
      const types = ["daily", "monthly"];
      let totalDeleted = 0;

      for (const type of types) {
        const dir = path.join(backupDir, type);
        const retentionDays = type === "daily" ? dailyRetentionDays : monthlyRetentionDays;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        try {
          const files = await fs.readdir(dir);

          for (const file of files) {
            if (!file.endsWith(".json")) continue;

            const filepath = path.join(dir, file);
            const stats = await fs.stat(filepath);

            if (stats.mtime < cutoffDate) {
              await fs.unlink(filepath);
              totalDeleted++;
              logger.info(
                { file, age: Math.floor((Date.now() - stats.mtime.getTime()) / 86400000) },
                "Deleted old backup",
              );
            }
          }
        } catch (err: any) {
          if (err.code !== "ENOENT") throw err;
        }
      }

      logger.info({ deleted: totalDeleted }, "Cleanup complete");
      return { deleted: totalDeleted };
    } catch (err) {
      logger.error({ error: err }, "Cleanup failed");
      throw err;
    }
  }

  if (storageUrl.startsWith("blob:") || storageUrl.includes("vercel")) {
    // Vercel Blob cleanup
    const { list, del } = await import("@vercel/blob");

    const dailyCutoff = new Date();
    dailyCutoff.setDate(dailyCutoff.getDate() - dailyRetentionDays);

    const monthlyCutoff = new Date();
    monthlyCutoff.setDate(monthlyCutoff.getDate() - monthlyRetentionDays);

    const { blobs } = await list();
    let deleted = 0;

    for (const blob of blobs) {
      const isMonthly = blob.pathname.startsWith("monthly-");
      const cutoff = isMonthly ? monthlyCutoff : dailyCutoff;

      if (blob.uploadedAt && new Date(blob.uploadedAt) < cutoff) {
        await del(blob.url);
        deleted++;
        logger.info({ file: blob.pathname, uploadedAt: blob.uploadedAt }, "Deleted old backup");
      }
    }

    logger.info({ deleted }, "Cleanup complete");
    return { deleted };
  }

  throw new Error(`Unsupported storage URL: ${storageUrl}`);
}

// Main backup handler
async function runBackup() {
  const logger = createLogger({ name: "backup" });

  // Check if this is the 1st of the month (monthly backup)
  const now = new Date();
  const isMonthly = now.getDate() === 1;

  logger.info({ isMonthly, date: now.toISOString() }, "Starting backup");

  // Export database
  const data = await exportDatabaseToJSON();

  // Save backup
  const result = await saveBackup(data, isMonthly);

  // Cleanup old backups
  const cleanup = await cleanupOldBackups();

  logger.info(
    {
      backupType: isMonthly ? "monthly" : "daily",
      url: result.url,
      size: result.size,
      deleted: cleanup.deleted,
    },
    "Backup complete",
  );

  return {
    success: true,
    type: isMonthly ? "monthly" : "daily",
    url: result.url,
    size: result.size,
    tablesExported: data._metadata.tables.length,
    oldBackupsDeleted: cleanup.deleted,
  };
}

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Run with tracking
  const result = await withCronTracking("backup", async () => {
    return await runBackup();
  });

  return NextResponse.json(result);
}
