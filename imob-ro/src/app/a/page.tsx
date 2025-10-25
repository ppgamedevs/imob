import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/a/auth";
import { deleteSession } from "@/lib/a/auth";
import { getQuotaUsage } from "@/lib/a/quotas";
import { prisma } from "@/lib/db";

async function signOut() {
  "use server";
  await deleteSession();
  redirect("/a/signin");
}

export default async function AgentHomePage() {
  const session = await requireSession();

  // Get quota usage
  const quotas = await getQuotaUsage(session.email);

  // Get recent jobs
  const recentJobs = await prisma.bulkAnalysisJob.findMany({
    where: { agentEmail: session.email },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Get total analyses count
  const totalAnalyses = await prisma.bulkAnalysisItem.count({
    where: {
      job: {
        agentEmail: session.email,
      },
      status: "done",
    },
  });

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Agent Workspace</h1>
          <p className="text-gray-400">{session.email}</p>
          {session.orgName && <p className="text-sm text-gray-500">{session.orgName}</p>}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/a/brand">Brand Settings</Link>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="ghost">
              Sign Out
            </Button>
          </form>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/5 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Analyses</h3>
          <p className="text-3xl font-bold">{totalAnalyses}</p>
        </div>

        <div className="bg-white/5 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Today&apos;s Usage</h3>
          <p className="text-3xl font-bold">
            {quotas.dailyUsed}
            <span className="text-lg text-gray-500"> / {quotas.dailyLimit}</span>
          </p>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-1">
            <div
              className="bg-green-500 h-1 rounded-full"
              style={{
                width: `${(quotas.dailyUsed / quotas.dailyLimit) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Storage Used</h3>
          <p className="text-3xl font-bold">
            {quotas.totalUsed}
            <span className="text-lg text-gray-500"> / {quotas.totalLimit}</span>
          </p>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full"
              style={{
                width: `${(quotas.totalUsed / quotas.totalLimit) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Button asChild size="lg" className="h-24">
          <Link href="/a/upload">
            <div>
              <div className="text-lg font-semibold">Bulk Analyzer</div>
              <div className="text-sm opacity-80">Upload URLs or CSV</div>
            </div>
          </Link>
        </Button>

        <Button asChild size="lg" variant="outline" className="h-24">
          <Link href="/a/portfolio">
            <div>
              <div className="text-lg font-semibold">Portfolio</div>
              <div className="text-sm opacity-80">View all listings</div>
            </div>
          </Link>
        </Button>

        <Button asChild size="lg" variant="outline" className="h-24">
          <Link href="/a/reports">
            <div>
              <div className="text-lg font-semibold">Reports</div>
              <div className="text-sm opacity-80">Saved shares & PDFs</div>
            </div>
          </Link>
        </Button>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white/5 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Jobs</h2>
        {recentJobs.length === 0 ? (
          <p className="text-gray-400">No jobs yet. Start by uploading URLs.</p>
        ) : (
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 rounded bg-white/5"
              >
                <div>
                  <div className="font-medium">
                    {job.total} listings
                    <span
                      className={`ml-3 text-sm ${
                        job.status === "completed"
                          ? "text-green-400"
                          : job.status === "failed"
                            ? "text-red-400"
                            : "text-blue-400"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(job.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  {job.done} done · {job.failed} failed
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
