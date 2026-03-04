"use client";
import { useMemo } from "react";

type P = {
  id: string;
  lat?: number | null;
  lng?: number | null;
};

export type SeismicPoint = {
  id: string;
  lat: number;
  lng: number;
  riskClass: string;
  addressRaw?: string;
  distanceM?: number;
};

export type POIPoint = {
  id: string;
  lat: number;
  lng: number;
  category: string;
  name: string | null;
  distanceM: number;
};

export type TransportPoint = {
  id: string;
  lat: number;
  lng: number;
  mode: string;
  name: string;
  distanceM: number;
};

const RISK_COLORS: Record<string, string> = {
  RsI: "#dc2626",
  RsII: "#ea580c",
  RsIII: "#ca8a04",
  RsIV: "#2563eb",
};

const POI_COLORS: Record<string, string> = {
  BAR: "#9333ea",
  RESTAURANT: "#c026d3",
  NIGHTCLUB: "#7c3aed",
  PARK: "#16a34a",
  PLAYGROUND: "#22c55e",
  SCHOOL: "#2563eb",
  KINDERGARTEN: "#3b82f6",
  SUPERMARKET: "#ea580c",
  PHARMACY: "#dc2626",
  GYM: "#0d9488",
};

const TRANSPORT_COLORS: Record<string, string> = {
  METRO: "#1d4ed8",
  TRAM: "#059669",
  BUS: "#d97706",
  TROLLEY: "#7c3aed",
};

const POI_LAYER_LABELS: Record<string, { label: string; color: string }> = {
  nightlife: { label: "Baruri / Restaurante", color: "#9333ea" },
  parks: { label: "Parcuri", color: "#16a34a" },
  family: { label: "Scoli / Gradinite", color: "#2563eb" },
  transport: { label: "Transport public", color: "#d97706" },
};

