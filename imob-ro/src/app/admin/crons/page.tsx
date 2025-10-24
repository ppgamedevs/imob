import { Suspense } from "react";

import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Cron Jobs Status - Admin",
};

async function getCronLogs() {
  const logs = await prisma.cronLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  return logs;
}

async function CronLogsTable() {
  const logs = await getCronLogs();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Recent Executions ({logs.length})</h2>
      <div className="text-sm text-muted-foreground">
        <p>Cron jobs monitoring dashboard</p>
        <p>Last 50 executions tracked</p>
      </div>
    </div>
  );
}

export default async function CronJobsPage() {
  await requireAdmin();

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cron Jobs Status</h1>
      </div>

      <Suspense fallback={<div>Loading cron logs...</div>}>
        <CronLogsTable />
      </Suspense>
    </div>
  );
}
