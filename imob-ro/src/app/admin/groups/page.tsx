import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Dedup Groups - Admin",
};

export default async function AdminGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; minSize?: string }>;
}) {
  await requireAdmin();
  const { city, minSize: minSizeParam } = await searchParams;
  const minSize = minSizeParam ? parseInt(minSizeParam) : 2;

  // Fetch groups with member count
  const groups = await prisma.dedupGroup.findMany({
    where: {
      itemCount: { gte: minSize },
      ...(city ? { city } : {}),
    },
    include: {
      _count: {
        select: { analyses: true },
      },
    },
    orderBy: { itemCount: "desc" },
    take: 100,
  });

  // Get city list for filter
  const cities = await prisma.dedupGroup
    .findMany({
      where: { city: { not: null } },
      select: { city: true },
      distinct: ["city"],
    })
    .then((rows) => rows.map((r) => r.city).filter((c): c is string => c != null));

  const stats = await prisma.dedupGroup.aggregate({
    _count: true,
    _sum: { itemCount: true },
  });

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dedup Groups</h1>
        <p className="text-muted-foreground">Manage grouped analyses and canonical sources</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold">{stats._count}</div>
              <div className="text-sm text-muted-foreground">Total Groups</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats._sum.itemCount ?? 0}</div>
              <div className="text-sm text-muted-foreground">Total Members</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {stats._sum.itemCount && stats._count
                  ? (stats._sum.itemCount / stats._count).toFixed(1)
                  : "0"}
              </div>
              <div className="text-sm text-muted-foreground">Avg Size</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4 items-center flex-wrap">
            <div>
              <label className="text-sm font-medium mr-2">City:</label>
              <select
                className="border rounded px-3 py-1"
                value={city ?? ""}
                onChange={(e) => {
                  const params = new URLSearchParams({
                    city: city ?? "",
                    minSize: minSizeParam ?? "",
                  });
                  if (e.target.value) {
                    params.set("city", e.target.value);
                  } else {
                    params.delete("city");
                  }
                  window.location.href = `/admin/groups?${params.toString()}`;
                }}
              >
                <option value="">All Cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mr-2">Min Size:</label>
              <input
                type="number"
                min="1"
                className="border rounded px-3 py-1 w-20"
                value={minSize}
                onChange={(e) => {
                  const params = new URLSearchParams({
                    city: city ?? "",
                    minSize: minSizeParam ?? "",
                  });
                  params.set("minSize", e.target.value);
                  window.location.href = `/admin/groups?${params.toString()}`;
                }}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = "/admin/groups";
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Groups List */}
      <div className="space-y-4">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary">{group.itemCount} members</Badge>
                    {group.city && <Badge variant="outline">{group.city}</Badge>}
                    {group.areaSlug && (
                      <Badge variant="outline" className="text-xs">
                        {group.areaSlug}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground font-mono">
                    ID: {group.id.slice(0, 12)}...
                  </div>
                  {group.canonicalUrl && (
                    <div className="text-sm mt-1">
                      <span className="text-muted-foreground">Canonical: </span>
                      <a
                        href={group.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-primary"
                      >
                        {new URL(group.canonicalUrl).hostname}
                      </a>
                    </div>
                  )}
                </div>
                <div>
                  <Link href={`/admin/groups/${group.id}`}>
                    <Button>View Details</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {groups.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No groups found matching your criteria.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
