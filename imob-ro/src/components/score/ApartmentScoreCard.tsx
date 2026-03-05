"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ApartmentScore, ScoreLabel } from "@/lib/score/apartmentScore";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LABEL_CONFIG: Record<
  ScoreLabel,
  { bg: string; text: string; ring: string; barColor: string }
> = {
  Excelent: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
    barColor: "bg-emerald-500",
  },
  Bun: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-200",
    barColor: "bg-blue-500",
  },
  OK: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
    barColor: "bg-amber-500",
  },
  Atentie: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    ring: "ring-orange-200",
    barColor: "bg-orange-500",
  },
  Evita: {
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-200",
    barColor: "bg-red-500",
  },
};

const SUB_LABELS: Record<string, { label: string; tooltip: string }> = {
  value: {
    label: "Valoare",
    tooltip: "Cat de bun e pretul fata de comparabile si intervalul estimat.",
  },
  risk: {
    label: "Siguranta",
    tooltip: "Nivel de siguranta: structura, seismic, an constructie, lift. Scor mare = risc mic.",
  },
  liquidity: {
    label: "Lichiditate",
    tooltip: "Cat de repede se vand apartamentele similare in zona.",
  },
  lifestyle: {
    label: "Stil de viata",
    tooltip: "Transport, parcuri, magazine, scoli, viata de noapte.",
  },
};

// ---------------------------------------------------------------------------
// Score ring (SVG circle)
// ---------------------------------------------------------------------------

function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const cfg = LABEL_CONFIG[labelFor(score)];

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-gray-100"
        strokeWidth={6}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        className={cfg.text}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-gray-900 text-[22px] font-extrabold"
      >
        {score}
      </text>
    </svg>
  );
}

function labelFor(score: number): ScoreLabel {
  if (score >= 90) return "Excelent";
  if (score >= 75) return "Bun";
  if (score >= 60) return "OK";
  if (score >= 40) return "Atentie";
  return "Evita";
}

// ---------------------------------------------------------------------------
// Sub-score bar
// ---------------------------------------------------------------------------

function SubScoreBar({ id, value }: { id: string; value: number }) {
  const meta = SUB_LABELS[id];
  if (!meta) return null;
  const cfg = LABEL_CONFIG[labelFor(value)];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="space-y-1 cursor-help">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-gray-600">{meta.label}</span>
            <span className="font-bold text-gray-800">{value}</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${cfg.barColor}`}
              style={{ width: `${value}%` }}
            />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-xs">
        {meta.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Compact variant
// ---------------------------------------------------------------------------

function CompactScore({ data, scoreLabel }: { data: ApartmentScore; scoreLabel: string }) {
  const cfg = LABEL_CONFIG[data.label];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`inline-flex items-center gap-2.5 rounded-xl border px-3.5 py-2 ring-1 ring-inset cursor-help ${cfg.bg} ${cfg.ring}`}
        >
          <span className={`text-lg font-extrabold ${cfg.text}`}>{data.score}</span>
          <div className="text-left">
            <span className={`text-[11px] font-bold uppercase tracking-wide ${cfg.text}`}>
              {data.label}
            </span>
            <span className="block text-[10px] text-gray-500">{scoreLabel}</span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[280px] text-xs space-y-1">
        <p className="font-semibold">Scor bazat pe 4 criterii:</p>
        <p>
          Valoare {data.subscores.value} · Siguranta {data.subscores.risk} · Lichiditate{" "}
          {data.subscores.liquidity} · Stil de viata {data.subscores.lifestyle}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Full variant
// ---------------------------------------------------------------------------

function FullScore({ data, showActions = true, scoreLabel }: { data: ApartmentScore; showActions?: boolean; scoreLabel: string }) {
  const cfg = LABEL_CONFIG[data.label];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-lg shadow-gray-100/80 overflow-hidden">
      {/* Header */}
      <div className={`px-5 py-4 flex items-center gap-4 ${cfg.bg} ring-1 ring-inset ${cfg.ring}`}>
        <ScoreRing score={data.score} />
        <div className="flex-1 min-w-0">
          <p className={`text-lg font-extrabold ${cfg.text}`}>{scoreLabel}: {data.label}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Scor compus din valoare, risc, lichiditate si stil de viata.
          </p>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="px-5 py-4 space-y-2.5 border-b border-gray-100">
        {(["value", "risk", "liquidity", "lifestyle"] as const).map((key) => (
          <SubScoreBar key={key} id={key} value={data.subscores[key]} />
        ))}
      </div>

      {/* Pros & Cons */}
      <div className="px-5 py-4 grid grid-cols-2 gap-4 border-b border-gray-100">
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Pro</p>
          {data.pros.map((p, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
              {p}
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-red-600 uppercase tracking-wide">Contra</p>
          {data.cons.map((c, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-red-400" />
              {c}
            </div>
          ))}
        </div>
      </div>

      {/* Actions — only shown on /estimare where user can improve inputs */}
      {showActions && (
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
            Cum cresti scorul
          </p>
          {data.actions.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-700 py-1">
              <svg
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              {a}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface ApartmentScoreCardProps {
  score: ApartmentScore;
  variant?: "compact" | "full";
  showActions?: boolean;
  scoreLabel?: string;
}

export default function ApartmentScoreCard({
  score,
  variant = "full",
  showActions = true,
  scoreLabel = "Scor apartament",
}: ApartmentScoreCardProps) {
  if (variant === "compact") return <CompactScore data={score} scoreLabel={scoreLabel} />;
  return <FullScore data={score} showActions={showActions} scoreLabel={scoreLabel} />;
}
