"use client";
import { useMemo } from "react";

type P = {
  id: string;
  lat?: number | null;
  lng?: number | null;
};

function norm(points: { x: number; y: number }[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  return points.map((p) => ({
    x: (p.x - minX) / w,
    y: (p.y - minY) / h,
  }));
}

export function CompsMap({
  items,
  center,
  hoverId,
}: {
  items: P[];
  center?: { lat?: number | null; lng?: number | null };
  hoverId?: string | null;
}) {
  // Simple equirectangular-ish projection for a small neighborhood box
  const pts = useMemo(() => {
    const all = [
      ...(center?.lat && center?.lng
        ? [{ id: "subject", lat: center.lat!, lng: center.lng! }]
        : []),
      ...items.filter((i) => i.lat && i.lng),
    ];
    if (!all.length) return [];
    const baseLat = all[0].lat!;
    const R = Math.cos((baseLat * Math.PI) / 180); // longitude scale
    const raw = all.map((i) => ({
      id: i.id || "subject",
      x: i.lng! * R,
      y: i.lat!,
      isSubject: i.id === "subject",
    }));
    const uv = norm(raw.map(({ x, y }) => ({ x, y })));
    return raw.map((r, i) => ({
      id: r.id,
      isSubject: r.isSubject,
      x: uv[i].x,
      y: 1 - uv[i].y, // flip Y for SVG
    }));
  }, [items, center]);

  if (!pts.length) {
    return (
      <div className="flex h-56 w-full items-center justify-center rounded-xl border text-xs text-muted-foreground">
        Nicio poziție geografică disponibilă
      </div>
    );
  }

  return (
    <div className="h-56 w-full rounded-xl border bg-white p-2">
      <svg viewBox="0 0 100 100" className="h-full w-full rounded-lg">
        {/* faint grid */}
        {[20, 40, 60, 80].map((g) => (
          <line key={`gx-${g}`} x1={g} y1={0} x2={g} y2={100} stroke="#eee" strokeWidth="0.5" />
        ))}
        {[20, 40, 60, 80].map((g) => (
          <line key={`gy-${g}`} x1={0} y1={g} x2={100} y2={g} stroke="#eee" strokeWidth="0.5" />
        ))}

        {/* subject first */}
        {pts
          .filter((p) => p.id === "subject")
          .map((p) => (
            <circle key="subject" cx={p.x * 100} cy={p.y * 100} r={3.2} fill="#0ea5e9" />
          ))}

        {/* comps */}
        {pts
          .filter((p) => p.id !== "subject")
          .map((p) => {
            const isHover = hoverId && p.id === hoverId;
            return (
              <circle
                key={p.id}
                cx={p.x * 100}
                cy={p.y * 100}
                r={isHover ? 2.6 : 2}
                fill={isHover ? "#0f766e" : "#64748b"}
              />
            );
          })}
      </svg>
    </div>
  );
}
