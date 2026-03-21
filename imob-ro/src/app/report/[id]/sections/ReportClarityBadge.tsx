import { cn } from "@/lib/utils";

export type ClarityKind = "confirmed" | "estimated" | "unknown";

const CONFIG: Record<
  ClarityKind,
  { prefix: string; label: string; className: string }
> = {
  confirmed: {
    prefix: "✔",
    label: "Confirmat",
    className: "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
  },
  estimated: {
    prefix: "~",
    label: "Estimat",
    className: "bg-sky-50 text-sky-900 ring-sky-200/70",
  },
  unknown: {
    prefix: "?",
    label: "Necunoscut",
    className: "bg-slate-100 text-slate-700 ring-slate-200/80",
  },
};

interface Props {
  kind: ClarityKind;
  className?: string;
}

export default function ReportClarityBadge({ kind, className }: Props) {
  const c = CONFIG[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
        c.className,
        className,
      )}
      title={
        kind === "confirmed"
          ? "Din anunt, sursa publica declarata sau reper fiscal."
          : kind === "estimated"
            ? "Model sau proxy - poate diferi de realitate."
            : "Nu avem date suficiente in acest moment."
      }
    >
      <span aria-hidden>{c.prefix}</span>
      {c.label}
    </span>
  );
}

export function SectionTrustFooter({
  whatThisMeans,
  nextStep,
  className,
}: {
  whatThisMeans: string;
  nextStep: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-4 space-y-2 rounded-lg bg-slate-50/90 px-3 py-3 text-[13px] leading-snug ring-1 ring-slate-100",
        className,
      )}
    >
      <p>
        <span className="font-semibold text-slate-800">Ce inseamna pentru tine: </span>
        <span className="text-slate-700">{whatThisMeans}</span>
      </p>
      <p>
        <span className="font-semibold text-slate-800">Pas urmator: </span>
        <span className="text-slate-700">{nextStep}</span>
      </p>
    </div>
  );
}
