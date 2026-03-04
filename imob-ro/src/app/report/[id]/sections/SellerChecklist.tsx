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
  llmRedFlags?: string[] | null;
  llmCondition?: string | null;
  llmBalconyM2?: number | null;
  description?: string | null;
}

interface Item {
  text: string;
  tip?: string;
}

export default function SellerChecklist(props: Props) {
  const questions: Item[] = [];
  const tips: Item[] = [];

  const descLower = (props.description ?? "").toLowerCase();
  const titleLower = (props.title ?? "").toLowerCase();
  const mentionsNeighbors = descLower.includes("vecin") || titleLower.includes("vecin") || descLower.includes("linist");

  // ---- Questions for the seller ----

  const areaGap = props.titleAreaM2 && props.areaM2
    ? props.titleAreaM2 - props.areaM2
    : null;
  const hasAreaDiscrepancy = areaGap != null && areaGap >= 3;

  if (hasAreaDiscrepancy) {
    questions.push({
      text: `In titlu apare ${props.titleAreaM2} mp, dar suprafata din anunt este ${props.areaM2} mp. Care este suprafata utila reala?`,
      tip: `Diferenta de ${areaGap} mp poate proveni din balcon, terasa sau boxa. Cereti suprafata utila conform actelor (CF sau cadastru).`,
    });
  } else if (!props.hasArea) {
    questions.push({
      text: "Care este suprafata utila exacta (conform cadastru)?",
      tip: "Cereti suprafata din CF (Cartea Funciara), nu din anunt.",
    });
  }

  if (props.llmBalconyM2 && props.areaM2 && props.llmBalconyM2 > 0) {
    const pct = Math.round((props.llmBalconyM2 / props.areaM2) * 100);
    if (pct > 15 || hasAreaDiscrepancy) {
      questions.push({
        text: `Balconul de ${props.llmBalconyM2} mp este inclus in suprafata utila din acte?`,
        tip: "Balconul se calculeaza cu coeficient 0.5 (un balcon de 6 mp = 3 mp suprafata utila). Verificati in CF.",
      });
    }
  }

  if (!props.hasFloor) {
    questions.push({ text: "La ce etaj se afla apartamentul?" });
  }

  if (!props.yearBuilt) {
    questions.push({ text: "In ce an a fost construita cladirea?" });
  }

  if (props.yearBuilt && props.yearBuilt < 1980) {
    questions.push({
      text: "Expertiza tehnica a cladirii este disponibila?",
      tip: props.yearBuilt < 1940
        ? "Cladirile de dinainte de 1940 au risc seismic ridicat. Cereti expertiza tehnica."
        : "Cladirile construite inainte de 1977 au trecut prin cutremurul din '77. Verificati starea structurala.",
    });
  }

  if (props.seismicAttention) {
    questions.push({
      text: "S-au efectuat lucrari de consolidare?",
      tip: "Cereti documentele de consolidare. Apartamentele din cladiri consolidate pot avea restrictii la modificari interioare.",
    });
  }

  if (!props.hasPhotos) {
    questions.push({
      text: "Puteti trimite fotografii recente ale apartamentului?",
      tip: "Lipsa pozelor poate indica o stare necorespunzatoare sau un anunt vechi.",
    });
  }

  if (!props.hasAddress || !props.hasCoords) {
    questions.push({
      text: "Care este adresa exacta a proprietatii?",
      tip: "Fara adresa exacta nu puteti verifica cartea funciara sau riscul seismic.",
    });
  }

  if (props.overpricingPct != null && props.overpricingPct > 15) {
    questions.push({
      text: "Pretul include mobila si electrocasnicele? Este negociabil?",
      tip: `Apartamentul este listat cu ~${props.overpricingPct}% peste estimarea de piata.`,
    });
  }

  if (!mentionsNeighbors) {
    questions.push({
      text: "Cum sunt vecinii? Exista probleme cu zgomotul?",
      tip: "Intrebati despre vecinii directi (sus, jos, lateral) si daca au existat conflicte in asociatie.",
    });
  }

  if (props.yearBuilt && props.yearBuilt < 2000) {
    questions.push({
      text: "Exista datorii la asociatia de proprietari?",
      tip: "Cereti un extras de la asociatie cu situatia platilor. Datoriile proprietarului anterior pot deveni problema dumneavoastra.",
    });
  }

  questions.push({
    text: "Extras CF actualizat disponibil?",
    tip: "CF trebuie sa fie emisa in ultimele 30 de zile. Verificati: proprietarul, sarcini (ipoteci, sechestre), suprafata.",
  });

  if (props.areaM2 && props.areaM2 > 0) {
    questions.push({
      text: "Cat este intretinerea lunara si ce include?",
      tip: "Cereti ultimele 3 facturi de intretinere. Pot include fond de reparatii, lift, curatenie, utilitati comune.",
    });
  }

  // ---- LLM-derived questions (skip commission flags - they're self-explanatory) ----
  if (props.llmRedFlags && props.llmRedFlags.length > 0) {
    for (const flag of props.llmRedFlags.slice(0, 3)) {
      const lower = flag.toLowerCase();
      if (lower.includes("comision")) continue;
      const isNoDoc = lower.includes("cf") || lower.includes("acte");
      questions.push({
        text: isNoDoc
          ? `Problema posibila cu actele: "${flag}". Care este situatia juridica?`
          : `Clarificati: ${flag}`,
        tip: "Semnal detectat automat din textul anuntului.",
      });
    }
  }

  if (props.llmCondition === "necesita_renovare" || props.llmCondition === "de_renovat") {
    questions.push({
      text: "Ce lucrari de renovare sunt necesare si care este costul estimat?",
      tip: "Anuntul sugereaza nevoie de renovare. Estimati bugetul (10.000-25.000 EUR pentru renovare completa in Bucuresti).",
    });
  }

  // ---- Tips (not questions for the seller) ----
  if (props.compsCount != null && props.compsCount < 3) {
    tips.push({
      text: "Putine comparabile in zona - solicitati o evaluare independenta",
      tip: "Am gasit sub 3 proprietati similare in zona. Estimarea are o marja de eroare mai mare. Un evaluator ANEVAR poate oferi o evaluare precisa.",
    });
  }

  tips.push({
    text: "Verificati actele de proprietate cu un specialist",
    tip: "Contract de vanzare-cumparare, CF actualizat, certificat fiscal de la Primarie (fara datorii), certificat energetic (obligatoriu la vanzare).",
  });

  if (props.yearBuilt && props.yearBuilt < 1990) {
    tips.push({
      text: "Verificati instalatiile electrice si sanitare",
      tip: "La cladiri vechi, instalatiile pot necesita inlocuire completa (cost suplimentar de 3.000-8.000 EUR).",
    });
  }

  tips.push({
    text: "Vizitati apartamentul la ore diferite",
    tip: "Verificati lumina naturala dimineata si dupa-amiaza, zgomotul in ore de varf si seara.",
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Intrebari pentru vanzator</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {questions.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 text-amber-500 shrink-0 text-sm">&#10148;</span>
                <div className="min-w-0">
                  <span className="text-sm font-medium">{item.text}</span>
                  {item.tip && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {item.tip}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {tips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sfaturi utile</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {tips.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500 shrink-0">&#9432;</span>
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{item.text}</span>
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
              Lista generata pe baza informatiilor disponibile. Verifica intotdeauna documentele cu un specialist imobiliar sau un avocat.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
