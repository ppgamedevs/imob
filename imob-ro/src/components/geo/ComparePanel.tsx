"use client";

import { useCallback, useState } from "react";
import type { CompareVerdict, CompareMetric } from "@/lib/geo/compareLocations";

// ---- Types ----

interface CompareInputProps {
  onCompare: (lat: number, lng: number) => void;
  loading: boolean;
}

interface CompareResultProps {
  verdict: CompareVerdict;
  labelA: string;
  labelB: string;
}

// ---- Compare Input ----

export function CompareInput({ onCompare, loading }: CompareInputProps) {
  const [latStr, setLatStr] = useState("");
  const [lngStr, setLngStr] = useState("");
  const [address, setAddress] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  const handleGeocode = useCallback(async () => {
    if (!address.trim()) return;
    setGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`);
      const json = await res.json();
      const results = json.results ?? [];
      if (results.length > 0) {
        const { lat, lng } = results[0];
        setLatStr(lat.toFixed(5));
        setLngStr(lng.toFixed(5));
        onCompare(lat, lng);
      }
    } catch {
      // silent
    } finally {
      setGeocoding(false);
    }
  }, [address, onCompare]);

  const handleManual = useCallback(() => {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!isNaN(lat) && !isNaN(lng)) onCompare(lat, lng);
  }, [latStr, lngStr, onCompare]);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h3 className="text-sm font-semibold">Compara cu alta locatie</h3>
      <p className="text-xs text-muted-foreground">
        Introdu adresa sau coordonatele locatiei B pentru a compara scorurile.
      </p>

      {/* Address search */}
      <div className="flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Adresa alternativa..."
          className="flex-1 text-sm px-3 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-300"
          onKeyDown={(e) => e.key === "Enter" && handleGeocode()}
        />
        <button
          onClick={handleGeocode}
          disabled={geocoding || loading}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {geocoding ? "..." : "Cauta"}
        </button>
      </div>

      {/* Manual coordinates */}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground">Coordonate manuale</summary>
        <div className="mt-2 flex gap-2 items-end">
          <div className="space-y-0.5">
            <label className="text-[10px]">Lat</label>
            <input
              type="text"
              value={latStr}
              onChange={(e) => setLatStr(e.target.value)}
              className="w-24 text-xs px-2 py-1 rounded border"
              placeholder="44.4268"
            />
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px]">Lng</label>
            <input
              type="text"
              value={lngStr}
              onChange={(e) => setLngStr(e.target.value)}
              className="w-24 text-xs px-2 py-1 rounded border"
              placeholder="26.1025"
            />
          </div>
          <button
            onClick={handleManual}
            disabled={loading}
            className="px-2 py-1 text-xs font-medium rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            Compara
          </button>
        </div>
      </details>
    </div>
  );
}

// ---- Compare Result ----

function MetricRow({ m, labelA, labelB }: { m: CompareMetric; labelA: string; labelB: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-muted-foreground w-28 shrink-0">{m.labelRo}</span>
      <div className="flex-1 flex items-center gap-2">
        <span className={`text-xs font-bold ${m.winner === "A" ? "text-blue-700" : "text-gray-600"}`}>
          {m.valueA}
        </span>
        <div className="flex-1 relative h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute left-0 h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${Math.min(100, m.valueA)}%`, opacity: m.winner === "A" ? 1 : 0.4 }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground">vs</span>
        <div className="flex-1 relative h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute left-0 h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${Math.min(100, m.valueB)}%`, opacity: m.winner === "B" ? 1 : 0.4 }}
          />
        </div>
        <span className={`text-xs font-bold ${m.winner === "B" ? "text-amber-700" : "text-gray-600"}`}>
          {m.valueB}
        </span>
      </div>
      {m.winner !== "tie" && (
        <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
          m.winner === "A" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
        }`}>
          {m.winner === "A" ? labelA : labelB}
        </span>
      )}
    </div>
  );
}

export function CompareResult({ verdict, labelA, labelB }: CompareResultProps) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-700">
        {verdict.summary}
      </div>

      {/* Wins */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="text-xs font-bold text-blue-800 mb-1">{labelA} castiga la:</div>
          <ul className="space-y-0.5">
            {verdict.winsA.length === 0 && (
              <li className="text-xs text-blue-600">Niciun avantaj clar</li>
            )}
            {verdict.winsA.map((w, i) => (
              <li key={i} className="text-xs text-blue-700 flex items-start gap-1">
                <span className="shrink-0">+</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="text-xs font-bold text-amber-800 mb-1">{labelB} castiga la:</div>
          <ul className="space-y-0.5">
            {verdict.winsB.length === 0 && (
              <li className="text-xs text-amber-600">Niciun avantaj clar</li>
            )}
            {verdict.winsB.map((w, i) => (
              <li key={i} className="text-xs text-amber-700 flex items-start gap-1">
                <span className="shrink-0">+</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Metric bars */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-blue-700">{labelA}</span>
          <span className="text-xs font-medium text-amber-700">{labelB}</span>
        </div>
        {verdict.metrics.map((m) => (
          <MetricRow key={m.key} m={m} labelA={labelA} labelB={labelB} />
        ))}
      </div>
    </div>
  );
}
