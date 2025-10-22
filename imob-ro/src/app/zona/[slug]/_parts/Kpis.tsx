interface KpiData {
  pricePerSqm: number | null;
  supply: number;
}

export function Kpis({ kpi, ttsMode }: { kpi: KpiData; ttsMode: number | null }) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      <div className="rounded-xl border p-3">
        <div className="text-xs text-muted-foreground">Preț median €/m²</div>
        <div className="text-2xl font-semibold">
          {kpi.pricePerSqm ? `€${kpi.pricePerSqm}` : "—"}
        </div>
      </div>

      <div className="rounded-xl border p-3">
        <div className="text-xs text-muted-foreground">Ofertă activă</div>
        <div className="text-2xl font-semibold">{kpi.supply ?? 0}</div>
      </div>

      <div className="rounded-xl border p-3">
        <div className="text-xs text-muted-foreground">TTS (mod)</div>
        <div className="text-2xl font-semibold">{ttsMode ? `€${ttsMode}` : "—"}</div>
      </div>
    </div>
  );
}
