import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NearbyBuilding {
  address: string;
  riskClass: string;
  distanceM: number;
  intervention: string | null;
}

interface Props {
  riskClass?: string | null;
  confidence?: number | null;
  method?: string | null;
  note?: string | null;
  sourceUrl?: string | null;
  matchedAddress?: string | null;
  intervention?: string | null;
  nearby?: {
    total: number;
    rsI: number;
    rsII: number;
    buildings: NearbyBuilding[];
  } | null;
}

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string; description: string }> = {
  RsI: {
    label: "RsI - Risc major",
    color: "text-red-800",
    bg: "bg-red-50 border-red-200",
    icon: "🔴",
    description: "Cladire cu risc seismic major (bulina rosie). Necesita consolidare urgenta.",
  },
  RsII: {
    label: "RsII - Risc semnificativ",
    color: "text-orange-800",
    bg: "bg-orange-50 border-orange-200",
    icon: "🟠",
    description: "Cladire cu risc seismic semnificativ. Se recomanda verificarea expertizei tehnice.",
  },
  RsIII: {
    label: "RsIII - Risc moderat",
    color: "text-yellow-800",
    bg: "bg-yellow-50 border-yellow-200",
    icon: "🟡",
    description: "Degradari structurale identificate, risc moderat. Monitorizare recomandata.",
  },
  RsIV: {
    label: "RsIV - Susceptibilitate redusa",
    color: "text-blue-800",
    bg: "bg-blue-50 border-blue-200",
    icon: "🔵",
    description: "Susceptibilitate seismica redusa conform expertizei.",
  },
};

function confidenceLabel(conf: number): string {
  if (conf >= 0.9) return "Potrivire exacta (adresa + numar)";
  if (conf >= 0.7) return "Potrivire buna (strada + proximitate)";
  if (conf >= 0.5) return "Potrivire partiala - verificati manual";
  if (conf >= 0.3) return "Estimare pe baza anului constructiei";
  return "Date insuficiente";
}

function confidenceBadge(conf: number): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  if (conf >= 0.9) return { label: `${Math.round(conf * 100)}%`, variant: "default" };
  if (conf >= 0.6) return { label: `${Math.round(conf * 100)}%`, variant: "secondary" };
  return { label: `${Math.round(conf * 100)}%`, variant: "outline" };
}

export default function SeismicSection({
  riskClass,
  confidence,
  method,
  note,
  sourceUrl,
  matchedAddress,
  intervention,
  nearby,
}: Props) {
  const config = riskClass ? RISK_CONFIG[riskClass] : null;
  const isInList = config != null;
  const conf = confidence ?? 0;
  const confBadge = confidenceBadge(conf);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Status risc seismic</CardTitle>
          {isInList && conf > 0 && (
            <Badge variant={confBadge.variant} className="text-xs">
              Incredere: {confBadge.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main status */}
        {isInList && config ? (
          <div className={`rounded-lg border p-3 ${config.bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{config.icon}</span>
              <span className={`font-semibold text-sm ${config.color}`}>{config.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            {intervention && (
              <div className="mt-2 text-xs">
                <span className="font-medium">Status interventie: </span>
                <Badge variant="outline" className="text-xs">
                  {intervention === "consolidat" ? "Consolidat" :
                   intervention === "in lucru" ? "Lucrari in curs" :
                   intervention === "proiect" ? "Proiect consolidare" :
                   intervention}
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">&#10004;</span>
              <span className="font-semibold text-sm text-green-800">
                Nu apare in lista publica AMCCRS
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Imobilul nu a fost identificat in lista cladirilor expertizate tehnic publicata de AMCCRS.
            </p>
          </div>
        )}

        {/* Match details */}
        {method && method !== "heuristic" && (
          <div className="text-xs space-y-1">
            {matchedAddress && (
              <div>
                <span className="text-muted-foreground">Adresa potrivita: </span>
                <span className="font-medium">{matchedAddress}</span>
              </div>
            )}
            <div className="text-muted-foreground">
              {confidenceLabel(conf)}
            </div>
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline inline-block"
              >
                Sursa: AMCCRS
              </a>
            )}
          </div>
        )}

        {/* Heuristic note */}
        {method === "heuristic" && note && (
          <div className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
            {note}
          </div>
        )}

        {/* Nearby risk buildings */}
        {nearby && nearby.total > 0 && (
          <div className="border-t pt-3">
            <div className="text-xs font-medium mb-2">
              Risc seismic in zona (raza 200m)
            </div>
            <div className="flex gap-3 mb-2">
              {nearby.rsI > 0 && (
                <div className="text-xs">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />
                  {nearby.rsI} {nearby.rsI === 1 ? "imobil" : "imobile"} RsI
                </div>
              )}
              {nearby.rsII > 0 && (
                <div className="text-xs">
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1" />
                  {nearby.rsII} {nearby.rsII === 1 ? "imobil" : "imobile"} RsII
                </div>
              )}
              {nearby.total - nearby.rsI - nearby.rsII > 0 && (
                <div className="text-xs">
                  <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1" />
                  {nearby.total - nearby.rsI - nearby.rsII} alte imobile
                </div>
              )}
            </div>
            {nearby.buildings.length > 0 && (
              <ul className="space-y-1">
                {nearby.buildings.map((b, i) => (
                  <li key={i} className="text-xs flex items-start gap-2">
                    <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                      b.riskClass === "RsI" ? "bg-red-500" :
                      b.riskClass === "RsII" ? "bg-orange-500" :
                      "bg-yellow-500"
                    }`} />
                    <span className="text-muted-foreground">
                      {b.address} ({b.riskClass}) - {b.distanceM}m
                      {b.intervention ? ` [${b.intervention}]` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Legal disclaimer */}
        <p className="text-[10px] text-muted-foreground border-t pt-2">
          Datele provin din liste publice oficiale (AMCCRS - PMB). Lipsa din lista nu garanteaza absenta riscului seismic. Pentru o evaluare completa, consultati un expert tehnic atestat.
        </p>
      </CardContent>
    </Card>
  );
}
