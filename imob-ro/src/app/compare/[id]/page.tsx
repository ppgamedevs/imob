/**
 * Day 29: Compare Page
 * Side-by-side comparison of up to 4 properties
 */

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type ComparePageProps = {
  params: { id: string };
};

export default async function ComparePage({ params }: ComparePageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="container py-8">
        <p>Please sign in to view comparisons.</p>
      </div>
    );
  }

  const compareSet = await prisma.compareSet.findUnique({
    where: { id: params.id },
  });

  if (!compareSet || compareSet.userId !== session.user.id) {
    notFound();
  }

  const groupIds = compareSet.groupIds.split(",").filter(Boolean);

  // Fetch groups with canonical analysis
  const groups = await prisma.dedupGroup.findMany({
    where: { id: { in: groupIds } },
    include: {
      canonicalAnalysis: {
        include: {
          featureSnapshot: true,
          scoreSnapshot: true,
          extractedListing: true,
        },
      },
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // Track event
  await prisma.buyerEvent.create({
    data: {
      userId: session.user.id,
      kind: "compare_open",
      meta: { compareId: params.id, count: groups.length } as any,
    },
  });

  // Helper to extract features
  function getFeatures(group: (typeof groups)[0]) {
    const f = (group.canonicalAnalysis?.featureSnapshot?.features ?? {}) as any;
    const s = group.canonicalAnalysis?.scoreSnapshot as any;
    const photos = Array.isArray(group.canonicalAnalysis?.extractedListing?.photos)
      ? (group.canonicalAnalysis?.extractedListing?.photos as string[])
      : [];

    return {
      title: group.canonicalAnalysis?.extractedListing?.title ?? "N/A",
      photo: photos[0] ?? null,
      priceEur: f?.priceEur ?? null,
      areaM2: f?.areaM2 ?? null,
      eurM2: f?.priceEur && f?.areaM2 ? Math.round(f.priceEur / f.areaM2) : null,
      rooms: f?.rooms ?? null,
      yearBuilt: f?.yearBuilt ?? null,
      distMetroM: f?.distMetroM ?? null,
      avmLow: s?.avm?.low ?? null,
      avmMid: s?.avm?.mid ?? null,
      avmHigh: s?.avm?.high ?? null,
      ttsDays: s?.tts?.days ?? null,
      ttsBucket: s?.tts?.bucket ?? null,
      yieldNet: s?.rent?.yieldNet ?? null,
      riskSeismic: s?.risk?.seismic ?? null,
      conditionScore: s?.quality?.conditionScore ?? null,
      sourceCount: group.snapshots[0]?.sources ?? 1,
    };
  }

  const properties = groups.map(getFeatures);

  // Determine winners
  const bestValue = properties.reduce(
    (best, p, i) =>
      p.eurM2 && (!best || (properties[best].eurM2 && p.eurM2 < properties[best].eurM2!))
        ? i
        : best,
    0,
  );

  const fastestSell = properties.reduce(
    (best, p, i) =>
      p.ttsDays && (!best || (properties[best].ttsDays && p.ttsDays < properties[best].ttsDays!))
        ? i
        : best,
    0,
  );

  const bestYield = properties.reduce(
    (best, p, i) =>
      p.yieldNet &&
      (!best || (properties[best].yieldNet && p.yieldNet < properties[best].yieldNet!))
        ? i
        : best,
    0,
  );

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{compareSet.name || "Property Comparison"}</h1>
        <p className="text-muted-foreground">
          Comparing {properties.length} properties side-by-side
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-4 text-left bg-muted">Metric</th>
              {properties.map((p, i) => (
                <th key={i} className="border p-4 text-left min-w-[200px]">
                  <div className="space-y-2">
                    {p.photo && (
                      <img
                        src={p.photo}
                        alt={p.title}
                        className="w-full h-32 object-cover rounded"
                      />
                    )}
                    <p className="text-sm font-medium line-clamp-2">{p.title}</p>
                    <Link href={`/group/${groupIds[i]}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-4 font-medium">Asking Price</td>
              {properties.map((p, i) => (
                <td key={i} className="border p-4">
                  {p.priceEur ? (
                    <span className="text-lg font-semibold">{p.priceEur.toLocaleString()} €</span>
                  ) : (
                    "N/A"
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border p-4 font-medium">Price per m²</td>
              {properties.map((p, i) => (
                <td key={i} className="border p-4">
                  {p.eurM2 ? (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.eurM2.toLocaleString()} €/m²</span>
                      {i === bestValue && <Badge variant="default">Best Value</Badge>}
                    </div>
                  ) : (
                    "N/A"
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border p-4 font-medium">AVM Range</td>
              {properties.map((p, i) => (
                <td key={i} className="border p-4">
                  {p.avmLow && p.avmHigh ? (
                    <div className="text-sm">
                      <div>{p.avmLow.toLocaleString()} €</div>
                      <div className="text-muted-foreground">to</div>
                      <div>{p.avmHigh.toLocaleString()} €</div>
                    </div>
                  ) : (
                    "N/A"
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border p-4 font-medium">Area</td>
              {properties.map((p, i) => (
                <td key={i} className="border p-4">
                  {p.areaM2 ? `${p.areaM2} m²` : "N/A"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border p-4 font-medium">Rooms</td>
              {properties.map((p, i) => (
                <td key={i} className="border p-4">
                  {p.rooms ?? "N/A"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border p-4 font-medium">Year Built</td>
              {properties.map((p, i) => (
                <td key={i} className="border p-4">
                  {p.yearBuilt ?? "N/A"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border p-4 font-medium">Time to Sell</td>
              {properties.map((p, i) => (
                <td key={i} className="border p-4">
                  {p.ttsBucket ? (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          p.ttsBucket === "fast"
                            ? "default"
                            : p.ttsBucket === "slow"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {p.ttsBucket}
                      </Badge>
                      {i === fastestSell && <Badge variant="default">Fastest</Badge>}
                    </div>
                  ) : (
                    "N/A"
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border p-4 font-medium">Net Yield</td>
              {properties.map((p, i) => (
                <td key={i} className="border p-4">
                  {p.yieldNet ? (
                    <div className="flex items-center gap-2">
                      <span>{(p.yieldNet * 100).toFixed(1)}%</span>
                      {i === bestYield && <Badge variant="default">Best Yield</Badge>}
                    </div>
                  ) : (
                    "N/A"
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border p-4 font-medium">Metro Distance</td>
              {properties.map((p, i) => (
                <td key={i} className="border p-4">
                  {p.distMetroM
                    ? `${Math.round(p.distMetroM)}m (${Math.round(p.distMetroM / 60)} min)`
                    : "N/A"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border p-4 font-medium">Seismic Risk</td>
              {properties.map((p, i) => (
                <td key={i} className="border p-4">
                  {p.riskSeismic ? (
                    <Badge variant={p.riskSeismic > 0.5 ? "destructive" : "secondary"}>
                      {p.riskSeismic > 0.5 ? "High" : "Low"}
                    </Badge>
                  ) : (
                    "N/A"
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border p-4 font-medium">Condition</td>
              {properties.map((p, i) => (
                <td key={i} className="border p-4">
                  {p.conditionScore
                    ? p.conditionScore < 0.5
                      ? "Needs renovation"
                      : p.conditionScore < 0.75
                        ? "Decent"
                        : "Modern"
                    : "N/A"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border p-4 font-medium">Duplicate Listings</td>
              {properties.map((p, i) => (
                <td key={i} className="border p-4">
                  {p.sourceCount > 1 ? (
                    <Badge variant="outline">{p.sourceCount - 1} duplicates</Badge>
                  ) : (
                    "Unique"
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>
                <strong>Best Value:</strong> {properties[bestValue]?.title}
              </li>
              <li>
                <strong>Fastest to Sell:</strong> {properties[fastestSell]?.title}
              </li>
              <li>
                <strong>Best Investment Yield:</strong> {properties[bestYield]?.title}
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
