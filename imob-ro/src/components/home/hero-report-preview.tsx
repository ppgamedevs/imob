/**
 * Static homepage-only preview — illustrates report value, not live data.
 */
export function HeroReportPreview() {
  return (
    <aside
      className="relative w-full rounded-2xl border border-gray-200/90 bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,.04),0_12px_40px_-12px_rgba(15,23,42,.12)] ring-1 ring-black/[0.03]"
      aria-label="Exemplu de rezumat raport"
    >
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
            Exemplu raport
          </p>
          <p className="mt-1 text-[17px] font-semibold tracking-tight text-gray-950">
            Floreasca, București
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600">
          Apartament · 2 cam.
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-gray-50/80 px-3.5 py-3 ring-1 ring-inset ring-gray-100">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Preț listat
          </p>
          <p className="mt-0.5 text-[20px] font-semibold tabular-nums tracking-tight text-gray-900">
            185.000 €
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50/60 px-3.5 py-3 ring-1 ring-inset ring-emerald-100/80">
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-800/80">
            Reper model (AVM)
          </p>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-2">
            <span className="text-[20px] font-semibold tabular-nums tracking-tight text-emerald-900">
              162.000 €
            </span>
            <span className="text-[13px] font-semibold text-rose-700 tabular-nums">−12%</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-amber-200/90 bg-amber-50 px-3 py-1 text-[12px] font-semibold text-amber-950">
          Ușor supraevaluat
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-gray-100 pt-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Timp până la vânzare (estimare)
          </p>
          <p className="mt-1 text-[13px] font-semibold text-gray-900">4–6 luni</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Randament chirie
          </p>
          <p className="mt-1 text-[13px] font-semibold tabular-nums text-gray-900">5,2%</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Risc seismic
          </p>
          <p className="mt-1 text-[13px] font-semibold text-gray-900">Mediu</p>
        </div>
      </div>

      <p className="mt-4 border-t border-gray-100 pt-3 text-center text-[11px] leading-relaxed text-gray-400">
        Exemplu static. Rezultatul real folosește AVM, comparabile și riscuri acolo unde există date;
        nu e evaluare ANEVAR, nici preț corect la literă. Timpul până la vânzare (exemplu) e tot
        orientativ.
      </p>
    </aside>
  );
}
