import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import { getCronStats } from "@/lib/obs/cron-tracker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Cron Jobs Status - Admin",
};

// Cron job configurations
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

  // Group logs by cron name
  const logsByName = logs.reduce(
    (acc: Record<string, CronLogType[]>, log: CronLogType) => {
      if (!acc[log.name]) acc[log.name] = [];
      acc[log.name].push(log);
      return acc;
    },
    {} as Record<string, CronLogType[]>,
  );

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">Last 100 runs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.length > 0
                ? (
                    (logs.filter((l: CronLogType) => l.status === "completed").length /
                      logs.length) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {logs.filter((l: CronLogType) => l.status === "completed").length} completed /{" "}
              {logs.filter((l: CronLogType) => l.status === "failed").length} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter((l: CronLogType) => l.duration).length > 0
                ? (
                    logs
                      .filter((l: CronLogType) => l.duration)
                      .reduce((sum: number, l: CronLogType) => sum + (l.duration || 0), 0) /
                    logs.filter((l: CronLogType) => l.duration).length /
                    1000
                  ).toFixed(1)
                : 0}
              s
            </div>
            <p className="text-xs text-muted-foreground">Completed jobs only</p>
          </CardContent>
        </Card>
      </div>

      {/* Cron Jobs Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CRON_JOBS.map((job) => {
          const jobLogs = logsByName[job.name] || [];
          const lastLog = jobLogs[0];
          const recentLogs = jobLogs.slice(0, 10);
          const successRate =
            recentLogs.length > 0
              ? (recentLogs.filter((l: CronLogType) => l.status === "completed").length /
                  recentLogs.length) *
                100
              : 0;

          return (
            <Card key={job.name}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{job.name}</CardTitle>
                  {lastLog && (
                    <Badge variant={lastLog.status === "completed" ? "default" : "destructive"}>
                      {lastLog.status}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">{job.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <div className="text-muted-foreground">Schedule: {job.schedule}</div>
                  {lastLog && (
                    <>
                      <div className="mt-2 text-muted-foreground">
                        Last run: {new Date(lastLog.startedAt).toLocaleString()}
                      </div>
                      {lastLog.duration && (
                        <div className="text-muted-foreground">
                          Duration: {(lastLog.duration / 1000).toFixed(1)}s
                        </div>
                      )}
                      {lastLog.error && (
                        <div className="mt-2 text-xs text-destructive">
                          Error: {lastLog.error.substring(0, 100)}
                          {lastLog.error.length > 100 && "..."}
                        </div>
                      )}
                    </>
                  )}
                  {!lastLog && <div className="mt-2 text-muted-foreground">Never executed</div>}
                </div>
                {recentLogs.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      Last 10 runs: {successRate.toFixed(0)}% success
                    </div>
                    <div className="mt-1 flex gap-1">
                      {recentLogs.map((log: CronLogType) => (
                        <div
                          key={log.id}
                          className={`h-2 w-2 rounded-full ${
                            log.status === "completed"
                              ? "bg-green-500"
                              : log.status === "failed"
                                ? "bg-red-500"
                                : "bg-yellow-500"
                          }`}
                          title={`${log.status} - ${new Date(log.startedAt).toLocaleString()}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Executions Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
          <CardDescription>Last 20 cron job runs across all jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs.slice(0, 20).map((log: CronLogType) => (
              <div
                key={log.id}
                className="flex items-center justify-between border-b pb-2 last:border-0"
              >
                <div className="flex-1">
                  <div className="font-medium">{log.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(log.startedAt).toLocaleString()}
                    {log.duration && ` • ${(log.duration / 1000).toFixed(1)}s`}
                  </div>
                  {log.error && (
                    <div className="mt-1 text-xs text-destructive">
                      {log.error.substring(0, 150)}
                      {log.error.length > 150 && "..."}
                    </div>
                  )}
                </div>
                <Badge
                  variant={
                    log.status === "completed"
                      ? "default"
                      : log.status === "failed"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {log.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function CronStatusPage() {
  await requireAdmin();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cron Jobs Status</h1>
            <p className="text-muted-foreground">Monitor background job execution and health</p>
          </div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
            ← Back to Admin
          </Link>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex h-32 items-center justify-center">
            <div className="text-muted-foreground">Loading cron status...</div>
          </div>
        }
      >
        <CronJobsTable />
      </Suspense>
    </div>
  );
}
