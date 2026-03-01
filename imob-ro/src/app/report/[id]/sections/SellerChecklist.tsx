import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  yearBuilt?: number | null;
  hasFloor?: boolean;
  seismicAttention?: boolean;
}

export default function SellerChecklist({ yearBuilt, hasFloor, seismicAttention }: Props) {
  const items: string[] = [];

  if (yearBuilt && yearBuilt < 1980) {
    items.push("Expertiza tehnica a cladirii disponibila?");
  }

  if (!hasFloor) {
    items.push("La ce etaj se afla apartamentul?");
  }

  if (seismicAttention) {
    items.push("S-au efectuat lucrari de consolidare?");
  }

  // Always include these
  items.push("Extras CF actualizat disponibil?");
  items.push("Exista datorii la asociatia de proprietari?");
  items.push("Actele de proprietate sunt complete?");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ce sa intrebi vanzatorul</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 h-4 w-4 rounded border border-border flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Lista generata pe baza caracteristicilor proprietatii. Verifica intotdeauna documentele cu un specialist.
        </p>
      </CardContent>
    </Card>
  );
}
