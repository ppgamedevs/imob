/**
 * Day 30: București City Overview Page
 * Top zones, best picks, city-wide statistics
 */

import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Prețuri imobiliare București · Statistici & tendințe 2024",
  description:
    "Preț median pe m², top zone, oferte active și tendințe imobiliare București. Date actualizate zilnic.",
  alternates: { canonical: "/bucuresti" },
};

// ISR: revalidate every 6 hours
export const revalidate = 21600;

export default async function BucharestPage() {
  // Fetch latest AreaDaily for all Bucharest zones
  const areas = await prisma.area.findMany({
    where: { city: "București" },
    select: { slug: true, name: true },
  });

  const areaData = await Promise.all(
    areas.map(async (area) => {
      const [latest] = await prisma.areaDaily.findMany({
        where: { areaSlug: area.slug },
        orderBy: { date: "desc" },
        take: 1,
      });

      const [prev30] = await prisma.areaDaily.findMany({
        where: { areaSlug: area.slug },
        orderBy: { date: "desc" },
        skip: 29,
        take: 1,
      });

      const change30d =
        latest && latest.medianEurM2 && prev30 && prev30.medianEurM2
          ? ((latest.medianEurM2 - prev30.medianEurM2) / prev30.medianEurM2) * 100
          : null;

      return {
        slug: area.slug,
        name: area.name,
        medianEurM2: latest?.medianEurM2 ?? null,
        supply: latest?.supply ?? 0,
        demandScore: latest?.demandScore ?? null,
        change30d,
      };
    }),
  );

  // Sort by supply (most active zones)
  const topZones = areaData
    .filter((a) => a.medianEurM2)
    .sort((a, b) => (b.supply ?? 0) - (a.supply ?? 0))
    .slice(0, 12);

  // City-wide averages
  const cityMedian =
    areaData.reduce((sum, a) => sum + (a.medianEurM2 ?? 0), 0) /
    areaData.filter((a) => a.medianEurM2).length;
  const citySupply = areaData.reduce((sum, a) => sum + (a.supply ?? 0), 0);

  // Best value zones (lowest €/m²)
  const bestValue = areaData
    .filter((a) => a.medianEurM2 && a.supply > 5)
    .sort((a, b) => (a.medianEurM2 ?? 0) - (b.medianEurM2 ?? 0))
    .slice(0, 6);

  // Trending up zones (highest 30d change)
  const trendingUp = areaData
    .filter((a) => a.change30d && a.change30d > 0)
    .sort((a, b) => (b.change30d ?? 0) - (a.change30d ?? 0))
    .slice(0, 6);

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-8">
      {/* Hero */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">Piața imobiliară București</h1>
        <p className="text-muted-foreground text-lg">
          Statistici actualizate zilnic · {areaData.length} zone monitorizate
        </p>
      </div>

      {/* City-wide KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Preț median oraș
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{Math.round(cityMedian).toLocaleString()} €/m²</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Oferte active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{citySupply.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zone acoperite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{areaData.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top zones by activity */}
      <Card>
        <CardHeader>
          <CardTitle>Top zone după activitate</CardTitle>
          <p className="text-sm text-muted-foreground">Cele mai multe oferte active</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topZones.map((zone) => (
              <Link key={zone.slug} href={`/zona/${zone.slug}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{zone.name}</h3>
                      {zone.change30d !== null && (
                        <Badge variant={zone.change30d > 0 ? "default" : "secondary"}>
                          {zone.change30d > 0 ? "↑" : "↓"} {Math.abs(zone.change30d).toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {zone.medianEurM2?.toLocaleString()} €/m²
                    </p>
                    <p className="text-sm text-muted-foreground">{zone.supply} oferte active</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Best value zones */}
      <Card>
        <CardHeader>
          <CardTitle>Cele mai accesibile zone</CardTitle>
          <p className="text-sm text-muted-foreground">Preț/m² sub media orașului</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bestValue.map((zone) => (
              <Link key={zone.slug} href={`/zona/${zone.slug}`}>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">{zone.name}</p>
                    <p className="text-sm text-muted-foreground">{zone.supply} oferte</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{zone.medianEurM2?.toLocaleString()} €/m²</p>
                    <Badge variant="secondary">
                      {Math.round(((zone.medianEurM2 ?? 0) / cityMedian - 1) * 100)}% vs oraș
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trending zones */}
      {trendingUp.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Zone în creștere</CardTitle>
            <p className="text-sm text-muted-foreground">Creșteri de preț în ultimele 30 zile</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trendingUp.map((zone) => (
                <Link key={zone.slug} href={`/zona/${zone.slug}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{zone.name}</h3>
                        <Badge variant="default">↑ {zone.change30d?.toFixed(1)}%</Badge>
                      </div>
                      <p className="text-xl font-bold">{zone.medianEurM2?.toLocaleString()} €/m²</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      <Card className="bg-primary/5">
        <CardContent className="p-6 text-center space-y-4">
          <h2 className="text-2xl font-bold">Explorează piața în detaliu</h2>
          <p className="text-muted-foreground">
            Descoperă statistici detaliate, tendințe și oferte pentru fiecare zonă
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/discover">
              <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90">
                Caută proprietăți
              </button>
            </Link>
            <Link href="/search">
              <button className="px-6 py-3 border rounded-lg font-semibold hover:bg-muted">
                Browse toate zonele
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
