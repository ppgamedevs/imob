import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  priceRange: { low: number; high: number; mid: number; conf: number } | null;
  actualPrice?: number | null;
  confidence?: { level: string; score: number } | null;
}

export default function VerdictSection({ priceRange, actualPrice, confidence }: Props) {
  if (!priceRange) {
    return (
      <Card>
        <CardHeader><CardTitle>Verdict pret</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Date insuficiente pentru estimare.</CardContent>
      </Card>
    );
  }

  const { low, high, mid } = priceRange;
  let verdict: "Subevaluat" | "Pret corect" | "Supraevaluat" = "Pret corect";
  let overpricingPct = 0;
  let badgeVariant: "default" | "secondary" | "destructive" = "default";

  if (actualPrice) {
    overpricingPct = Math.round(((actualPrice - mid) / mid) * 100);
    if (actualPrice < low) {
      verdict = "Subevaluat";
      badgeVariant = "default";
    } else if (actualPrice > high) {
      verdict = "Supraevaluat";
      badgeVariant = "destructive";
    } else {
      verdict = "Pret corect";
      badgeVariant = "secondary";
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Verdict pret</CardTitle>
          {confidence && (
            <Badge variant="outline" className="text-xs">
              Incredere: {confidence.level === "high" ? "ridicata" : confidence.level === "medium" ? "medie" : "scazuta"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-3">
          <Badge variant={badgeVariant} className="text-base px-3 py-1">
            {verdict}
          </Badge>
          {actualPrice && overpricingPct !== 0 && (
            <span className="text-sm text-muted-foreground">
              {overpricingPct > 0 ? "+" : ""}{overpricingPct}% fata de estimare
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Minim estimat</div>
            <div className="font-semibold">{low.toLocaleString("ro-RO")} EUR</div>
          </div>
          <div>
            <div className="text-muted-foreground">Estimare medie</div>
            <div className="font-semibold">{mid.toLocaleString("ro-RO")} EUR</div>
          </div>
          <div>
            <div className="text-muted-foreground">Maxim estimat</div>
            <div className="font-semibold">{high.toLocaleString("ro-RO")} EUR</div>
          </div>
        </div>
        {actualPrice && (
          <div className="mt-3 pt-3 border-t text-sm">
            <span className="text-muted-foreground">Pret cerut: </span>
            <span className="font-semibold">{actualPrice.toLocaleString("ro-RO")} EUR</span>
          </div>
        )}
        {confidence?.level === "low" && (
          <div className="mt-3 text-xs text-amber-600 bg-amber-50 rounded p-2">
            Estimare orientativa - date insuficiente in zona. Rezultatele pot varia semnificativ.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
