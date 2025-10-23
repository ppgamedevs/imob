/**
 * Day 29: Buyer Portal Dashboard
 * Saved searches, watchlist, and recommendations
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { SavedSearchCard } from "./SavedSearchCard";
import { WatchlistCard } from "./WatchlistCard";

export default async function BuyerPortalPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please sign in to access your buyer portal.
            </p>
            <Link href="/auth/signin">
              <Button>Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch saved searches
  const savedSearches = await prisma.savedSearch.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  // Fetch watchlist with price changes
  const watchItems = await prisma.watchItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: {
      group: {
        include: {
          snapshots: {
            orderBy: { createdAt: "desc" },
            take: 2,
          },
          analyses: {
            where: { status: "done" },
            include: {
              featureSnapshot: true,
              scoreSnapshot: true,
              extractedListing: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  // Fetch recent compare sets
  const compareSets = await prisma.compareSet.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  // Get recommendations (simple heuristic: underpriced + fast TTS)
  const recommendations = await prisma.analysis.findMany({
    where: {
      // Basic filters - can be enhanced with user preferences
    },
    include: {
      featureSnapshot: true,
      scoreSnapshot: true,
      extractedListing: true,
      group: true,
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  // Filter recommendations: underpriced + fast TTS
  const goodDeals = recommendations.filter((a) => {
    const s = a.scoreSnapshot as any;
    const underpriced = s?.value?.priceBadge === "underpriced";
    const fastTTS = s?.tts?.bucket === "fast";
    return underpriced || fastTTS;
  });

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Buyer Portal</h1>
        <p className="text-muted-foreground">Manage your searches, favorites, and comparisons</p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Link href="/discover">
          <Button size="lg">
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Search Properties
          </Button>
        </Link>
        <Link href="/search">
          <Button size="lg" variant="outline">
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            Browse Zones
          </Button>
        </Link>
      </div>

      {/* Saved Searches */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Saved Searches</CardTitle>
          <Badge variant="secondary">{savedSearches.length}</Badge>
        </CardHeader>
        <CardContent>
          {savedSearches.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No saved searches yet. Create one from the Discover page.
            </p>
          ) : (
            <div className="space-y-3">
              {savedSearches.map((s) => (
                <SavedSearchCard key={s.id} search={s} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Watchlist */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Watchlist</CardTitle>
          <Badge variant="secondary">{watchItems.length}</Badge>
        </CardHeader>
        <CardContent>
          {watchItems.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No properties in your watchlist yet. Add favorites from property pages.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {watchItems.map((w) => (
                <WatchlistCard key={w.id} item={w} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Comparisons */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Comparisons</CardTitle>
          <Badge variant="secondary">{compareSets.length}</Badge>
        </CardHeader>
        <CardContent>
          {compareSets.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No comparisons yet. Select multiple properties to compare side-by-side.
            </p>
          ) : (
            <div className="space-y-3">
              {compareSets.map((c) => {
                const groupIds = c.groupIds.split(",").filter(Boolean);
                return (
                  <Link key={c.id} href={`/compare/${c.id}`}>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium">{c.name || "Untitled Comparison"}</p>
                        <p className="text-sm text-muted-foreground">
                          {groupIds.length} properties •{" "}
                          {new Date(c.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended for You</CardTitle>
          <p className="text-sm text-muted-foreground">
            Properties with great value or fast selling potential
          </p>
        </CardHeader>
        <CardContent>
          {goodDeals.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No recommendations available at this time.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {goodDeals.slice(0, 6).map((a) => {
                const f = (a.featureSnapshot?.features ?? {}) as any;
                const s = a.scoreSnapshot as any;
                const photos = Array.isArray(a.extractedListing?.photos)
                  ? (a.extractedListing?.photos as string[])
                  : [];

                const priceEur = f?.priceEur ?? null;
                const areaM2 = f?.areaM2 ?? null;
                const eurM2 = priceEur && areaM2 ? Math.round(priceEur / areaM2) : null;
                const priceBadge = s?.value?.priceBadge ?? null;
                const ttsBucket = s?.tts?.bucket ?? null;

                return (
                  <Link key={a.id} href={`/group/${a.group?.id ?? a.id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                      {photos[0] && (
                        <img
                          src={photos[0]}
                          alt={a.extractedListing?.title ?? "Property"}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <CardContent className="p-4 space-y-2">
                        <div className="flex gap-2">
                          {priceBadge === "underpriced" && (
                            <Badge variant="default">Underpriced</Badge>
                          )}
                          {ttsBucket === "fast" && <Badge variant="secondary">Fast TTS</Badge>}
                        </div>
                        <p className="font-semibold text-lg">
                          {priceEur ? `${priceEur.toLocaleString()} €` : "Price N/A"}
                        </p>
                        {eurM2 && (
                          <p className="text-sm text-muted-foreground">
                            {eurM2.toLocaleString()} €/m²
                          </p>
                        )}
                        <p className="text-sm line-clamp-2">
                          {a.extractedListing?.title ?? "No title"}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
