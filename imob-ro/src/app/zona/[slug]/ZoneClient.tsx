"use client";
import type { ZoneData } from "@/lib/zones/load-zone";

import { Histogram } from "./_parts/Histogram";
import { Kpis } from "./_parts/Kpis";
import { TopListings } from "./_parts/TopListings";
import { TrendLines } from "./_parts/TrendLines";
import { ZoneMap } from "./_parts/ZoneMap";

export function ZoneClient({ data }: { data: ZoneData }) {
  const { kpi, daily, histogram, items, ttsMode } = data;

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr,380px]">
      <div className="space-y-4">
        <Kpis kpi={kpi} ttsMode={ttsMode} />

        <div className="rounded-xl border p-3">
          <div className="mb-2 font-medium">Distribuție €/m²</div>
          <Histogram data={histogram} />
        </div>

        <div className="rounded-xl border p-3">
          <div className="mb-2 font-medium">Tendințe (90 zile)</div>
          <TrendLines series={daily} />
        </div>

        <div className="rounded-xl border p-3">
          <div className="mb-2 font-medium">Listări reprezentative</div>
          <TopListings items={items} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border p-3">
          <div className="mb-2 font-medium">Hartă</div>
          <ZoneMap items={items} />
        </div>

        <div className="rounded-xl border p-3 text-sm">
          <div className="mb-2 font-medium">Despre zonă</div>
          <p className="text-muted-foreground">
            Informații generate automat din analizele recente: preț median, ofertă activă și
            proximitate metrou. (Conținut editorial v2.)
          </p>
        </div>
      </div>
    </div>
  );
}
