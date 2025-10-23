import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

async function getWidgetStats() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return null;
  }

  // Last 30 days stats
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Total widget loads
  const totalLoads = await prisma.embedUsage.count();

  // Loads in last 30 days
  const recentLoads = await prisma.embedUsage.count({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  });

  // Widget type breakdown
  const widgetTypes = await prisma.embedUsage.groupBy({
    by: ['widgetType'],
    _count: true,
    orderBy: {
      _count: {
        widgetType: 'desc',
      },
    },
  });

  // Top referring domains
  const topDomains = await prisma.embedUsage.groupBy({
    by: ['domain'],
    _count: true,
    orderBy: {
      _count: {
        domain: 'desc',
      },
    },
    take: 10,
    where: {
      domain: {
        not: null,
      },
    },
  });

  // Recent loads
  const recentLoadsData = await prisma.embedUsage.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  });

  // Daily loads for chart (last 30 days)
  const dailyLoads = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
    SELECT 
      DATE(createdAt) as date,
      COUNT(*) as count
    FROM EmbedUsage
    WHERE createdAt >= ${thirtyDaysAgo}
    GROUP BY DATE(createdAt)
    ORDER BY date DESC
  `;

  return {
    totalLoads,
    recentLoads,
    widgetTypes,
    topDomains,
    recentLoadsData,
    dailyLoads: dailyLoads.map(d => ({ date: d.date, count: Number(d.count) })),
  };
}

export default async function WidgetAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/auth/signin');
  }

  const stats = await getWidgetStats();
  if (!stats) {
    redirect('/auth/signin');
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Widget Analytics</h1>
        <p className="text-muted-foreground">
          Track widget embeds and referrer domains
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Widget Loads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalLoads.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.recentLoads.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unique Domains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.topDomains.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Widget Type Breakdown */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Widget Type Breakdown</CardTitle>
          <CardDescription>Distribution of AVM vs Heatmap widget loads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.widgetTypes.map((type) => (
              <div key={type.widgetType} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={type.widgetType === 'avm' ? 'default' : 'secondary'}>
                    {type.widgetType.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-48 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${(type._count / stats.totalLoads) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="font-semibold w-20 text-right">
                    {type._count.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground w-12 text-right">
                    {Math.round((type._count / stats.totalLoads) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Referring Domains */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Top Referring Domains</CardTitle>
          <CardDescription>Domains with the most widget embeds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.topDomains.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No domain data yet. Widgets will be tracked once embedded.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Domain</th>
                      <th className="text-right py-2 font-medium">Loads</th>
                      <th className="text-right py-2 font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topDomains.map((domain, index) => (
                      <tr key={domain.domain || index} className="border-b">
                        <td className="py-3 font-mono text-sm">{domain.domain || '(unknown)'}</td>
                        <td className="py-3 text-right font-semibold">
                          {domain._count.toLocaleString()}
                        </td>
                        <td className="py-3 text-right text-muted-foreground">
                          {Math.round((domain._count / stats.totalLoads) * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Last 20 widget loads</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentLoadsData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No activity yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Widget</th>
                    <th className="text-left py-2 font-medium">Domain</th>
                    <th className="text-right py-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentLoadsData.map((load) => (
                    <tr key={load.id} className="border-b">
                      <td className="py-3">
                        <Badge variant={load.widgetType === 'avm' ? 'default' : 'secondary'}>
                          {load.widgetType.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 font-mono text-sm">
                        {load.domain || '(unknown)'}
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {new Date(load.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
