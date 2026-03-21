interface Props {
  pros: string[];
  cons: string[];
  maxEach?: number;
}

export default function ReportProsConsSection({ pros, cons, maxEach = 5 }: Props) {
  const p = pros.map((s) => s.trim()).filter(Boolean).slice(0, maxEach);
  const c = cons.map((s) => s.trim()).filter(Boolean).slice(0, maxEach);
  if (p.length === 0 && c.length === 0) return null;

  return (
    <section className="grid gap-4 md:grid-cols-2 md:gap-6" aria-label="Argumente pro si contra">
      <div className="rounded-xl bg-emerald-50/40 p-4 md:p-5 ring-1 ring-emerald-100/80">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-900">De ce merita</h3>
        <ul className="mt-3 space-y-2.5">
          {p.length === 0 ? (
            <li className="flex gap-2 text-[13px] text-emerald-900/60">
              <span className="font-semibold text-emerald-600">·</span>
              Fara puncte pro evidente in date.
            </li>
          ) : (
            p.map((line, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-snug text-emerald-950">
                <span className="shrink-0 font-bold text-emerald-600">+</span>
                <span>{line}</span>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="rounded-xl bg-amber-50/40 p-4 md:p-5 ring-1 ring-amber-100/80">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-amber-950">De ce trebuie atentie</h3>
        <ul className="mt-3 space-y-2.5">
          {c.length === 0 ? (
            <li className="flex gap-2 text-[13px] text-amber-950/70">
              <span className="font-semibold text-amber-700">·</span>
              Fara semnale majore listate.
            </li>
          ) : (
            c.map((line, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-snug text-amber-950">
                <span className="shrink-0 font-bold text-amber-700">–</span>
                <span>{line}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
