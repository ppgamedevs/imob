// Step 11: Developments catalog page
// /developments - filterable, paginated catalog with sponsored cards

import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { trackCatalogView } from "@/lib/dev/analytics";
import { loadDevelopments } from "@/lib/dev/load";
import type { DevelopmentFilters } from "@/types/development";

export const metadata = {
  title: "Dezvoltări noi în București – prețuri, livrare, unit mix | iR",
  description:
    "Găsește proiecte noi în București cu filtre avansate: zonă, camere, preț, livrare. Vezi unit mix, €/m², yield și risc seismic pentru fiecare proiect.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DevelopmentsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Parse filters from query params
  const filters: DevelopmentFilters = {
    areas: params.areas ? (Array.isArray(params.areas) ? params.areas : [params.areas]) : undefined,
    typologies: params.typologies
      ? Array.isArray(params.typologies)
        ? params.typologies
        : [params.typologies]
      : undefined,
    minPrice: params.minPrice ? parseInt(params.minPrice as string, 10) : undefined,
    maxPrice: params.maxPrice ? parseInt(params.maxPrice as string, 10) : undefined,
    deliveryFrom: params.deliveryFrom as string,
    deliveryTo: params.deliveryTo as string,
    stage: params.stage ? (Array.isArray(params.stage) ? params.stage : [params.stage]) : undefined,
    page: params.page ? parseInt(params.page as string, 10) : 1,
    limit: 12,
    sort: (params.sort as any) || "relevance",
  };

  const { projects, total, hasMore } = await loadDevelopments(filters);

  // Track catalog view
  trackCatalogView(filters).catch(console.error);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Dezvoltări Noi</h1>
          <p className="mt-2 text-gray-600">{total} proiecte disponibile în București</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Filters Sidebar */}
          <aside className="h-fit lg:sticky lg:top-4">
            <Suspense fallback={<FiltersSkeleton />}>
              <FiltersPanel filters={filters} />
            </Suspense>
          </aside>

          {/* Projects Grid */}
          <main>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {total} rezultate
                {filters.areas && ` în ${filters.areas.join(", ")}`}
              </p>
              <SortDropdown currentSort={filters.sort || "relevance"} />
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.slug}
                  project={project}
                  sponsored={index === 2 || index === 9} // Inject sponsored after 2nd and 9th
                />
              ))}
            </div>

            {/* Pagination */}
            {(hasMore || filters.page! > 1) && (
              <div className="mt-8 flex justify-center gap-2">
                {filters.page! > 1 && (
                  <Link href={buildFilterUrl({ ...filters, page: filters.page! - 1 })}>
                    <Button variant="outline">← Precedenta</Button>
                  </Link>
                )}
                {hasMore && (
                  <Link href={buildFilterUrl({ ...filters, page: (filters.page || 1) + 1 })}>
                    <Button variant="outline">Următoarea →</Button>
                  </Link>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ========================================
// Components
// ========================================

function ProjectCard({ project, sponsored }: { project: any; sponsored?: boolean }) {
  const minPriceFormatted = new Intl.NumberFormat("ro-RO").format(project.minPrice);

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-lg">
      {sponsored && (
        <div className="absolute left-2 top-2 z-10">
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Promovat
          </Badge>
        </div>
      )}

      <Link href={`/developments/${project.slug}`}>
        <CardHeader className="p-0">
          {project.coverPhoto ? (
            <img
              src={project.coverPhoto}
              alt={project.name}
              className="aspect-[16/9] w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="aspect-[16/9] w-full bg-gray-200" />
          )}
        </CardHeader>

        <CardContent className="p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{project.name}</h3>
              {project.areaName && <p className="text-sm text-gray-600">{project.areaName}</p>}
            </div>
            {project.developerLogo && (
              <img
                src={project.developerLogo}
                alt={project.developerName}
                className="h-8 w-8 object-contain"
              />
            )}
          </div>

          {/* Unit Mix */}
          {project.unitMix.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {project.unitMix.slice(0, 4).map((stat: any) => (
                <div key={stat.typology} className="rounded bg-gray-100 px-2 py-1 text-xs">
                  <span className="font-medium">{formatTypology(stat.typology)}</span>
                  <span className="ml-1 text-gray-600">
                    de la {new Intl.NumberFormat("ro-RO").format(stat.minPrice)} €
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Badges */}
          {project.badges.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {project.badges.slice(0, 3).map((badge: string) => (
                <Badge key={badge} variant="outline" className="text-xs">
                  {badge}
                </Badge>
              ))}
            </div>
          )}

          {/* Delivery */}
          {project.deliveryQuarter && (
            <p className="text-sm text-gray-600">
              Livrare: <span className="font-medium">{project.deliveryQuarter}</span>
            </p>
          )}
        </CardContent>

        <CardFooter className="border-t p-4">
          <div className="flex w-full items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">De la</p>
              <p className="text-lg font-bold text-gray-900">{minPriceFormatted} €</p>
            </div>
            <Button size="sm" variant="outline">
              Vezi proiectul →
            </Button>
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
}

function FiltersPanel({ filters }: { filters: DevelopmentFilters }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold">Filtre</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Area filter */}
        <div>
          <label className="mb-2 block text-sm font-medium">Zonă</label>
          <select className="w-full rounded border p-2 text-sm">
            <option>Toate zonele</option>
            <option>Sector 1</option>
            <option>Sector 2</option>
            <option>Sector 3</option>
            <option>Sector 4</option>
            <option>Sector 5</option>
            <option>Sector 6</option>
          </select>
        </div>

        {/* Typology filter */}
        <div>
          <label className="mb-2 block text-sm font-medium">Camere</label>
          <div className="flex flex-wrap gap-2">
            {["Studio", "1", "2", "3", "4+"].map((type) => (
              <Badge key={type} variant="outline" className="cursor-pointer">
                {type}
              </Badge>
            ))}
          </div>
        </div>

        {/* Price range */}
        <div>
          <label className="mb-2 block text-sm font-medium">Preț (EUR)</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              className="w-full rounded border p-2 text-sm"
              defaultValue={filters.minPrice}
            />
            <input
              type="number"
              placeholder="Max"
              className="w-full rounded border p-2 text-sm"
              defaultValue={filters.maxPrice}
            />
          </div>
        </div>

        {/* Delivery */}
        <div>
          <label className="mb-2 block text-sm font-medium">Livrare</label>
          <select className="w-full rounded border p-2 text-sm">
            <option>Oricând</option>
            <option>2025</option>
            <option>2026</option>
            <option>2027+</option>
          </select>
        </div>

        <Button className="w-full">Aplică filtre</Button>
      </CardContent>
    </Card>
  );
}

function FiltersSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-20 animate-pulse bg-gray-200" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse bg-gray-100" />
        ))}
      </CardContent>
    </Card>
  );
}

