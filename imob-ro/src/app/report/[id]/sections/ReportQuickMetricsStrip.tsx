/**
 * Compact horizontal KPIs — no paragraphs (decision-engine scan).
 */
export interface QuickMetricItem {
  icon: string;
  label: string;
  value: string;
}

export default function ReportQuickMetricsStrip({ items }: { items: QuickMetricItem[] }) {
  const row = items.filter((i) => i.value.trim());
  if (row.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-sm"
      aria-label="Indicatori rapizi"
    >
      {row.map((m, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 text-slate-800 tabular-nums">
          <span className="text-base leading-none" aria-hidden>
            {m.icon}
          </span>
          <span className="font-semibold text-slate-900">{m.value}</span>
          <span className="text-slate-500 font-normal">{m.label}</span>
        </span>
      ))}
    </div>
  );
}
