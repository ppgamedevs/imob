import type { ReportConfidenceExplanation } from "@/lib/report/report-confidence-explanation";
import { cn } from "@/lib/utils";

type Props = { explanation: ReportConfidenceExplanation; className?: string };

const TONE: Record<ReportConfidenceExplanation["level"], string> = {
  high: "border-emerald-200/90 bg-emerald-50/80 text-emerald-950",
  medium: "border-amber-200/90 bg-amber-50/70 text-amber-950",
  low: "border-rose-200/80 bg-rose-50/80 text-rose-950",
};

/**
 * One compact block: label, short line, 2–3 bullets. No implied statistical guarantee.
 */
export default function ReportConfidenceStrip({ explanation: x, className }: Props) {
  const bullets = x.bulletReasonsRo.slice(0, 3);
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm leading-relaxed shadow-sm",
        TONE[x.level],
        className,
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-90">{x.labelRo}</p>
      <p className="mt-1.5 text-[13px] font-medium text-slate-900/90">{x.shortExplanationRo}</p>
      {bullets.length > 0 && (
        <ul className="mt-2 list-inside list-disc space-y-0.5 text-[12px] text-slate-800/90">
          {bullets.map((b) => (
            <li key={b.slice(0, 48)}>{b}</li>
          ))}
        </ul>
      )}
      {x.missingDataRo.length > 0 && (
        <div className="mt-2 border-t border-black/5 pt-2 text-[11px] text-slate-700/95">
          <span className="font-semibold">Goluri: </span>
          {x.missingDataRo.slice(0, 3).join(" ")}
        </div>
      )}
    </div>
  );
}
