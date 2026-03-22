import type { AirQualityReading } from "@/lib/risk/aqicn";
import { aqiMeaningForBuyer } from "@/lib/risk/aqi-label";

function formatUpdatedAt(isoOrWaqi: string): string {
  const s = isoOrWaqi.trim();
  const asDate = Date.parse(s.replace(" ", "T"));
  if (!Number.isNaN(asDate)) {
    return new Intl.DateTimeFormat("ro-RO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(asDate));
  }
  return s;
}

export default function RiskAirQualityCard({
  reading,
}: {
  reading: AirQualityReading | null;
}) {
  if (!reading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 px-6 py-8 ring-1 ring-slate-100/90">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Calitatea aerului
        </h3>
        <p className="mt-4 text-[15px] font-medium leading-snug text-slate-700">
          Calitatea aerului indisponibilă momentan.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Reîncearcă mai târziu sau verifică o sursă locală dacă decizia ta depinde de acest factor.
        </p>
      </div>
    );
  }

  const tone = reading.labelMeta.tone;
  const forYou = aqiMeaningForBuyer(tone);

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white px-6 py-8 shadow-[0_1px_0_rgba(0,0,0,.03)] ring-1 ring-black/[0.04]">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Calitatea aerului
      </h3>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <span className={`text-5xl font-semibold tabular-nums tracking-tight ${reading.labelMeta.numberClass}`}>
          {reading.aqi}
        </span>
        <span
          className={`mb-1.5 inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${reading.labelMeta.chipClass}`}
        >
          {reading.label}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        Bazat pe stația de monitorizare cea mai apropiată disponibilă — indicele reflectă zona, nu
        neapărat strada imobilului.
      </p>

      {(reading.pm25 != null || reading.no2 != null) && (
        <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700">
          {reading.pm25 != null && (
            <div>
              <dt className="text-slate-500">PM2.5</dt>
              <dd className="font-medium tabular-nums">{reading.pm25.toFixed(1)} µg/m³</dd>
            </div>
          )}
          {reading.no2 != null && (
            <div>
              <dt className="text-slate-500">NO₂</dt>
              <dd className="font-medium tabular-nums">{reading.no2.toFixed(1)} µg/m³</dd>
            </div>
          )}
        </dl>
      )}

      <p className="mt-5 text-[13px] text-slate-500">
        Actualizat la {formatUpdatedAt(reading.updatedAt)}
        {reading.stationName ? ` · ${reading.stationName}` : ""}
      </p>

      <div className="mt-6 rounded-xl bg-slate-50/80 px-4 py-3 text-sm leading-snug text-slate-800 ring-1 ring-slate-100/90">
        <span className="font-semibold text-slate-900">Ce înseamnă pentru tine: </span>
        {forYou}
      </div>

      <p className="mt-4 text-[13px] text-slate-500">
        Pas următor: compară valoarea în zile și ore diferite dacă zona este aproape de artere mari.
      </p>

      <p className="mt-5 text-[11px] text-slate-400">
        Sursă: {reading.source} — stație de monitorizare apropiată (model agregat). Nu înlocuiește
        măsurători locale.
      </p>
    </div>
  );
}
