"use client";
import { useState } from "react";

import { isSafeHttpUrl } from "@/lib/report/comps-section-metrics";

export type CompItem = {
  id: string;
  title?: string | null;
  photo?: string | null;
  sourceUrl?: string | null;
  priceEur?: number | null;
  areaM2?: number | null;
  rooms?: number | null;
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
    <div className="flex flex-col gap-3 sm:flex-row sm:overflow-x-auto sm:pb-1 sm:gap-3">
      {items.map((c) => {
        const activeCls = active === c.id ? "ring-2 ring-primary" : "";
        const hrefOk = isSafeHttpUrl(c.sourceUrl);
        const inner = (
          <>
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
              <div className="font-medium line-clamp-2 sm:line-clamp-1">{c.title || "Anunț comparabil"}</div>
              <div className="tabular-nums">
                {fmtPrice(c.priceEur)} € · {c.areaM2 ? `${c.areaM2} m²` : "—"}
                {c.rooms != null ? ` · ${c.rooms} cam.` : ""}
              </div>
              <div className="text-xs text-muted-foreground">
                {c.eurM2 ? `${Math.round(c.eurM2)} €/m²` : "—"} ·{" "}
                {c.distanceM != null ? `${c.distanceM} m` : "—"}
              </div>
            </div>
          </>
        );

        const cardClass = `w-full min-w-0 sm:min-w-[240px] border rounded-xl p-2 hover:shadow transition text-left ${activeCls}`;

        if (hrefOk && c.sourceUrl) {
          return (
            <a
              key={c.id}
              href={c.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cardClass}
              onMouseEnter={() => {
                setActive(c.id);
                onHover?.(c.id);
              }}
              onMouseLeave={() => {
                setActive(null);
                onHover?.(null);
              }}
            >
              {inner}
            </a>
          );
        }

        return (
          <div
            key={c.id}
            className={cardClass}
            role="group"
            aria-label="Anunț comparabil, fără link valid"
            onMouseEnter={() => {
              setActive(c.id);
              onHover?.(c.id);
            }}
            onMouseLeave={() => {
              setActive(null);
              onHover?.(null);
            }}
          >
            {inner}
            <p className="mt-1 text-[10px] text-amber-700">Link sursă indisponibil</p>
          </div>
        );
      })}
    </div>
  );
}
