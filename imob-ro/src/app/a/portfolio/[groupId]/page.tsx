import { requireSession } from "@/lib/a/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  await requireSession();
  const { groupId } = await params;

  const group = await prisma.dedupGroup.findUnique({
    where: { id: groupId },
    include: {
      analyses: {
        include: {
          extractedListing: true,
          scoreSnapshot: true,
        },
        take: 20,
      },
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!group) {
    notFound();
  }

  const snapshot = group.snapshots[0];

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Duplicate Group</h1>
          <p className="text-gray-400">{group.analyses.length} listings in this group</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/a/portfolio">← Back to Portfolio</Link>
        </Button>
      </div>

      {snapshot && (
        <div className="bg-white/5 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Canonical Data</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-400">Title</div>
              <div className="font-medium">{snapshot.title || "N/A"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Price Range</div>
              <div className="font-medium">
                €{snapshot.priceMin?.toLocaleString()} - €{snapshot.priceMax?.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Area</div>
              <div className="font-medium">{snapshot.areaM2}m²</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Sources</div>
              <div className="font-medium">{snapshot.sources} domains</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/5 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">All Sources</h2>
        <div className="space-y-3">
          {group.analyses.map((analysis) => {
            const listing = analysis.extractedListing;
            const score = analysis.scoreSnapshot;

            return (
              <div key={analysis.id} className="flex items-center gap-4 p-4 rounded bg-white/5">
                {listing?.photos && Array.isArray(listing.photos) && listing.photos[0] && (
                  <img
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    src={(listing.photos[0] as any).url || listing.photos[0]}
                    alt=""
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium">{listing?.title}</div>
                  <div className="text-sm text-gray-400">
                    {new URL(analysis.sourceUrl).hostname}
                  </div>
                  <div className="text-sm text-gray-500">
                    {listing?.price ? `€${listing.price.toLocaleString()}` : "N/A"}
                    {score?.avmMid &&
                      listing?.price &&
                      ` (${(((listing.price - score.avmMid) / score.avmMid) * 100).toFixed(1)}% vs AVM)`}
                  </div>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/report/${analysis.id}`} target="_blank">
                    View Report
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
