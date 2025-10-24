import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Cron Jobs Status - Admin",
};

const CRON_JOBS = [
  { name: "crawl-tick", description: "Process crawl queue", schedule: "Every 5 minutes" },
  { name: "crawl-seed", description: "Seed new URLs", schedule: "Hourly" },
  { name: "dedup-tick", description: "Deduplicate listings", schedule: "Every 15 minutes" },
  { name: "provenance-tick", description: "Assign provenance groups", schedule: "Hourly" },
  { name: "avm-train", description: "Train AVM model", schedule: "Daily at 2 AM" },
  { name: "tiles/rebuild", description: "Rebuild area tiles", schedule: "Weekly Sunday 3 AM" },
  { name: "revalidate-zones", description: "Revalidate zone pages", schedule: "Daily at midnight" },
  { name: "taste/decay", description: "Decay user taste profiles", schedule: "Daily at 4 AM" },
  { name: "saved-search", description: "Send saved search alerts", schedule: "Daily at 6 AM" },
];

async function getCronLogs() {
  const logs = await prisma.cronLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 100,
  });
  return logs;
}

type CronLogType = Awaited<ReturnType<typeof getCronLogs>>[number];

async function CronJobsTable() {
  await requireAdmin();
  const logs = await getCronLogs();

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Cron jobs monitoring dashboard - {logs.length} executions tracked
      </p>
    </div>
  );
}

export default async function CronStatusPage() {
  await requireAdmin();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Cron Jobs Status</h1>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <CronJobsTable />
      </Suspense>
    </div>
  );
}
