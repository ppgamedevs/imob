import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  riskClass?: string | null;
  confidence?: number | null;
  method?: string | null;
  note?: string | null;
  sourceUrl?: string | null;
}

export default function SeismicSection({ riskClass, confidence, method, note, sourceUrl }: Props) {
  const isAttention = riskClass === "RS1" || riskClass === "RS2";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Indicator seismic orientativ</CardTitle>
      </CardHeader>
      <CardContent>
        {riskClass && riskClass !== "Unknown" && riskClass !== "None" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant={isAttention ? "destructive" : "secondary"}>
                {riskClass}
              </Badge>
              {confidence != null && (
                <span className="text-sm text-muted-foreground">
                  {Math.round(confidence * 100)}% incredere
                </span>
              )}
            </div>
            {sourceUrl && (
              <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                Verifica la sursa
              </a>
            )}
            {method && (
              <div className="text-xs text-muted-foreground">Metoda: {method}</div>
            )}
            {note && (
              <div className="text-xs text-muted-foreground">{note}</div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Fara informatie in bazele de date disponibile.
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground border-t pt-2">
          Bazat pe anul constructiei si surse publice disponibile. Nu reprezinta un raport tehnic oficial.
        </p>
      </CardContent>
    </Card>
  );
}
