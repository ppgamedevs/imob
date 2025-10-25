// Step 11: Development project detail page
// /developments/[slug] - premium project page with hero, KPIs, unit finder, lead form

import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trackProjectView } from "@/lib/dev/analytics";
import { loadProjectDetail } from "@/lib/dev/load";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await loadProjectDetail(slug);

  if (!project) {
    return {
      title: "Proiect nu a fost găsit | iR",
    };
  }

  const minPriceFormatted = new Intl.NumberFormat("ro-RO").format(project.minPrice);
  const areaName = project.development.areaSlug || "București";

  return {
    title: `${project.development.name} – ${areaName}, de la ${minPriceFormatted} € | iR`,
    description:
      project.development.description ||
      `${project.development.name} – ${project.totalUnits} unități, preț de la ${minPriceFormatted} €, livrare ${project.development.deliveryAt ? new Date(project.development.deliveryAt).getFullYear() : "TBD"}.`,
    openGraph: {
      images: project.photos[0] ? [project.photos[0]] : [],
    },
  };
}

export default async function DevelopmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await loadProjectDetail(slug);

  if (!project) {
    notFound();
  }

  const {
    development,
    developer,
    units,
    photos,
    amenities,
    minPrice,
    maxPrice,
    avgEurM2,
    totalUnits,
    availableUnits,
    medianYield,
    seismicClass,
  } = project;

  // Track project view
  trackProjectView(development.id).catch(console.error);

  const minPriceFormatted = new Intl.NumberFormat("ro-RO").format(minPrice);
  const maxPriceFormatted = new Intl.NumberFormat("ro-RO").format(maxPrice);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Gallery */}
      <section className="bg-black">
        <div className="container mx-auto">
          {photos.length > 0 ? (
            <div className="grid gap-2 lg:grid-cols-2">
              <img
                src={photos[0]}
                alt={development.name}
                className="aspect-[16/9] w-full object-cover lg:col-span-2"
              />
              {photos.slice(1, 5).map((photo, i) => (
                <img
                  key={i}
                  src={photo}
                  alt={`${development.name} ${i + 2}`}
                  className="aspect-[4/3] w-full object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="aspect-[16/9] w-full bg-gray-800" />
          )}
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Main Content */}
          <main className="space-y-8">
            {/* Header */}
            <div>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold">{development.name}</h1>
                  {development.addressRaw && (
                    <p className="mt-1 text-gray-600">{development.addressRaw}</p>
                  )}
                </div>
                {developer?.logoUrl && (
                  <img
                    src={developer.logoUrl}
                    alt={developer.name}
                    className="h-16 object-contain"
                  />
                )}
              </div>

              {/* KPIs Row */}
              <div className="grid gap-4 sm:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-600">Preț</p>
                    <p className="text-lg font-bold">
                      {minPriceFormatted} - {maxPriceFormatted} €
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-600">€/m²</p>
                    <p className="text-lg font-bold">{avgEurM2.toLocaleString("ro-RO")} €</p>
                  </CardContent>
                </Card>
                {medianYield && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-600">Yield mediu</p>
                      <p className="text-lg font-bold">{medianYield.toFixed(1)}%</p>
                    </CardContent>
                  </Card>
                )}
                {seismicClass && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-600">Risc seismic</p>
                      <p className="text-lg font-bold">{seismicClass}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Description */}
            {development.description && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold">Despre proiect</h2>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-gray-700">{development.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Unit Finder */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Unități disponibile</h2>
                <p className="text-sm text-gray-600">
                  {availableUnits} din {totalUnits} unități disponibile
                </p>
              </CardHeader>
              <CardContent>
                <UnitFinderTable units={units} />
              </CardContent>
            </Card>

            {/* Amenities */}
            {amenities.length > 0 && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold">Facilități</h2>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {amenities.map((amenity) => (
                      <div key={amenity} className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location */}
            {development.lat && development.lng && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold">Locație</h2>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video w-full rounded bg-gray-200">
                    {/* Placeholder for map - integrate with Google Maps/Mapbox */}
                    <div className="flex h-full items-center justify-center text-gray-500">
                      Hartă: {development.lat.toFixed(6)}, {development.lng.toFixed(6)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* FAQ */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Întrebări frecvente</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium">Când este livrarea?</h3>
                  <p className="text-sm text-gray-600">
                    {development.deliveryAt
                      ? `Livrare estimată: ${new Date(development.deliveryAt).toLocaleDateString("ro-RO")}`
                      : "Data de livrare va fi anunțată în curând."}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Sunt eligibile pentru ipotecă verde?</h3>
                  <p className="text-sm text-gray-600">
                    {development.deliveryAt &&
                    new Date(development.deliveryAt) >= new Date("2021-01-01")
                      ? "Da, proiectul este eligibil pentru ipotecă verde conform criteriilor nZEB."
                      : "Verificați cu dezvoltatorul pentru certificările specifice."}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Există locuri de parcare disponibile?</h3>
                  <p className="text-sm text-gray-600">
                    Consultați tabelul de unități pentru a vedea care apartamente includ parcare.
                  </p>
                </div>
              </CardContent>
            </Card>
          </main>

          {/* Sidebar - Lead Form */}
          <aside className="lg:sticky lg:top-4 lg:h-fit">
            <Card className="shadow-lg">
              <CardHeader>
                <h2 className="text-lg font-semibold">Solicită informații</h2>
                <p className="text-sm text-gray-600">
                  Contactează dezvoltatorul pentru detalii suplimentare
                </p>
              </CardHeader>
              <CardContent>
                <LeadForm developmentId={development.id} developerBrand={developer?.brand} />
              </CardContent>
            </Card>

            {/* Download Brochure */}
            <Card className="mt-4">
              <CardContent className="p-4">
                <Button variant="outline" className="w-full">
                  📄 Descarcă broșura
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ========================================
// Unit Finder Table
// ========================================

function UnitFinderTable({ units }: { units: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="p-2 text-left">Apartament</th>
            <th className="p-2 text-left">Camere</th>
            <th className="p-2 text-right">Suprafață</th>
            <th className="p-2 text-right">Preț</th>
            <th className="p-2 text-right">€/m²</th>
            <th className="p-2 text-center">Etaj</th>
            <th className="p-2 text-center">Status</th>
            <th className="p-2 text-center">Yield</th>
            <th className="p-2 text-center">Acțiuni</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <tr key={unit.id} className="border-b hover:bg-gray-50">
              <td className="p-2 font-medium">{unit.label}</td>
              <td className="p-2">{unit.rooms || formatTypology(unit.typology)}</td>
              <td className="p-2 text-right">{unit.areaM2} m²</td>
              <td className="p-2 text-right font-medium">
                {new Intl.NumberFormat("ro-RO").format(unit.priceEur)} €
              </td>
              <td className="p-2 text-right">
                {unit.eurM2 ? `${unit.eurM2.toLocaleString("ro-RO")} €` : "-"}
              </td>
              <td className="p-2 text-center">{unit.floor || "-"}</td>
              <td className="p-2 text-center">
                <Badge variant={unit.stage === "in_sales" ? "default" : "secondary"}>
                  {formatStage(unit.stage)}
                </Badge>
              </td>
              <td className="p-2 text-center">
                {unit.yieldNet ? `${unit.yieldNet.toFixed(1)}%` : "-"}
              </td>
              <td className="p-2 text-center">
                <Button size="sm" variant="outline">
                  Contact
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTypology(typology: string): string {
  if (typology === "studio") return "Studio";
  if (typology === "penthouse") return "PH";
  if (typology === "duplex") return "Duplex";
  return typology;
}

function formatStage(stage: string | null): string {
  if (stage === "in_sales") return "Disponibil";
  if (stage === "reserved") return "Rezervat";
  if (stage === "sold") return "Vândut";
  return "N/A";
}

// ========================================
// Lead Form
// ========================================

function LeadForm({
  developmentId,
  developerBrand,
}: {
  developmentId: string;
  developerBrand: any;
}) {
  const brandColor = developerBrand?.color || "#000000";

  return (
    <form className="space-y-4" action="/api/dev/lead" method="POST">
      <input type="hidden" name="developmentId" value={developmentId} />

      <div>
        <Label htmlFor="name">Nume</Label>
        <Input id="name" name="name" placeholder="Ionescu Andrei" />
      </div>

      <div>
        <Label htmlFor="contact">Email sau telefon *</Label>
        <Input
          id="contact"
          name="contact"
          placeholder="andrei@example.com sau 0721123456"
          required
        />
      </div>

      <div>
        <Label htmlFor="message">Mesaj</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="Sunt interesat de apartamentul..."
          rows={4}
        />
      </div>

      <Button type="submit" className="w-full" style={{ backgroundColor: brandColor }}>
        Trimite solicitare
      </Button>

      <p className="text-xs text-gray-500">
        Prin trimiterea formularului, datele tale vor fi transmise către dezvoltator pentru
        procesarea cererii. Citește{" "}
        <a href="/privacy" className="underline">
          politica de confidențialitate
        </a>
        .
      </p>
    </form>
  );
}
