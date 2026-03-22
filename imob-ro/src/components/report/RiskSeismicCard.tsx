import type { BuyerSeismicView } from "@/lib/risk/seismic-label";

function headlineFor(state: BuyerSeismicView["state"]): string {
  switch (state) {
    case "official_list":
      return "Risc seismic confirmat oficial";
    case "not_on_public_list":
      return "Nu apare în evidența publică";
    case "insufficient":
    default:
      return "Date insuficiente pentru verificare";
  }
}

export default function RiskSeismicCard({ view }: { view: BuyerSeismicView }) {
  const headline = headlineFor(view.state);

  const headlineClass =
    view.state === "official_list"
      ? "text-rose-950"
      : view.state === "not_on_public_list"
        ? "text-slate-900"
        : "text-slate-800";

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white px-6 py-8 shadow-[0_1px_0_rgba(0,0,0,.03)] ring-1 ring-black/[0.04]">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Risc seismic
      </h3>

      <h4 className={`mt-5 text-xl font-semibold tracking-tight ${headlineClass}`}>{headline}</h4>

      <p className="mt-4 text-sm leading-relaxed text-slate-600">{view.meaningLine}</p>

      {view.state === "not_on_public_list" && (
        <p className="mt-3 text-sm font-medium text-slate-700">Nu este o confirmare de siguranță.</p>
      )}

      {view.titleMentionConflict && (
        <p className="mt-4 rounded-lg bg-amber-50/90 px-3 py-2 text-[13px] leading-snug text-amber-950 ring-1 ring-amber-100/90">
          Anunțul menționează risc seismic, dar potrivirea automată nu a confirmat imobilul în lista
          publică. Verifică personal cu un expert tehnic.
        </p>
      )}

      <div className="mt-6 rounded-xl bg-slate-50/80 px-4 py-3 text-sm leading-snug text-slate-800 ring-1 ring-slate-100/90">
        <span className="font-semibold text-slate-900">Ce înseamnă pentru tine: </span>
        {view.forYouLine}
      </div>

      {view.nextStep && (
        <p className="mt-4 text-[13px] text-slate-600">{view.nextStep}</p>
      )}

      <p className="mt-5 text-[11px] text-slate-400">
        Verificare bazată pe lista publică AMCCRS (PMB), când adresa sau coordonatele permit
        potrivirea automată.
      </p>
    </div>
  );
}
