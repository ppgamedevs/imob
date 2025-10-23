import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Raport Evaluare Proprietate",
};

export default async function OwnerReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await prisma.ownerLead.findUnique({
    where: { id },
  });

  if (!lead) notFound();

  // Track view event
  await prisma.ownerLeadEvent.create({
    data: {
      leadId: lead.id,
      kind: "view",
      meta: {},
    },
  });

  const hasCalculations = lead.avmMid !== null;

  // Recommendations based on condition and features
  const recommendations = [];
  if (lead.conditionScore && lead.conditionScore < 0.5) {
    recommendations.push({
      title: "Renovare ușoară",
      description: "Zugrăvit, parchet lustruit și renovare baie pot crește prețul cu 5-8%",
    });
  }
  if (!lead.yearBuilt || lead.yearBuilt < 1990) {
    recommendations.push({
      title: "Modernizare",
      description:
        "Termoficare modernă, geamuri termopan și centrală termică pot aduce un plus de 3-5%",
    });
  }
  recommendations.push({
    title: "Fotografii profesionale",
    description:
      "Anunțurile cu fotografii de calitate se vând cu 20% mai repede și la prețuri mai mari",
  });
  recommendations.push({
    title: "Descriere completă",
    description: "Include toate detaliile: poziție ferestre, boxă, parcare, acces metrou, magazine",
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/vinde">
          <Button variant="outline" size="sm">
            ← Înapoi
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Raport Evaluare Proprietate</h1>
        <p className="text-muted-foreground">
          {lead.areaSlug && <span className="capitalize">{lead.areaSlug.replace(/-/g, " ")}</span>}
          {lead.areaSlug && lead.addressHint && " • "}
          {lead.addressHint}
        </p>
      </div>

      {!hasCalculations && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <p className="text-sm">
              Calculele sunt în curs de procesare. Reîncarcă pagina în câteva momente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Suggested Price - Hero */}
      {lead.priceSuggested && (
        <Card className="mb-6 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Preț Recomandat</span>
              <Badge variant="default" className="text-lg py-1 px-3">
                {lead.priceSuggested.toLocaleString()} €
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Bazat pe analiza pieței pentru zona ta. Acest preț maximizează șansele de vânzare
              rapidă la valoare de piață.
            </p>
          </CardContent>
        </Card>
      )}

      {/* AVM Band */}
      {lead.avmLow && lead.avmMid && lead.avmHigh && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Interval AVM (Automated Valuation Model)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Minim</span>
                <span className="text-lg">{lead.avmLow.toLocaleString()} €</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Mediu</span>
                <span className="text-lg font-bold text-primary">
                  {lead.avmMid.toLocaleString()} €
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Maxim</span>
                <span className="text-lg">{lead.avmHigh.toLocaleString()} €</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                Intervalul AVM reprezintă unde se încadrează majoritatea apartamentelor similare din
                zona ta. Evaluarea este bazată pe suprafață, an construcție, zonă și stare.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* TTS */}
        {lead.ttsBucket && (
          <Card>
            <CardHeader>
              <CardTitle>Timp estimat până la vânzare</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">{lead.ttsBucket}</div>
              <p className="text-sm text-muted-foreground">
                La prețul recomandat, apartamentul se poate vinde în acest interval.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Yield */}
        {lead.estRent && lead.yieldNet && (
          <Card>
            <CardHeader>
              <CardTitle>Potențial închiriere</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="text-sm text-muted-foreground">Chirie estimată</div>
                  <div className="text-xl font-bold">{lead.estRent.toLocaleString()} € / lună</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Randament net anual</div>
                  <div className="text-xl font-bold">{(lead.yieldNet * 100).toFixed(1)}%</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Calculat după cheltuieli operaționale (întreținere, taxe, reparații)
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Property Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Detalii proprietate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {lead.rooms && (
              <div>
                <div className="text-muted-foreground">Camere</div>
                <div className="font-semibold">{lead.rooms}</div>
              </div>
            )}
            {lead.areaM2 && (
              <div>
                <div className="text-muted-foreground">Suprafață</div>
                <div className="font-semibold">{lead.areaM2} m²</div>
              </div>
            )}
            {lead.yearBuilt && (
              <div>
                <div className="text-muted-foreground">An construcție</div>
                <div className="font-semibold">{lead.yearBuilt}</div>
              </div>
            )}
            {lead.conditionScore && (
              <div>
                <div className="text-muted-foreground">Stare</div>
                <div className="font-semibold">
                  {lead.conditionScore < 0.5
                    ? "Necesită renovare"
                    : lead.conditionScore < 0.75
                      ? "Decentă"
                      : "Modernă"}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Recomandări pentru maximizarea prețului</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex gap-3">
                  <div className="text-primary mt-0.5">✓</div>
                  <div>
                    <div className="font-medium">{rec.title}</div>
                    <div className="text-sm text-muted-foreground">{rec.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acțiuni</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Link href={`/api/owner/${lead.id}/pdf`} target="_blank" className="flex-1">
            <Button variant="outline" className="w-full">
              📄 Descarcă PDF
            </Button>
          </Link>
          <Link href={`/vinde`} className="flex-1">
            <Button variant="secondary" className="w-full">
              🔄 Evaluare nouă
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="mt-8 p-4 bg-muted rounded-lg text-xs text-muted-foreground">
        <p>
          <strong>Notă:</strong> Evaluarea este realizată automat pe baza datelor de piață
          disponibile și nu constituie consultanță financiară sau imobiliară profesională. Prețul
          final de vânzare poate varia în funcție de condiții specifice pieței, negociere și factori
          individuali. Pentru o evaluare oficială, consultă un expert evaluat autorizat.
        </p>
      </div>
    </div>
  );
}
