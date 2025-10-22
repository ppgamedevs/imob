import { format } from "date-fns";

interface DailyPoint {
  date: Date;
  pricePerSqm: number | null;
  supply: number;
}

export function TrendLines({ series }: { series: DailyPoint[] }) {
  if (!series || series.length === 0) {
    return <div className="text-sm text-muted-foreground">Nu există date suficiente.</div>;
  }

  const sorted = [...series].sort((a, b) => a.date.getTime() - b.date.getTime());

  const maxSupply = Math.max(...sorted.map((d) => d.supply || 0), 1);

  return (
    <div className="space-y-2 text-xs">
      <div className="grid grid-cols-[100px,1fr,80px,80px] gap-2 font-medium text-muted-foreground">
        <div>Dată</div>
        <div>Ofertă (vizual)</div>
        <div className="text-right">Preț €/m²</div>
        <div className="text-right">Ofertă</div>
      </div>

      {sorted.slice(-12).map((d, i) => {
        const pct = maxSupply > 0 ? ((d.supply || 0) / maxSupply) * 100 : 0;
        return (
          <div key={i} className="grid grid-cols-[100px,1fr,80px,80px] gap-2 items-center">
            <div className="text-muted-foreground">{format(d.date, "dd MMM yyyy")}</div>
            <div>
              <div
                className="h-2 rounded bg-green-500/30"
                style={{ width: `${pct}%`, minWidth: pct > 0 ? "2px" : "0" }}
              />
            </div>
            <div className="text-right">{d.pricePerSqm ? `€${d.pricePerSqm}` : "—"}</div>
            <div className="text-right">{d.supply ?? 0}</div>
          </div>
        );
      })}
    </div>
  );
}
