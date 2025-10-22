"use client";

export function TrustCard({
  score,
  badge,
  reasons,
}: {
  score: number;
  badge: string;
  reasons: { plus?: string[]; minus?: string[] };
}) {
  const colorClass =
    badge === "High"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : badge === "Medium"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">Încredere anunț</div>
        <div className={`rounded px-2 py-1 text-xs ${colorClass}`}>
          {badge} · {score}/100
        </div>
      </div>
      <div className="mt-2 text-xs">
        {reasons?.minus && reasons.minus.length > 0 ? (
          <div className="text-red-600 dark:text-red-400">⚠ {reasons.minus.join(" · ")}</div>
        ) : (
          <div className="text-emerald-700 dark:text-emerald-400">
            Nicio problemă majoră detectată.
          </div>
        )}
        {reasons?.plus && reasons.plus.length > 0 ? (
          <div className="mt-1 text-muted-foreground">+ {reasons.plus.join(" · ")}</div>
        ) : null}
      </div>
    </div>
  );
}
