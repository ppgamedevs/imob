import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  hasPrice: boolean;
  hasArea: boolean;
  hasRooms: boolean;
  hasFloor: boolean;
  hasYear: boolean;
  hasAddress: boolean;
  hasCoords: boolean;
  hasPhotos: boolean;
  compsCount: number;
  confidenceLevel?: string | null;
  seismicLevel?: string | null;
}

const CHECK = "✓";
const WARN = "!";

export default function DataInsightsSection(props: Props) {
  const known: string[] = [];
  const missing: string[] = [];
  const alerts: string[] = [];

  if (props.hasPrice) known.push("Pret");
  else missing.push("Pretul nu a fost detectat din anunt");

  if (props.hasArea) known.push("Suprafata");
  else missing.push("Suprafata utila nu a fost detectata");

  if (props.hasRooms) known.push("Numar camere");
  else missing.push("Numarul de camere nu a fost detectat");

  if (props.hasFloor) known.push("Etaj");
  else missing.push("Etajul nu a fost detectat");

  if (props.hasYear) known.push("Anul constructiei");
  else missing.push("Anul constructiei nu este specificat");

  if (props.hasAddress) known.push("Adresa");
  else missing.push("Adresa nu a fost detectata");

  if (props.hasCoords) known.push("Localizare GPS");
  else missing.push("Nu am putut localiza proprietatea pe harta");

  if (props.hasPhotos) known.push("Fotografii");
  else missing.push("Nu exista fotografii in anunt");

  if (props.compsCount > 3) {
    known.push(`${props.compsCount} comparabile gasite`);
  } else if (props.compsCount > 0) {
    alerts.push(`Doar ${props.compsCount} comparabile gasite - estimarea este orientativa`);
  } else {
    alerts.push("Nu am gasit comparabile suficiente in zona. Estimarea este orientativa.");
  }

  if (props.confidenceLevel === "low") {
    alerts.push("Nivelul de incredere al estimarii este scazut - datele disponibile sunt limitate");
  }

  const sl = props.seismicLevel;
  if (sl === "RS1" || sl === "RsI") {
    alerts.push("Cladirea este in clasa de risc seismic RsI (bulina rosie) - se recomanda verificarea documentelor de consolidare");
  } else if (sl === "RS2" || sl === "RsII") {
    alerts.push("Cladirea este in clasa de risc seismic RsII - se recomanda verificarea starii structurale");
  } else if (sl === "RS3" || sl === "RsIII") {
    alerts.push("Cladirea are degradari structurale identificate (RsIII) - monitorizare recomandata");
  }

  const completeness = Math.round((known.length / (known.length + missing.length)) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Radiografia anuntului</CardTitle>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            completeness >= 80 ? "bg-green-100 text-green-800" :
            completeness >= 50 ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          }`}>
            {completeness}% complet
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {known.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Ce stim</div>
            <div className="flex flex-wrap gap-1.5">
              {known.map((k) => (
                <span key={k} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                  <span>{CHECK}</span> {k}
                </span>
              ))}
            </div>
          </div>
        )}

        {missing.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Ce lipseste</div>
            <ul className="space-y-1">
              {missing.map((m) => (
                <li key={m} className="text-xs text-orange-700 flex items-start gap-1.5">
                  <span className="text-orange-500 mt-0.5">{WARN}</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {alerts.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">De stiut</div>
            <ul className="space-y-1">
              {alerts.map((a) => (
                <li key={a} className="text-xs text-amber-700 flex items-start gap-1.5 font-medium">
                  <span className="text-amber-500 mt-0.5">&#9432;</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
