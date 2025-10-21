"use client";
import { useState } from "react";

export type CompItem = {
  id: string;
  title?: string | null;
  photo?: string | null;
  sourceUrl?: string | null;
  priceEur?: number | null;
  areaM2?: number | null;
  eurM2?: number | null;
  distanceM?: number | null;
  score?: number | null;
  lat?: number | null;
  lng?: number | null;
};

function fmtPrice(n?: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("ro-RO");
}

export function CompsCarousel({
  items,
  onHover,
}: {
  items: CompItem[];
  onHover?: (id: string | null) => void;
}) {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {items.map((c) => {
        const activeCls = active === c.id ? "ring-2 ring-primary" : "";
        const href = c.sourceUrl || "#";
        return (
          <a
            key={c.id}
            href={href}
            target={c.sourceUrl ? "_blank" : "_self"}
            rel="noreferrer"
            className={`min-w-[240px] border rounded-xl p-2 hover:shadow transition ${activeCls}`}
            onMouseEnter={() => {
              setActive(c.id);
              onHover?.(c.id);
            }}
            onMouseLeave={() => {
              setActive(null);
              onHover?.(null);
            }}
          >
            {c.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.photo}
                alt=""
                className="h-32 w-full object-cover rounded-lg bg-muted"
                loading="lazy"
              />
            ) : (
              <div className="h-32 w-full rounded-lg bg-muted" />
            )}
            <div className="mt-2 text-sm">
              <div className="font-medium line-clamp-1">{c.title || "Comparabil"}</div>
              <div>
                {fmtPrice(c.priceEur)} € · {c.areaM2 ? `${c.areaM2} m²` : "—"}
              </div>
              <div className="text-xs text-muted-foreground">
                {c.eurM2 ? `${Math.round(c.eurM2)} €/m²` : "—"} ·{" "}
                {c.distanceM != null ? `${c.distanceM} m` : "—"}
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
