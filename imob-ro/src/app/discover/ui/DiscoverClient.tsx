"use client";
import { useEffect, useMemo, useRef, useState } from "react";

import { CompsMap } from "@/app/report/[id]/CompsMap";

import { FiltersBar } from "./FiltersBar";
import { ResultsList } from "./ResultsList";

type Item = {
  id: string;
  title?: string | null;
  url?: string | null;
  photo?: string | null;
  priceEur?: number | null;
  areaM2?: number | null;
  rooms?: number | null;
  yearBuilt?: number | null;
  distMetroM?: number | null;
  areaSlug?: string | null;
  eurm2?: number | null;
  priceBadge?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export function DiscoverClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [params, setParams] = useState<any>({ pageSize: 20, underpriced: false });
  const [items, setItems] = useState<Item[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // sync URL
  useEffect(() => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v == null || v === "" || (Array.isArray(v) && !v.length)) continue;
      if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)));
      else p.set(k, String(v));
    }
    history.replaceState(null, "", `/discover?${p.toString()}`);
  }, [params]);

  async function fetchPage(cursor?: string | null) {
    setLoading(true);
    const qs = new URLSearchParams({ ...params });
    if (cursor) qs.set("cursor", cursor);
    const res = await fetch(`/api/discover/search?${qs.toString()}`, { cache: "no-store" });
    const json = await res.json();
    setLoading(false);
    if (!json?.ok) return;
    setItems(cursor ? (prev) => [...prev, ...json.items] : json.items);
    setNextCursor(json.nextCursor ?? null);
  }

  useEffect(() => {
    fetchPage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  // infinite scroll
  const guardRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = guardRef.current;
    if (!el || !nextCursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) fetchPage(nextCursor);
        });
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextCursor]);

  const center = useMemo(() => {
    const pts = items.filter((i) => i.lat && i.lng);
    if (!pts.length) return { lat: 44.437, lng: 26.102 };
    const lat = pts.reduce((s, i) => s + (i.lat || 0), 0) / pts.length;
    const lng = pts.reduce((s, i) => s + (i.lng || 0), 0) / pts.length;
    return { lat, lng };
  }, [items]);

  return (
    <div className="grid md:grid-cols-[360px,1fr] gap-4">
      <div className="space-y-3">
        <FiltersBar value={params} onChange={setParams} />
        <ResultsList items={items} onHover={setHoverId} loading={loading} />
        <div ref={guardRef} />
      </div>
      <div className="sticky top-4 h-[70vh]">
        <CompsMap
          items={items.map((i) => ({ id: i.id, lat: i.lat, lng: i.lng }))}
          center={center}
          hoverId={hoverId}
        />
      </div>
    </div>
  );
}