function SortDropdown({ currentSort }: { currentSort: string }) {
  return (
    <select className="rounded border px-3 py-1 text-sm" defaultValue={currentSort}>
      <option value="relevance">Relevante</option>
      <option value="price_asc">Preț crescător</option>
      <option value="price_desc">Preț descrescător</option>
      <option value="delivery">Livrare</option>
    </select>
  );
}

// ========================================
// Helpers
// ========================================

function formatTypology(typology: string): string {
  if (typology === "studio") return "Studio";
  if (typology === "penthouse") return "PH";
  if (typology === "duplex") return "Duplex";
  return `${typology} cam`;
}

function buildFilterUrl(filters: DevelopmentFilters): string {
  const params = new URLSearchParams();
  if (filters.areas) filters.areas.forEach((a) => params.append("areas", a));
  if (filters.typologies) filters.typologies.forEach((t) => params.append("typologies", t));
  if (filters.minPrice) params.set("minPrice", filters.minPrice.toString());
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice.toString());
  if (filters.deliveryFrom) params.set("deliveryFrom", filters.deliveryFrom);
  if (filters.deliveryTo) params.set("deliveryTo", filters.deliveryTo);
  if (filters.stage) filters.stage.forEach((s) => params.append("stage", s));
  if (filters.page) params.set("page", filters.page.toString());
  if (filters.sort && filters.sort !== "relevance") params.set("sort", filters.sort);
  return `/developments?${params.toString()}`;
}