function normalizePoints(points: { x: number; y: number }[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const w = Math.max(1e-9, maxX - minX);
  const h = Math.max(1e-9, maxY - minY);
  return points.map((p) => ({
    x: (p.x - minX) / w,
    y: (p.y - minY) / h,
  }));
}

function DiamondMarker({
  cx, cy, size, fill, title,
}: {
  cx: number; cy: number; size: number; fill: string; title?: string;
}) {
  const d = `M${cx},${cy - size} L${cx + size},${cy} L${cx},${cy + size} L${cx - size},${cy} Z`;
  return (
    <path d={d} fill={fill} fillOpacity={0.75} stroke={fill} strokeWidth={0.3}>
      {title && <title>{title}</title>}
    </path>
  );
}

export function CompsMap({
  items,
  center,
  hoverId,
  seismicBuildings,
  showSeismic,
  poiPoints,
  activePoiLayers,
  transportPoints,
  showTransport,
}: {
  items: P[];
  center?: { lat?: number | null; lng?: number | null };
  hoverId?: string | null;
  seismicBuildings?: SeismicPoint[];
  showSeismic?: boolean;
  poiPoints?: POIPoint[];
  activePoiLayers?: string[];
  transportPoints?: TransportPoint[];
  showTransport?: boolean;
}) {
  const hasPoiLayer = !!(activePoiLayers?.length && poiPoints?.length);
  const hasTransport = !!(showTransport && transportPoints?.length);

  const { compPts, seismicPts, poiPts, transitPts } = useMemo(() => {
    const comps = [
      ...(center?.lat && center?.lng
        ? [{ id: "subject", lat: center.lat!, lng: center.lng! }]
        : []),
      ...items.filter((i) => i.lat && i.lng),
    ];

    const seismic =
      showSeismic && seismicBuildings?.length
        ? seismicBuildings.filter((s) => s.lat && s.lng)
        : [];

    const pois = hasPoiLayer ? poiPoints!.filter((p) => p.lat && p.lng) : [];
    const transit = hasTransport ? transportPoints!.filter((t) => t.lat && t.lng) : [];

    const allForProjection = [
      ...comps.map((c) => ({ lat: c.lat!, lng: c.lng! })),
      ...seismic.map((s) => ({ lat: s.lat, lng: s.lng })),
      ...pois.map((p) => ({ lat: p.lat, lng: p.lng })),
      ...transit.map((t) => ({ lat: t.lat, lng: t.lng })),
    ];

    if (!allForProjection.length) return { compPts: [], seismicPts: [], poiPts: [], transitPts: [] };

    const baseLat = allForProjection[0].lat;
    const R = Math.cos((baseLat * Math.PI) / 180);
    const allRaw = allForProjection.map((p) => ({ x: p.lng * R, y: p.lat }));
    const uv = normalizePoints(allRaw);

    let offset = 0;
    const compResult = comps.map((c, i) => ({
      id: c.id || "subject",
      isSubject: c.id === "subject",
      x: uv[offset + i].x,
      y: 1 - uv[offset + i].y,
    }));
    offset += comps.length;

    const seismicResult = seismic.map((s, i) => ({
      id: s.id,
      riskClass: s.riskClass,
      addressRaw: s.addressRaw,
      distanceM: s.distanceM,
      x: uv[offset + i].x,
      y: 1 - uv[offset + i].y,
    }));
    offset += seismic.length;

    const poiResult = pois.map((p, i) => ({
      id: p.id,
      category: p.category,
      name: p.name,
      distanceM: p.distanceM,
      x: uv[offset + i].x,
      y: 1 - uv[offset + i].y,
    }));
    offset += pois.length;

    const transitResult = transit.map((t, i) => ({
      id: t.id,
      mode: t.mode,
      name: t.name,
      distanceM: t.distanceM,
      x: uv[offset + i].x,
      y: 1 - uv[offset + i].y,
    }));

    return { compPts: compResult, seismicPts: seismicResult, poiPts: poiResult, transitPts: transitResult };
  }, [items, center, seismicBuildings, showSeismic, poiPoints, hasPoiLayer, transportPoints, hasTransport]);

  if (!compPts.length && !seismicPts.length && !poiPts.length && !transitPts.length) {
    return (
      <div className="h-56 w-full rounded-xl border flex items-center justify-center text-xs text-muted-foreground">
        Nicio poziție geografică disponibilă
      </div>
    );
  }

  const PAD = 6;

  return (
    <div className="relative h-56 w-full rounded-xl border bg-white p-2">
      <svg viewBox={`${-PAD} ${-PAD} ${100 + PAD * 2} ${100 + PAD * 2}`} className="h-full w-full rounded-lg">
        {/* faint grid */}
        {[20, 40, 60, 80].map((g) => (
          <line key={`gx-${g}`} x1={g} y1={0} x2={g} y2={100} stroke="#eee" strokeWidth="0.5" />
        ))}
        {[20, 40, 60, 80].map((g) => (
          <line key={`gy-${g}`} x1={0} y1={g} x2={100} y2={g} stroke="#eee" strokeWidth="0.5" />
        ))}

        {/* POI layer (furthest back) */}
        {hasPoiLayer &&
          poiPts.map((p) => {
            const color = POI_COLORS[p.category] ?? "#6b7280";
            const label = p.name || p.category;
            return (
              <circle
                key={`poi-${p.id}`}
                cx={p.x * 100}
                cy={p.y * 100}
                r={1.6}
                fill={color}
                fillOpacity={0.7}
                stroke="white"
                strokeWidth={0.3}
              >
                <title>{label} ({p.distanceM}m)</title>
              </circle>
            );
          })}

        {/* transport layer */}
        {hasTransport &&
          transitPts.map((t) => {
            const color = TRANSPORT_COLORS[t.mode] ?? "#6b7280";
            const s = 1.4;
            return (
              <rect
                key={`tr-${t.id}`}
                x={t.x * 100 - s}
                y={t.y * 100 - s}
                width={s * 2}
                height={s * 2}
                rx={0.4}
                fill={color}
                fillOpacity={0.75}
                stroke="white"
                strokeWidth={0.3}
              >
                <title>{t.name} ({t.mode}) – {t.distanceM}m</title>
              </rect>
            );
          })}

        {/* seismic layer */}
        {showSeismic &&
          seismicPts.map((s) => {
            const color = RISK_COLORS[s.riskClass] ?? "#6b7280";
            const title = `${s.riskClass}${s.addressRaw ? ` – ${s.addressRaw}` : ""}${s.distanceM != null ? ` (${s.distanceM}m)` : ""}`;
            return (
              <DiamondMarker
                key={`seis-${s.id}`}
                cx={s.x * 100}
                cy={s.y * 100}
                size={2.2}
                fill={color}
                title={title}
              />
            );
          })}

        {/* subject marker */}
        {compPts
          .filter((p) => p.isSubject)
          .map((p) => (
            <circle key="subject" cx={p.x * 100} cy={p.y * 100} r={3.2} fill="#0ea5e9">
              <title>Proprietatea analizata</title>
            </circle>
          ))}

        {/* comp markers */}
        {compPts
          .filter((p) => !p.isSubject)
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

      {/* Legend */}
      {(showSeismic && seismicPts.length > 0) || (hasPoiLayer && poiPts.length > 0) || (hasTransport && transitPts.length > 0) ? (
        <div className="absolute bottom-3 left-3 flex flex-col gap-1 rounded bg-white/90 px-2 py-1 shadow-sm border text-[9px]">
          {showSeismic && seismicPts.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground">Risc seismic:</span>
              {["RsI", "RsII", "RsIII"].map((rc) => {
                const count = seismicPts.filter((s) => s.riskClass === rc).length;
                if (count === 0) return null;
                return (
                  <span key={rc} className="flex items-center gap-0.5">
                    <svg width="8" height="8" viewBox="0 0 8 8">
                      <path d="M4,0 L8,4 L4,8 L0,4 Z" fill={RISK_COLORS[rc]} fillOpacity={0.8} />
                    </svg>
                    <span>{rc} ({count})</span>
                  </span>
                );
              })}
            </div>
          )}
          {hasPoiLayer && poiPts.length > 0 && activePoiLayers?.map((layer) => {
            const cfg = POI_LAYER_LABELS[layer];
            if (!cfg) return null;
            const count = poiPts.length;
            return (
              <div key={layer} className="flex items-center gap-1.5">
                <svg width="8" height="8" viewBox="0 0 8 8">
                  <circle cx="4" cy="4" r="3" fill={cfg.color} fillOpacity={0.7} />
                </svg>
                <span>{cfg.label} ({count})</span>
              </div>
            );
          })}
          {hasTransport && transitPts.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground">Transport:</span>
              {(["METRO", "TRAM", "BUS", "TROLLEY"] as const).map((m) => {
                const count = transitPts.filter((t) => t.mode === m).length;
                if (count === 0) return null;
                return (
                  <span key={m} className="flex items-center gap-0.5">
                    <svg width="8" height="8" viewBox="0 0 8 8">
                      <rect x="1" y="1" width="6" height="6" rx="1" fill={TRANSPORT_COLORS[m]} fillOpacity={0.75} />
                    </svg>
                    <span>{m.charAt(0) + m.slice(1).toLowerCase()} ({count})</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
