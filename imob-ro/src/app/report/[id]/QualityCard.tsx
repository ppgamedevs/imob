"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function QualityCard({
  badge,
  score,
  detail,
}: {
  badge?: "Good" | "OK" | "Poor" | string | null;
  score?: number | null;
  detail?: any; // explain.quality
}) {
  const b = (badge || detail?.aggregate?.badge || "").toLowerCase();
  const s = score ?? detail?.aggregate?.score ?? null;
  const cls =
    b === "good"
      ? "bg-emerald-100 text-emerald-800"
      : b === "ok"
        ? "bg-amber-100 text-amber-800"
        : b === "poor"
          ? "bg-rose-100 text-rose-800"
          : "bg-slate-100 text-slate-800";

  const photos = detail?.photos;
  const text = detail?.text;
  const comp = detail?.completeness;
  const flags: string[] = detail?.redflags?.flags ?? [];

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <div className="font-medium">Calitatea anunțului</div>
          <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${cls}`}>
            {badge ?? detail?.aggregate?.badge ?? "—"} {s != null ? ` · ${s}/100` : ""}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="border rounded-lg p-2">
          <div className="font-medium mb-1">Fotografii</div>
          <div>{photos?.count ?? 0} imagini</div>
          <div>rez. ok: {photos?.goodRes ?? 0}%</div>
          <div>landscape: {photos?.landscapeRatio ?? 0}%</div>
        </div>
        <div className="border rounded-lg p-2">
          <div className="font-medium mb-1">Text</div>
          <div>titlu: {text?.titleLen ?? 0} caractere</div>
          <div>descriere: {text?.descLen ?? 0} caractere</div>
          <div>lexical: {Math.round((text?.lexical ?? 0) * 100)}%</div>
        </div>
        <div className="border rounded-lg p-2">
          <div className="font-medium mb-1">Completitudine</div>
          <div>
            {comp?.filled?.length ?? 0} /{" "}
            {(comp?.filled?.length ?? 0) + (comp?.missing?.length ?? 0)}
          </div>
          {comp?.missing?.length ? (
            <div className="text-xs text-muted-foreground mt-1">
              Lipsesc: {comp.missing.slice(0, 3).join(", ")}
            </div>
          ) : null}
        </div>
      </div>

      {flags.length ? <div className="text-xs text-rose-700">⚠️ {flags.join(" · ")}</div> : null}
    </div>
  );
}
