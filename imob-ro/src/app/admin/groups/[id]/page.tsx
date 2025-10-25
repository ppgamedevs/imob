import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export default async function AdminGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const group = await prisma.dedupGroup.findUnique({
    where: { id },
    include: {
      analyses: {
        include: {
          featureSnapshot: true,
          extractedListing: true,
          scoreSnapshot: true,
        },
        orderBy: { createdAt: "desc" },
      },
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 10, // Get more for timeline
      },
    },
  });

  if (!group) notFound();

  const members = group.analyses.map((a) => {
    const f = (a.featureSnapshot as any)?.features ?? {};
    const e = a.extractedListing;

    const score = (a.scoreSnapshot as any)?.trustScore ?? null;

    let domain = "unknown";
    try {
      if (a.sourceUrl) {
        const url = new URL(a.sourceUrl);
        domain = url.hostname.replace(/^www\./, "");
      }
    } catch {
      // ignore
    }

    return {
      id: a.id,
      sourceUrl: a.sourceUrl,
      domain,
      title: e?.title ?? "Untitled",
      priceEur: f.priceEur ?? null,
      areaM2: f.areaM2 ?? null,
      rooms: f.rooms ?? null,
      trustScore: score,
      createdAt: a.createdAt,
      isCanonical: group.canonicalUrl === a.sourceUrl,
    };
  });

  const snapshot = group.snapshots[0];

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-6">
        <Link href="/admin/groups">
          <Button variant="outline" size="sm">
            ← Back to Groups
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Group Details</h1>
        <p className="text-muted-foreground font-mono text-sm">ID: {group.id}</p>
      </div>

      {/* Group Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Group Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Members</div>
              <div className="text-2xl font-bold">{group.itemCount}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">City</div>
              <div className="text-lg">{group.city ?? "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Area</div>
              <div className="text-lg">{group.areaSlug ?? "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Signature</div>
              <div className="text-xs font-mono">{group.signature.slice(0, 30)}...</div>
            </div>
          </div>

          {snapshot && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm font-medium mb-2">Canonical Snapshot</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Price: </span>
                  {snapshot.priceEur ? `${snapshot.priceEur.toLocaleString()} €` : "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Range: </span>
                  {snapshot.priceMin && snapshot.priceMax
                    ? `${snapshot.priceMin.toLocaleString()}–${snapshot.priceMax.toLocaleString()} €`
                    : "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Area: </span>
                  {snapshot.areaM2 ? `${snapshot.areaM2} m²` : "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Sources: </span>
                  {snapshot.sources ?? "—"}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      {group.snapshots.length > 1 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>History Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {group.snapshots.map((snapshot, idx) => {
                const isFirst = idx === 0;
                const prevSnapshot =
                  idx < group.snapshots.length - 1 ? group.snapshots[idx + 1] : null;

                const explain = (snapshot.explain as any) ?? {};

                // Detect what changed
                const changes: string[] = [];
                if (prevSnapshot) {
                  if (snapshot.priceEur !== prevSnapshot.priceEur) {
                    changes.push(
                      `Price: ${prevSnapshot.priceEur?.toLocaleString()} → ${snapshot.priceEur?.toLocaleString()} €`,
                    );
                  }
                  if (snapshot.areaM2 !== prevSnapshot.areaM2) {
                    changes.push(`Area: ${prevSnapshot.areaM2} → ${snapshot.areaM2} m²`);
                  }
                  if (snapshot.sources !== prevSnapshot.sources) {
                    changes.push(`Sources: ${prevSnapshot.sources} → ${snapshot.sources}`);
                  }
                }

                return (
                  <div key={snapshot.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full ${isFirst ? "bg-primary" : "bg-muted-foreground"}`}
                      />
                      {idx < group.snapshots.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="text-sm font-medium">
                        {isFirst ? "Current State" : "Snapshot"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(snapshot.createdAt).toLocaleString()}
                      </div>
                      {changes.length > 0 && (
                        <div className="mt-2 text-sm space-y-1">
                          {changes.map((change, i) => (
                            <div key={i} className="text-muted-foreground">
                              {change}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex gap-2 text-xs">
                        {snapshot.priceEur && (
                          <span className="px-2 py-0.5 bg-muted rounded">
                            {snapshot.priceEur.toLocaleString()} €
                          </span>
                        )}
                        {snapshot.areaM2 && (
                          <span className="px-2 py-0.5 bg-muted rounded">{snapshot.areaM2} m²</span>
                        )}
                        {snapshot.sources && (
                          <span className="px-2 py-0.5 bg-muted rounded">
                            {snapshot.sources} sources
                          </span>
                        )}
                      </div>
                      {explain.picked && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Canonical: {explain.picked}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="border rounded p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {member.isCanonical && <Badge variant="default">Canonical</Badge>}
                      <Badge variant="outline">{member.domain}</Badge>
                      {member.trustScore !== null && (
                        <Badge variant="secondary">{member.trustScore}/100</Badge>
                      )}
                    </div>

                    <div className="text-sm font-medium mb-1 truncate">{member.title}</div>

                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {member.priceEur && <span>{member.priceEur.toLocaleString()} €</span>}
                      {member.areaM2 && <span>{member.areaM2} m²</span>}
                      {member.rooms && <span>{member.rooms} cam</span>}
                    </div>

                    <div className="text-xs text-muted-foreground mt-1">
                      Added: {new Date(member.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link href={`/report/${member.id}`} target="_blank">
                      <Button variant="outline" size="sm">
                        View Report
                      </Button>
                    </Link>

                    {member.sourceUrl && (
                      <a href={member.sourceUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="w-full">
                          View Source
                        </Button>
                      </a>
                    )}

                    {!member.isCanonical && (
                      <form action="/api/admin/groups/set-canonical" method="POST">
                        <input type="hidden" name="groupId" value={group.id} />
                        <input type="hidden" name="sourceUrl" value={member.sourceUrl ?? ""} />
                        <Button variant="secondary" size="sm" type="submit" className="w-full">
                          Set Canonical
                        </Button>
                      </form>
                    )}

                    {members.length > 1 && (
                      <form action="/api/admin/groups/split" method="POST">
                        <input type="hidden" name="groupId" value={group.id} />
                        <input type="hidden" name="analysisId" value={member.id} />
                        <Button variant="destructive" size="sm" type="submit" className="w-full">
                          Split Out
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
