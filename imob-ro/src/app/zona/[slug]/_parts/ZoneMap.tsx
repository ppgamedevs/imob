"use client";
import dynamic from "next/dynamic";
import { useMemo } from "react";

interface MapItem {
  id: string;
  lat: number | null;
  lng: number | null;
  title: string | null;
  priceEur: number | null;
}

const CompsMap = dynamic(() => import("@/components/CompsMap").then((m) => m.CompsMap), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded bg-muted" />,
});

export function ZoneMap({ items }: { items: MapItem[] }) {
  const points = useMemo(() => {
    return items
      .filter((it) => it.lat && it.lng)
      .map((it) => ({
        id: it.id,
        lat: it.lat,
        lng: it.lng,
        title: it.title || "—",
        priceEur: it.priceEur || 0,
      }));
  }, [items]);

  if (points.length === 0) {
    return <div className="text-sm text-muted-foreground">Nicio coordonată disponibilă.</div>;
  }

  return (
    <div className="h-64 w-full overflow-hidden rounded">
      <CompsMap items={points} />
    </div>
  );
}
