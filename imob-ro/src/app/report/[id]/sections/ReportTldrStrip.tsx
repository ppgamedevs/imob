interface Props {
  lines: string[];
  /** Default 4 for report header */
  maxLines?: number;
}

export default function ReportTldrStrip({ lines, maxLines = 4 }: Props) {
  const trimmed = lines.map((s) => s.trim()).filter(Boolean).slice(0, maxLines);
  if (trimmed.length === 0) return null;

  const cols =
    trimmed.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : trimmed.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2";

  return (
    <div className="rounded-xl border border-gray-200/80 bg-gradient-to-r from-slate-50/90 to-gray-50/60 px-4 py-4 shadow-sm md:px-6 md:py-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">Pe scurt</p>
      <ul className={`mt-3 grid gap-3 ${cols}`}>
        {trimmed.map((line, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] font-medium leading-snug text-gray-800">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900/30"
              aria-hidden
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
