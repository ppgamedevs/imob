import { requireSession } from "@/lib/a/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function PortfolioPage() {
  const session = await requireSession();

  // Get all analyses for this agent
  const items = await prisma.bulkAnalysisItem.findMany({
    where: {
      job: {
        agentEmail: session.email,
      },
      status: "done",
      analysisId: {
        not: null,
      },
    },
    include: {
      job: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  // Fetch analysis details
  const analysisIds = items
    .map((item) => item.analysisId)
    .filter((id): id is string => id !== null);

  const analyses = await prisma.analysis.findMany({
    where: {
      id: {
        in: analysisIds,
      },
    },
    include: {
      extractedListing: true,
      scoreSnapshot: true,
      group: {
        include: {
          _count: {
            select: {
              analyses: true,
            },
          },
        },
      },
    },
  });

  const analysisMap = new Map(analyses.map((a) => [a.id, a]));

  return (
    <div className="container max-w-7xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Portfolio</h1>
          <p className="text-gray-400">{analyses.length} listings</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/a">← Back</Link>
          </Button>
          <Button asChild>
            <Link href="/a/upload">Add More</Link>
          </Button>
        </div>
      </div>

      {/* Simple table */}
      <div className="bg-white/5 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="text-left p-4 font-medium">Listing</th>
                <th className="text-left p-4 font-medium">Price</th>
                <th className="text-left p-4 font-medium">€/m²</th>
                <th className="text-left p-4 font-medium">AVM</th>
                <th className="text-left p-4 font-medium">TTS</th>
                <th className="text-left p-4 font-medium">Yield</th>
                <th className="text-left p-4 font-medium">Risk</th>
                <th className="text-left p-4 font-medium">Dups</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item) => {
                const analysis = item.analysisId ? analysisMap.get(item.analysisId) : null;
                const listing = analysis?.extractedListing;
                const score = analysis?.scoreSnapshot;

                return (
                  <tr key={item.id} className="hover:bg-white/5">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {listing?.photos && Array.isArray(listing.photos) && listing.photos[0] && (
                          <img
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            src={(listing.photos[0] as any).url || listing.photos[0]}
                            alt=""
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <div className="font-medium line-clamp-1">
                            {listing?.title || "Untitled"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {listing?.areaM2 ? `${listing.areaM2}m²` : ""}
                            {listing?.rooms ? ` · ${listing.rooms} camere` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {listing?.price ? `€${listing.price.toLocaleString()}` : "-"}
                    </td>
                    <td className="p-4">
                      {listing?.price && listing?.areaM2
                        ? `€${Math.round(listing.price / listing.areaM2)}`
                        : "-"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {score?.avmMid ? `€${Math.round(score.avmMid).toLocaleString()}` : "-"}
                        {score?.priceBadge && (
                          <Badge
                            variant={score.priceBadge === "underpriced" ? "default" : "secondary"}
                          >
                            {score.priceBadge}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">{score?.ttsBucket || "-"}</td>
                    <td className="p-4">
                      {score?.yieldNet ? `${score.yieldNet.toFixed(1)}%` : "-"}
                    </td>
                    <td className="p-4">
                      {score?.riskClass && (
                        <Badge
                          variant={
                            score.riskClass.toLowerCase().includes("high")
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {score.riskClass}
                        </Badge>
                      )}
                    </td>
                    <td className="p-4">
                      {analysis?.group ? (
                        <Link
                          href={`/a/portfolio/${analysis.groupId}`}
                          className="text-blue-400 hover:underline"
                        >
                          {analysis.group._count.analyses}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-4">
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/report/${item.analysisId}`} target="_blank">
                          View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="mb-4">No listings in your portfolio yet.</p>
          <Button asChild>
            <Link href="/a/upload">Upload Your First Batch</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
