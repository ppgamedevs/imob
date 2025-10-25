"use client";
import { useState } from "react";

export function ResultsList({
  items,
  onHover,
  loading,
}: {
  items: any[];
  onHover?: (id: string | null) => void;
  loading?: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {items.map((x) => (
        <a
          key={x.id}
          href={x.url || `/report/${x.id}`}
          target={x.url ? "_blank" : "_self"}
          onMouseEnter={() => {
            setActive(x.id);
            onHover?.(x.id);
          }}
          onMouseLeave={() => {
            setActive(null);
            onHover?.(null);
          }}
          className={`flex gap-3 border rounded-xl p-2 hover:shadow transition ${active === x.id ? "ring-2 ring-primary" : ""}`}
        >
          {x.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={x.photo} alt="" className="h-20 w-28 object-cover rounded bg-muted" />
          ) : (
            <div className="h-20 w-28 rounded bg-muted" />
          )}
          <div className="text-sm flex-1">
            <div className="font-medium line-clamp-1 flex items-center gap-2">
              {x.title || "Anunț"}
              {x.dupCount > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 bg-muted rounded">
                  +{x.dupCount} surse
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{x.areaSlug || "București"}</div>
            <div className="mt-1">
              {x.priceEur?.toLocaleString("ro-RO")} € · {x.areaM2} m² · {x.rooms ?? "?"} cam ·{" "}
              {x.yearBuilt ?? "—"}
              {x.trustBadge ? (
                <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded bg-muted">
                  {x.trustBadge}
                </span>
              ) : null}
              {x.flags && x.flags.length > 0 ? (
                <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  ⚠ {x.flags.length}
                </span>
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground">
              {x.eurm2 ? `${Math.round(x.eurm2)} €/m²` : "—"} ·{" "}
              {x.distMetroM != null ? `${x.distMetroM} m metrou` : "—"}{" "}
              {x.priceBadge ? `· ${x.priceBadge}` : ""}
            </div>
          </div>
        </a>
      ))}
      {loading ? <div className="text-xs text-muted-foreground">Se încarcă…</div> : null}
    </div>
  );
}
