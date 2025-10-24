import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Admin Dashboard",
};

export default async function AdminHomePage() {
  await requireAdmin();

  // Get stats for last 24h
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    analysesLast24h,
    groupsCreatedToday,
    failedAnalyses,
    totalGroups,
    totalAnalyses,
    recentCronLogs,
    recentAnalyses,
  ] = await Promise.all([
    prisma.analysis.count({
      where: { createdAt: { gte: yesterday } },
    }),
    prisma.dedupGroup.count({
      where: { createdAt: { gte: yesterday } },
    }),
    prisma.analysis.count({
      where: {
        status: "error",
        createdAt: { gte: yesterday },
      },
    }),
    prisma.dedupGroup.count(),
    prisma.analysis.count(),
    prisma.cronLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 5,
      select: {
        id: true,
        cronName: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        error: true,
      },
    }),
    prisma.analysis.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        createdAt: true,
        sourceUrl: true,
        extractedListing: {
          select: { title: true },
        },
      },
    }),
  ]);

  const successRate =
    analysesLast24h > 0
      ? (((analysesLast24h - failedAnalyses) / analysesLast24h) * 100).toFixed(1)
      : "100.0";

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and quick access</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Analyses (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analysesLast24h}</div>
            <p className="text-xs text-muted-foreground mt-1">{successRate}% success rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              New Groups (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{groupsCreatedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">{totalGroups} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed Analyses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{failedAnalyses}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Analyses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAnalyses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/groups">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Dedup Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage duplicate groups, set canonical URLs, split members
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/crawl">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Crawler Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Monitor crawl queue, job statuses, and fetch logs
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/crons">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Cron Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View cron execution history and monitor scheduled tasks
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/extractors">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Extractors</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage extraction profiles for different listing sources
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/owners">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Owner Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Review and manage seller leads and contact requests
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/flags">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Toggle experimental features and A/B tests
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Cron Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Cron Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentCronLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent cron executions</p>
            ) : (
              recentCronLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        log.status === "success"
                          ? "bg-green-500"
                          : log.status === "error"
                            ? "bg-red-500"
                            : "bg-yellow-500"
                      }`}
                    />
                    <div>
                      <div className="font-medium text-sm">{log.cronName}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.startedAt).toLocaleString()}
                        {log.finishedAt &&
                          ` • ${Math.round((new Date(log.finishedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)}s`}
                      </div>
                      {log.error && (
                        <div className="text-xs text-destructive mt-1">{log.error}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-medium capitalize">{log.status}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Analyses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Analyses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentAnalyses.map((analysis) => (
              <Link
                key={analysis.id}
                href={`/report/${analysis.id}`}
                className="block p-3 border rounded hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {analysis.extractedListing?.title || "Untitled"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(analysis.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      analysis.status === "done"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : analysis.status === "error"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}
                  >
                    {analysis.status}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
