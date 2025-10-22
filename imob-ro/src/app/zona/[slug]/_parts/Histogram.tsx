export function Histogram({ data }: { data: { bucket: number; count: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="text-sm text-muted-foreground">Nu există date suficiente.</div>;
  }

  const maxCount = Math.max(...data.map((b) => b.count));

  return (
    <div className="space-y-1">
      {data.map((item, i) => {
        const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-16 text-right text-muted-foreground">€{item.bucket}</div>
            <div className="flex-1">
              <div
                className="h-4 rounded bg-blue-500/20"
                style={{ width: `${pct}%`, minWidth: pct > 0 ? "2px" : "0" }}
              />
            </div>
            <div className="w-8 text-right text-muted-foreground">{item.count}</div>
          </div>
        );
      })}
    </div>
  );
}
