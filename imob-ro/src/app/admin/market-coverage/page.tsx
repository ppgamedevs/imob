import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMarketCoverageData,
  MARKET_COVERAGE_DAYS,
  type MarketCoverageRegionFilter,
  MAX_BUCKETS_SHOWN,
} from "@/lib/admin/market-coverage";
import { requireAdmin } from "@/lib/auth-guards";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Acoperire piață (rapoarte plătite)",
};

const REGIONS: { value: MarketCoverageRegionFilter; label: string }[] = [
  { value: "all", label: "Toate (regiune)" },
  { value: "bucuresti", label: "Doar București" },
  { value: "ilfov", label: "Doar Ilfov" },
];

const SECTORS = ["", "1", "2", "3", "4", "5", "6"] as const;
const ROOMS = ["", "1", "2", "3", "4+"] as const;

function statusClass(s: string): string {
  switch (s) {
    case "strong":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100";
    case "usable":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100";
    case "weak":
      return "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100";
    default:
      return "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100";
  }
}

function statusLabel(s: string): string {
  switch (s) {
    case "strong":
      return "puternică (≥100 listări curate în bucket)";
    case "usable":
      return "utilizabil (30–99)";
    case "weak":
      return "slabă (10–29)";
    default:
      return "insuficient (sub 10 listări)";
  }
}

function statusDisplayRo(s: string): string {
  switch (s) {
    case "strong":
      return "puternic";
    case "usable":
      return "utilizabil";
    case "weak":
      return "slab";
    default:
      return "insuficient";
  }
}

interface PageProps {
  searchParams: Promise<{
    reg?: string;
    sector?: string;
    rooms?: string;
    host?: string;
  }>;
}

