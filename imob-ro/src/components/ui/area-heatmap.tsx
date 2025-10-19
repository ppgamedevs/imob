import React from "react";

import Sparkline from "@/components/ui/sparkline";

export default function AreaHeatmap({
  score,
  history,
  slug,
}: {
  score: number | null;
  history?: number[] | null;
  slug?: string | null;
}) {
  if (score == null) return <div className="text-sm text-muted-foreground">—</div>;

  const normalized = Math.max(0, score);
  let bg = "bg-gray-300";
  if (normalized === 0) bg = "bg-gray-300";
  else if (normalized < 0.5) bg = "bg-emerald-400";
  else if (normalized < 1) bg = "bg-amber-400";
  else bg = "bg-rose-400";

  return (
    <div className="flex items-center gap-3">
      <a href={slug ? `/area/${slug}` : "#"} className="flex items-center gap-3">
        <div className={`h-6 w-6 rounded-sm ${bg} border`} />
        <div className="text-sm">
          <div className="font-medium">Interes</div>
          <div className="text-xs text-muted-foreground">{(score * 100).toFixed(0)}%</div>
        </div>
      </a>
      {history ? (
        <div className="w-24">
          <Sparkline values={history} width={96} height={20} />
        </div>
      ) : null}
    </div>
  );
}
