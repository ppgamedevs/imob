export type TldrItemKind = "positive" | "caution" | "warning";

export interface TldrItem {
  text: string;
  kind: TldrItemKind;
}

const ICON: Record<TldrItemKind, string> = {
  positive: "✔",
  caution: "⚠",
  warning: "❗",
};

interface Props {
  /** Structured bullets with visual weight */
  items: TldrItem[];
  maxItems?: number;
}

function oneLine(text: string, maxLen = 110): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const sp = cut.lastIndexOf(" ");
  return (sp > 35 ? cut.slice(0, sp) : cut).trim() + "…";
}

export default function ReportTldrStrip({ items, maxItems = 4 }: Props) {
  const trimmed = items
    .filter((x) => x.text?.trim())
    .slice(0, maxItems)
    .map((x) => ({ ...x, text: oneLine(x.text) }));
  if (trimmed.length === 0) return null;

  const cols =
    trimmed.length >= 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : trimmed.length === 3
        ? "md:grid-cols-3"
        : "sm:grid-cols-2";

  return (
    <div className="rounded-xl bg-slate-50/80 px-4 py-4 md:px-6 md:py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Pe scurt</p>
      <ul className={`mt-3 grid gap-x-4 gap-y-2.5 ${cols}`}>
        {trimmed.map((item, i) => (
          <li
            key={i}
            className="flex gap-2 text-[13px] font-medium leading-tight text-slate-800"
          >
            <span className="shrink-0 w-5 text-center select-none" aria-hidden>
              {ICON[item.kind]}
            </span>
            <span className="min-w-0">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
