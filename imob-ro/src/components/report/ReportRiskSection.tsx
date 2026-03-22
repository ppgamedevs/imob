import type { AirQualityReading } from "@/lib/risk/aqicn";
import type { BuyerSeismicView } from "@/lib/risk/seismic-label";

import RiskAirQualityCard from "./RiskAirQualityCard";
import RiskSeismicCard from "./RiskSeismicCard";

export default function ReportRiskSection({
  airQuality,
  seismic,
}: {
  airQuality: AirQualityReading | null;
  seismic: BuyerSeismicView;
}) {
  return (
    <section className="space-y-5" aria-labelledby="report-risk-heading">
      <div>
        <h2
          id="report-risk-heading"
          className="text-lg font-semibold tracking-tight text-slate-900 md:text-xl"
        >
          Ce trebuie să știi despre risc
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Două semnale clare pentru decizie — fără tablouri tehnice. Nu înlocuiesc expertiza la fața
          locului.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <RiskAirQualityCard reading={airQuality} />
        <RiskSeismicCard view={seismic} />
      </div>
    </section>
  );
}
