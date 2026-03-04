import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LlmTextExtraction, LlmVisionExtraction } from "@/lib/llm/types";

function confidenceLabel(v: number): { text: string; color: string } {
  if (v >= 0.8) return { text: "ridicata", color: "text-green-600" };
  if (v >= 0.5) return { text: "medie", color: "text-amber-600" };
  return { text: "scazuta", color: "text-red-500" };
}

const CONDITION_LABELS: Record<string, string> = {
  nou: "Constructie noua",
  renovat: "Renovat recent",
  locuibil: "Stare buna (locuibil)",
  necesita_renovare: "Necesita renovare",
  de_renovat: "De renovat",
};

interface Props {
  llmText: LlmTextExtraction | null;
  llmVision: LlmVisionExtraction | null;
  isEnriching: boolean;
  showVision: boolean;
  llmFailed?: boolean;
  priceEur?: number | null;
  areaM2?: number | null;
  rooms?: number | null;
  yearBuilt?: number | null;
  zoneMedianEurM2?: number | null;
  avmMid?: number | null;
  floor?: string | null;
}

export default function ListingInsightsSection({ llmText, llmVision, isEnriching, showVision, llmFailed, priceEur, areaM2, rooms, yearBuilt, zoneMedianEurM2, avmMid, floor }: Props) {
  if (isEnriching && !llmText) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analiza detaliata anunt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
            Se analizeaza detaliile anuntului...
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (llmFailed && !llmText) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analiza detaliata anunt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Analiza detaliata nu a putut fi generata pentru acest anunt.
            Datele de baza sunt disponibile in sectiunile de mai sus.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!llmText) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Analiza detaliata anunt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        {llmText.summary && (
          <p className="text-sm leading-relaxed">{llmText.summary}</p>
        )}

        {/* Computed market context */}
        {(() => {
          const insights: string[] = [];
          const eurM2 = priceEur && areaM2 && areaM2 > 0 ? Math.round(priceEur / areaM2) : null;

          if (eurM2 && zoneMedianEurM2 && zoneMedianEurM2 > 0) {
            const diff = Math.round(((eurM2 - zoneMedianEurM2) / zoneMedianEurM2) * 100);
            if (diff > 10) insights.push(`Pretul pe mp (${eurM2} EUR) este cu ${diff}% peste mediana zonei (${Math.round(zoneMedianEurM2)} EUR/mp).`);
            else if (diff < -10) insights.push(`Pretul pe mp (${eurM2} EUR) este cu ${Math.abs(diff)}% sub mediana zonei (${Math.round(zoneMedianEurM2)} EUR/mp) - posibila oportunitate.`);
            else insights.push(`Pretul pe mp (${eurM2} EUR) este in jurul medianei zonei (${Math.round(zoneMedianEurM2)} EUR/mp).`);
          }

          if (yearBuilt) {
            const age = new Date().getFullYear() - yearBuilt;
            if (age <= 5) insights.push(`Constructie recenta (${yearBuilt}) - costuri reduse de mentenanta.`);
            else if (age > 40) insights.push(`Constructie veche (${yearBuilt}, ${age} ani) - verificati starea instalatiilor si structurii.`);
          }

          if (rooms && areaM2) {
            const mpPerRoom = Math.round(areaM2 / rooms);
            if (mpPerRoom < 15) insights.push(`Suprafata medie pe camera de doar ${mpPerRoom} mp - apartament compact.`);
            else if (mpPerRoom > 30) insights.push(`Suprafata generoasa: ${mpPerRoom} mp/camera.`);
          }

          if (avmMid && priceEur) {
            const margin = priceEur - avmMid;
            if (margin > 0) insights.push(`Marja de negociere potentiala: ~${Intl.NumberFormat("ro-RO").format(Math.round(margin))} EUR fata de estimarea pietei.`);
          }

          if (insights.length === 0) return null;
          return (
            <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
              <div className="text-sm font-medium text-slate-700 mb-1">Context piata</div>
              {insights.map((ins, i) => (
                <p key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                  <span className="text-blue-500 mt-0.5 shrink-0">●</span>
                  <span>{ins}</span>
                </p>
              ))}
            </div>
          );
        })()}

        {/* Condition */}
        {llmText.condition && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Stare:</span>
            <span>{CONDITION_LABELS[llmText.condition] ?? llmText.condition}</span>
            {llmText.conditionDetails && (
              <span className="text-muted-foreground">- {llmText.conditionDetails}</span>
            )}
            <ConfidenceBadge value={llmText.fieldConfidence.condition} />
          </div>
        )}

        {/* Key details */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {llmText.heatingType && (
            <Detail label="Incalzire" value={llmText.heatingType.replace(/_/g, " ")} conf={llmText.fieldConfidence.heatingType} />
          )}
          {llmText.balconyM2 != null && (
            <Detail label="Balcon" value={`${llmText.balconyM2} mp`} conf={llmText.fieldConfidence.balconyM2} />
          )}
          {llmText.usableAreaM2 != null && (
            <Detail label="Suprafata utila" value={`${llmText.usableAreaM2} mp`} conf={llmText.fieldConfidence.usableAreaM2} />
          )}
          {llmText.renovationYear && (
            <Detail label="Renovat" value={String(llmText.renovationYear)} conf={llmText.fieldConfidence.renovationYear} />
          )}
          {llmText.hasParking != null && (
            <Detail label="Parcare" value={llmText.hasParking ? "Da" : "Nu"} />
          )}
          {llmText.hasElevator != null && (
            <Detail label="Lift" value={llmText.hasElevator ? "Da" : "Nu"} />
          )}
          {llmText.orientation && (
            <Detail label="Orientare" value={llmText.orientation} />
          )}
          {llmText.buildingType && (
            <Detail label="Tip cladire" value={llmText.buildingType.replace(/_/g, " ")} />
          )}
        </div>

        {/* Red flags */}
        {llmText.redFlags.length > 0 && (
          <div>
            <div className="text-sm font-medium text-red-600 mb-1">Semnale de alarma</div>
            <ul className="space-y-1">
              {llmText.redFlags.map((flag, i) => (
                <li key={i} className="text-sm flex items-start gap-1.5">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">!</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Positives */}
        {llmText.positives.length > 0 && (
          <div>
            <div className="text-sm font-medium text-green-600 mb-1">Puncte forte</div>
            <ul className="space-y-1">
              {llmText.positives.map((pos, i) => (
                <li key={i} className="text-sm flex items-start gap-1.5">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">+</span>
                  <span>{pos}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Evidence quotes */}
        {llmText.evidence.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Citate din anunt ({llmText.evidence.length})
            </summary>
            <div className="mt-2 space-y-1.5">
              {llmText.evidence.map((ev, i) => (
                <div key={i} className="border-l-2 border-muted pl-2">
                  <span className="font-medium">{ev.field}:</span>{" "}
                  <span className="italic text-muted-foreground">&ldquo;{ev.quote}&rdquo;</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Vision section (Pro only) */}
        {showVision && llmVision && (
          <div className="border-t pt-3 mt-3">
            <div className="text-sm font-medium mb-2">Analiza fotografii</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Detail label="Stare (vizual)" value={CONDITION_LABELS[llmVision.condition] ?? llmVision.condition} conf={llmVision.confidence} />
              <Detail label="Mobilare" value={llmVision.furnishing.replace(/_/g, " ")} />
              <Detail label="Luminozitate" value={["Intuneric", "Slab", "Bun", "Foarte luminos"][llmVision.brightness]} />
              {llmVision.layoutQuality && (
                <Detail label="Layout" value={llmVision.layoutQuality} />
              )}
            </div>
            {llmVision.visibleIssues.length > 0 && (
              <div className="mt-2">
                <div className="text-xs font-medium text-red-600 mb-1">Probleme vizibile</div>
                <ul className="text-xs space-y-0.5">
                  {llmVision.visibleIssues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-red-500">!</span> {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {llmVision.evidence && (
              <p className="text-xs text-muted-foreground mt-2 italic">&ldquo;{llmVision.evidence}&rdquo;</p>
            )}
          </div>
        )}

        {/* Seller motivation */}
        {llmText.sellerMotivation && llmText.sellerMotivation !== "normal" && (
          <div className="text-sm border-t pt-2">
            <span className="font-medium">Motivatie vanzator:</span>{" "}
            <span className={llmText.sellerMotivation === "foarte_urgent" ? "text-red-600 font-medium" : "text-amber-600"}>
              {llmText.sellerMotivation === "foarte_urgent" ? "Foarte urgent" : "Urgent"}
            </span>
            <ConfidenceBadge value={llmText.fieldConfidence.sellerMotivation} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Detail({ label, value, conf }: { label: string; value: string; conf?: number }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-medium">{value}</span>
      {conf != null && <ConfidenceBadge value={conf} />}
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const { text, color } = confidenceLabel(value);
  const tooltip =
    value >= 0.8
      ? "Informatia a fost gasita explicit in textul anuntului"
      : value >= 0.5
        ? "Informatia a fost dedusa din context, poate necesita verificare"
        : "Informatia este incerta - recomandam verificarea cu vanzatorul";
  return (
    <span className={`ml-1 text-[10px] ${color} cursor-help`} title={tooltip}>({text})</span>
  );
}
