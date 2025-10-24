/**
 * Day 25 - Crawler Admin Dashboard
 * Shows crawler job statistics and recent errors
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export default async function CrawlAdminPage() {
  await requireAdmin();
  const [queued, running, errorJobs, recentFetches] = await Promise.all([
    prisma.crawlJob.count({ where: { status: "queued" } }),
    prisma.crawlJob.count({ where: { status: "running" } }),
    prisma.crawlJob.findMany({
      where: { status: "error" },
      orderBy: { doneAt: "desc" },
      take: 20,
    }),
    prisma.fetchLog.findMany({
      orderBy: { fetchedAt: "desc" },
      take: 50,
    }),
  ]);

  const successCount = recentFetches.filter((f) => f.statusCode && f.statusCode < 400).length;

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Crawler Dashboard</h1>
        <div className="text-sm text-muted-foreground">Day 25 - Crawler & Refresh v1</div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Queued Jobs" value={queued} variant="default" />
        <StatCard label="Running" value={running} variant="primary" />
        <StatCard label="Recent Errors" value={errorJobs.length} variant="destructive" />
        <StatCard
          label="Success Rate"
          value={`${successCount}/${recentFetches.length}`}
          variant="success"
        />
      </div>

      {/* Error Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Errors (Last 20)</CardTitle>
        </CardHeader>
        <CardContent>
          {errorJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No errors 🎉</p>
          ) : (
            <div className="space-y-2">
              {errorJobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{job.domain}</div>
                      <div className="text-xs text-muted-foreground truncate">{job.url}</div>
                      {job.lastError && (
                        <div className="mt-1 text-xs text-destructive line-clamp-2">
                          {job.lastError}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">{job.tries} tries</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Fetches */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Fetches (Last 50)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recentFetches.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between text-xs py-1 border-b last:border-0"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <StatusBadge status={log.statusCode} error={log.error} />
                  <span className="font-mono text-muted-foreground truncate">{log.domain}</span>
                </div>
                <div className="text-muted-foreground shrink-0">
                  {log.bytes ? `${(log.bytes / 1024).toFixed(1)}kb` : "-"}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: string | number;
  variant?: "default" | "primary" | "destructive" | "success";
}) {
  const colors = {
    default: "border",
    primary: "border-primary/50 bg-primary/5",
    destructive: "border-destructive/50 bg-destructive/5",
    success: "border-green-500/50 bg-green-500/5",
  };

  return (
    <div className={`border rounded-xl p-4 ${colors[variant || "default"]}`}>
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-bold">{String(value)}</div>
    </div>
  );
}

function StatusBadge({ status, error }: { status?: number | null; error?: string | null }) {
  if (error) {
    return (
      <span className="px-2 py-0.5 rounded text-xs bg-destructive/10 text-destructive">ERR</span>
    );
  }

  if (!status) {
    return <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">-</span>;
  }

  if (status < 300) {
    return (
      <span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-700">{status}</span>
    );
  }

  if (status < 400) {
    return (
      <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-700">{status}</span>
    );
  }

  return (
    <span className="px-2 py-0.5 rounded text-xs bg-destructive/10 text-destructive">{status}</span>
  );
}