export default async function AdminMarketCoveragePage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const reg = (sp.reg as MarketCoverageRegionFilter) || "all";
  const region: MarketCoverageRegionFilter = ["all", "bucuresti", "ilfov"].includes(reg)
    ? reg
    : "all";
  const sector = sp.sector?.trim() ?? "";
  const rooms = sp.rooms?.trim() ?? "";
  const host = sp.host?.trim() ?? "";

  const { rows, summary, hostOptions } = await getMarketCoverageData({
    region,
    sector: sector && /^[1-6]$/.test(sector) ? sector : "",
    rooms: rooms && (ROOMS as readonly string[]).includes(rooms) ? rooms : "",
    host,
  });

  return (
    <div className="container mx-auto max-w-[1800px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Acoperire piață — rapoarte plătite</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
            Listări curate (apartament / garsonieră / studio / mansardă / penthouse / duplex) din
            ultimele {MARKET_COVERAGE_DAYS} de zile, grupate pe oraș, sector, cartier (areaSlug),
            camere, „bucket” suprafață și recență. Răspuns la:{" "}
            <span className="text-foreground font-medium">
              unde putem vinde în siguranță rapoarte plătite azi
            </span>
            ?
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">← Admin</Link>
          </Button>
        </div>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 p-4"
        action="/admin/market-coverage"
      >
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="reg">
            Regiune
          </label>
          <select
            id="reg"
            name="reg"
            defaultValue={region}
            className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="sector">
            Sector
          </label>
          <select
            id="sector"
            name="sector"
            defaultValue={sector}
            className="flex h-9 min-w-[120px] rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Oricare</option>
            {SECTORS.filter((s) => s).map((s) => (
              <option key={s} value={s}>
                Sector {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="rooms">
            Camere
          </label>
          <select
            id="rooms"
            name="rooms"
            defaultValue={rooms}
            className="flex h-9 min-w-[100px] rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Oricare</option>
            {ROOMS.filter((r) => r).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 min-w-[200px] max-w-sm flex-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="host">
            Host sursă (conține)
          </label>
          <input
            id="host"
            name="host"
            type="search"
            defaultValue={host}
            placeholder="ex. imobiliare.ro"
            className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm"
            list="host-suggestions"
          />
          <datalist id="host-suggestions">
            {hostOptions.map((h) => (
              <option key={h.host} value={h.host} />
            ))}
          </datalist>
        </div>
        <Button type="submit" size="sm" className="h-9">
          Aplică
        </Button>
        <Button type="button" variant="secondary" size="sm" className="h-9" asChild>
          <Link href="/admin/market-coverage">Resetează</Link>
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Bucket puternic</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{summary.strong}</p>
            <p className="text-xs text-muted-foreground mt-1">100+ listări / bucket</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Utilizabil</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-amber-800 dark:text-amber-200">
              {summary.usable}
            </p>
            <p className="text-xs text-muted-foreground mt-1">30–99</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Slab</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-orange-800 dark:text-orange-200">
              {summary.weak}
            </p>
            <p className="text-xs text-muted-foreground mt-1">10–29</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Insuficient</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-rose-800 dark:text-rose-200">
              {summary.insufficient}
            </p>
            <p className="text-xs text-muted-foreground mt-1">&lt; 10</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total bucketuri</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{summary.totalBuckets}</p>
            <p className="text-xs text-muted-foreground mt-1">grupări distincte</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Listări în eșantion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{summary.listingRowsAfterFilters}</p>
            <p className="text-foreground text-xs leading-snug">
              după filtre (apart. în fereastră: {summary.afterApartmentFilter} · max{" "}
              {summary.rawListingsInWindow} analize citite
              {summary.truncated ? " — plafon atins" : ""})
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="sticky top-0 z-10 bg-card border-b">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="p-2 font-medium">Oraș</th>
                <th className="p-2 font-medium">Sector</th>
                <th className="p-2 font-medium">Zonă (slug)</th>
                <th className="p-2 font-medium">Camere</th>
                <th className="p-2 font-medium">Suprafață</th>
                <th className="p-2 font-medium">Recență</th>
                <th className="p-2 font-medium text-right">N</th>
                <th className="p-2 font-medium text-right">Preț</th>
                <th className="p-2 font-medium text-right">Arie</th>
                <th className="p-2 font-medium text-right">Camer</th>
                <th className="p-2 font-medium text-right">GPS</th>
                <th className="p-2 font-medium text-right">AVM</th>
                <th className="p-2 font-medium text-right">Comps &gt;0</th>
                <th className="p-2 font-medium text-right">Median €/m²</th>
                <th className="p-2 font-medium text-right">P25 / P75</th>
                <th className="p-2 font-medium text-right">Host-uri</th>
                <th className="p-2 font-medium text-right">Dubluri</th>
                <th className="p-2 font-medium">Stare</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={18} className="p-8 text-center text-muted-foreground">
                    Niciun bucket după filtre. Ajustați criteriile.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={`${r.city}-${r.sector}-${r.neighborhood}-${r.rooms}-${r.areaBucket}-${r.recency}`}
                    className="border-t border-border/60 even:bg-muted/20"
                  >
                    <td className="p-2 align-top max-w-[140px] break-words">{r.city}</td>
                    <td className="p-2 align-top">{r.sector}</td>
                    <td className="p-2 align-top max-w-[200px] break-all text-xs">
                      {r.neighborhood}
                    </td>
                    <td className="p-2 align-top tabular-nums">{r.rooms}</td>
                    <td className="p-2 align-top text-xs whitespace-nowrap">{r.areaBucket}</td>
                    <td className="p-2 align-top text-xs whitespace-nowrap">{r.recency}</td>
                    <td className="p-2 align-top text-right tabular-nums font-medium">
                      {r.totalListings}
                    </td>
                    <td className="p-2 align-top text-right tabular-nums text-muted-foreground">
                      {r.withValidPrice}
                    </td>
                    <td className="p-2 align-top text-right tabular-nums text-muted-foreground">
                      {r.withValidArea}
                    </td>
                    <td className="p-2 align-top text-right tabular-nums text-muted-foreground">
                      {r.withValidRooms}
                    </td>
                    <td className="p-2 align-top text-right tabular-nums text-muted-foreground">
                      {r.withLatLng}
                    </td>
                    <td className="p-2 align-top text-right tabular-nums text-muted-foreground">
                      {r.withAvm}
                    </td>
                    <td className="p-2 align-top text-right tabular-nums text-muted-foreground">
                      {r.withAtLeastOneComp}
                    </td>
                    <td className="p-2 align-top text-right tabular-nums">
                      {r.medianEurM2 != null ? Math.round(r.medianEurM2) : "—"}
                    </td>
                    <td className="p-2 align-top text-right text-xs tabular-nums text-muted-foreground">
                      {r.p25EurM2 != null && r.p75EurM2 != null
                        ? `${Math.round(r.p25EurM2)} / ${Math.round(r.p75EurM2)}`
                        : "—"}
                    </td>
                    <td className="p-2 align-top text-right tabular-nums">{r.uniqueHosts}</td>
                    <td className="p-2 align-top text-right text-xs tabular-nums">
                      {r.duplicateRatio != null ? `${(r.duplicateRatio * 100).toFixed(0)}%` : "—"}
                    </td>
                    <td className="p-2 align-top">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                          statusClass(r.status),
                        )}
                        title={statusLabel(r.status)}
                      >
                        {statusDisplayRo(r.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {summary.totalBuckets > MAX_BUCKETS_SHOWN && (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Sunt listate primele {MAX_BUCKETS_SHOWN} bucketuri după număr (descendent). Mai sunt{" "}
          {summary.totalBuckets - MAX_BUCKETS_SHOWN} — folosiți filtre mai stricte pentru detaliu.
        </p>
      )}

      <p className="text-xs text-muted-foreground max-w-4xl">
        <strong>Legenda:</strong> „Dubluri” = ponderea listărilor cu același{" "}
        <code>contentHash</code> ca altele în bucket. „Stare” se bazează pe{" "}
        <strong>numărul total de listări</strong> din bucket. AVM = scor există (<code>avmMid</code>
        ). Fără acces public — doar admin.
      </p>
    </div>
  );
}
