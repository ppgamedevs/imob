import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  yearBuilt?: number | null;
  hasFloor?: boolean;
  hasAddress?: boolean;
  hasCoords?: boolean;
  hasArea?: boolean;
  hasPhotos?: boolean;
  seismicAttention?: boolean;
  overpricingPct?: number | null;
  compsCount?: number;
  confidenceLevel?: string | null;
  areaM2?: number | null;
  titleAreaM2?: number | null;
  rooms?: number | null;
  title?: string | null;
}

interface ChecklistItem {
  question: string;
  tip?: string;
}

export default function SellerChecklist(props: Props) {
  const items: ChecklistItem[] = [];

  // ---- Surface area education (key differentiator) ----

  const areaGap = props.titleAreaM2 && props.areaM2
    ? props.titleAreaM2 - props.areaM2
    : null;
  const hasAreaDiscrepancy = areaGap != null && areaGap >= 3;

  if (hasAreaDiscrepancy) {
    items.push({
      question: `In titlu apare ${props.titleAreaM2} mp, dar suprafata din anunt este ${props.areaM2} mp. Care este suprafata utila reala?`,
      tip: `Diferenta de ${areaGap} mp poate proveni din balcon, terasa sau boxa. Cereti suprafata utila conform actelor (CF sau cadastru). Balconul se calculeaza de obicei cu coeficient 0.5 (un balcon de 6 mp = doar 3 mp din suprafata utila).`,
    });
  } else if (!props.hasArea) {
    items.push({
      question: "Care este suprafata utila exacta (conform cadastru)?",
      tip: "Cereti suprafata din CF (Cartea Funciara), nu din anunt. Suprafata din anunt poate include balconul sau terasa la valoare intreaga.",
    });
  } else if (props.areaM2 && props.rooms === 1 && props.areaM2 < 35) {
    items.push({
      question: `Suprafata de ${props.areaM2} mp include balconul sau terasa?`,
      tip: "La garsoniere, diferenta de 4-8 mp intre suprafata utila si cea din anunt este foarte frecventa. Verificati in CF.",
    });
  }

  // Always add area education for small apartments
  if (props.areaM2 || hasAreaDiscrepancy) {
    items.push({
      question: "Suprafata utila, construita si totala - care este diferenta?",
      tip: "Suprafata utila = doar interiorul locuintei (fara pereti). Suprafata construita = utila + pereti + cota indiviza. Suprafata totala poate include balcon (coef. 0.5), terasa (coef. 0.4), boxa (coef. 0.3). Intrebati mereu care suprafata e in act.",
    });
  }

  // ---- Standard checks ----

  if (!props.hasFloor) {
    items.push({ question: "La ce etaj se afla apartamentul?" });
  }

  if (!props.yearBuilt) {
    items.push({ question: "In ce an a fost construita cladirea?" });
  }

  if (props.yearBuilt && props.yearBuilt < 1980) {
    items.push({
      question: "Expertiza tehnica a cladirii disponibila?",
      tip: props.yearBuilt < 1940
        ? "Cladirile de dinainte de 1940 au risc seismic ridicat. Cereti expertiza tehnica si verificati daca exista bulina."
        : "Cladirile construite inainte de 1977 au trecut prin cutremurul din '77. Verificati starea structurala.",
    });
  }

  if (props.seismicAttention) {
    items.push({
      question: "S-au efectuat lucrari de consolidare?",
      tip: "Verificati daca cladirea a fost consolidata si cereti documentele aferente. Apartamentele din cladiri consolidate pot avea restrictii la modificari interioare.",
    });
  }

  if (!props.hasPhotos) {
    items.push({
      question: "Solicitati fotografii recente ale proprietatii",
      tip: "Lipsa pozelor poate indica o stare proasta a apartamentului sau un anunt vechi/duplicat.",
    });
  }

  if (!props.hasAddress || !props.hasCoords) {
    items.push({
      question: "Care este adresa exacta a proprietatii?",
      tip: "Fara adresa exacta nu puteti verifica cartea funciara, riscul seismic sau proximitatea fata de surse de zgomot.",
    });
  }

  if (props.overpricingPct != null && props.overpricingPct > 15) {
    items.push({
      question: "Pretul pare peste piata - intrebati motivul si daca e negociabil",
      tip: `Apartamentul este listat cu ~${props.overpricingPct}% peste estimarea noastra de piata. Intrebati daca pretul include mobila/electrocasnice sau daca e negociabil.`,
    });
  }

  if (props.compsCount != null && props.compsCount < 3) {
    items.push({
      question: "Putine comparabile in zona - cereti o evaluare independenta",
      tip: "Am gasit sub 3 proprietati similare in zona. Estimarea noastra are o marja de eroare mai mare. Cereti o evaluare de la un evaluator ANEVAR.",
    });
  }

  items.push({
    question: "Extras CF actualizat disponibil?",
    tip: "Cartea Funciara (CF) trebuie sa fie emisa in ultimele 30 de zile. Verificati: proprietarul e cel din anunt? Exista sarcini (ipoteci, sechestre)? Suprafata din CF corespunde cu cea din anunt?",
  });

  if (props.yearBuilt && props.yearBuilt < 2000) {
    items.push({
      question: "Exista datorii la asociatia de proprietari?",
      tip: "Cereti un extras de la asociatie cu situatia platilor. Datoriile proprietarului anterior pot deveni problema dumneavoastra.",
    });
  }

  items.push({
    question: "Actele de proprietate sunt complete?",
    tip: "Verificati: contract de vanzare-cumparare, CF actualizat, certificat fiscal de la Primarie (fara datorii la impozit), certificat energetic (obligatoriu la vanzare).",
  });

  // Utility costs for informed decision
  if (props.areaM2 && props.areaM2 > 0) {
    items.push({
      question: "Cat este intretinerea lunara si ce include?",
      tip: "Cereti ultimele 3 facturi de intretinere. La blocuri vechi, intretinerea poate include fond de reparatii, lift, curatenie, apa calda centralizata. La blocuri noi, poate fi taxa de administrare separata.",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ce sa intrebi vanzatorul</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 h-4 w-4 rounded border border-border flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-sm font-medium">{item.question}</span>
                {item.tip && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {item.tip}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground border-t pt-3">
          Lista generata pe baza informatiilor disponibile in acest anunt. Verifica intotdeauna documentele cu un specialist imobiliar sau un avocat.
        </p>
      </CardContent>
    </Card>
  );
}
