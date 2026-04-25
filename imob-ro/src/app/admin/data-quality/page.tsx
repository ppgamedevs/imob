import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDataQualityDashboard } from "@/lib/admin/data-quality-dashboard";
import { requireAdmin } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calitate date / rapoarte",
};

function pct(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0%";
  return `${(n * 100).toFixed(1)}%`;
}

function fmtN(n: number, digits = 1): string {
  return n.toLocaleString("ro-RO", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

type Win = Awaited<ReturnType<typeof getDataQualityDashboard>>["last24h"];

function TimeBlock({ label, m, note }: { label: string; m: Win; note?: string }) {
  const q = m.quality;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      <div className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
        <Row l="Analize pornite (funnel, distinct de ID analiză)" v={m.analysesStartedFunnel} />
        <Row l="Analize create (rânduri Analysis)" v={m.analysesCreated} />
        <Row l="Analize finalizate (done, după data actualizării)" v={m.analysesDone} />
        <Row l="Eșuate / respins (stări terminal negative)" v={m.analysesFailedTerminal} />
        <Row l="Eșec extragere (status error sau cod extragere)" v={m.extractionFailed} />
        <Row l="Funnel analysis_failed (distinct ID)" v={m.analysisFailedFunnel} />
        <Row l="Done: lipsește preț" v={m.missingPrice} />
        <Row l="Done: lipsește suprafață" v={m.missingArea} />
        <Row l="Done: lipsesc camere" v={m.missingRooms} />
        <Row l="Done: fără pereche GPS (lipsește lat sau lng)" v={m.missingLocation} />
        <div className="col-span-full border-t border-border/60 pt-2 mt-1">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            Comparabile (rapoarte done în fereastră)
          </p>
        </div>
        <Row l="0 comparabile" v={q.comps0} />
        <Row l="1–2 comparabile" v={q.comps1to2} />
        <Row l="3+ comparabile" v={q.comps3plus} />
        <div className="col-span-full border-t border-border/60 pt-2 mt-1">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            Încredere (explain.confidence, done)
          </p>
        </div>
        <Row l="Ridicată" v={q.high} />
        <Row l="Medie" v={q.medium} />
        <Row l="Scăzută" v={q.low} />
        <Row l="Necunoscut" v={q.unknown} />
      </div>
    </div>
  );
}

function Row({ l, v }: { l: string; v: number }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground leading-snug">{l}</span>
      <span className="shrink-0 font-medium tabular-nums text-foreground">
        {v.toLocaleString("ro-RO")}
      </span>
    </div>
  );
}

function HostTable({
  rows,
  label,
}: {
  rows: Awaited<ReturnType<typeof getDataQualityDashboard>>["byHost7d"];
  label: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nu există analize noi în fereastră.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Sursă (host)</th>
            <th className="py-2 pr-3 font-medium tabular-nums">N total</th>
            <th className="py-2 pr-3 font-medium tabular-nums">Done</th>
            <th className="py-2 pr-3 font-medium tabular-nums">Eșuate</th>
            <th className="py-2 pr-3 font-medium">Rată „succes” (done / total)</th>
            <th className="py-2 pr-3 font-medium">Rată eșec (failed / total)</th>
            <th className="py-2 pr-3 font-medium">Medie comp (done)</th>
            <th className="py-2 pr-3 font-medium">% fără preț (done)</th>
            <th className="py-2 font-medium">% fără suprafață (done)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.host} className="border-b border-border/50">
              <td className="py-2 pr-3 font-mono text-xs">{r.host}</td>
              <td className="py-2 pr-3 tabular-nums">{r.nTotal}</td>
              <td className="py-2 pr-3 tabular-nums">{r.nDone}</td>
              <td className="py-2 pr-3 tabular-nums">{r.nFailed}</td>
              <td className="py-2 pr-3">{pct(r.successRate)}</td>
              <td className="py-2 pr-3">{pct(r.failureRate)}</td>
              <td className="py-2 pr-3 tabular-nums">
                {r.avgComps == null ? "—" : fmtN(r.avgComps, 1)}
              </td>
              <td className="py-2 pr-3">{fmtN(r.pctMissingPrice, 1)}%</td>
              <td className="py-2">{fmtN(r.pctMissingArea, 1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminDataQualityPage() {
  await requireAdmin();
  const d = await getDataQualityDashboard();

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Calitate date și risc de plată</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Actualizat: {d.nowIso}. Fereastră 24 h și 7 zile de la{" "}
            <code className="text-xs">now</code>. Nu e public.
          </p>
        </div>
        <div className="flex flex-col gap-1 sm:items-end text-sm">
          <Link className="text-primary underline" href="/admin">
            Admin
          </Link>
          <Link className="text-muted-foreground underline" href="/admin/report-quality">
            Calitate vânzare
          </Link>
          <Link className="text-muted-foreground underline" href="/admin/money">
            Bani
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ultimele 24 h</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeBlock
              label="Agregate"
              m={d.last24h}
              note="„Done” = analize cu starea finală în fereastră; metricile de câmp se aplică doar rândurilor done."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ultimele 7 zile</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeBlock label="Agregate" m={d.last7d} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pe sursă (host)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <p className="text-sm text-muted-foreground">
            Analize <strong>noi</strong> (createdAt) în fereastră, cu agregare pe domeniul
            anunțului. Rată „succes” = done / total; „eșec” = stări terminal negative / total.
          </p>
          <HostTable rows={d.byHost24h} label="Fereastră 24 h" />
          <HostTable rows={d.byHost7d} label="Fereastră 7 zile" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Risc: rapoarte deja plătite (toate deblocările „paid”)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <Row
            l="Plătite cu încredere scăzută (snapshot curent)"
            v={d.paidRisk.paidWithLowConfidence}
          />
          <Row l="Plătite fără niciun CompMatch" v={d.paidRisk.paidWithZeroComps} />
          <Row l="Plătite fără coordonate GPS în extras" v={d.paidRisk.paidMissingLocation} />
          <p className="pt-2 text-xs text-muted-foreground">
            Valorile se pot suprapune (același raport poate fi și „low” și fără comp). Nu sunt
            erori, sunt semnale.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rapoarte slabe recente (max. 30 zile, primele eșantion)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Includem doar <strong>done</strong> cu: încredere low, 0 comparabile, fără GPS, sau
            câmpuri lipsă critice (preț/suprafață). Tabel: legătură publică + ID pentru suport.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2">ID analiză</th>
                  <th className="py-2 pr-2">Host</th>
                  <th className="py-2 pr-2">Câmpuri lipsă</th>
                  <th className="py-2 pr-2">Comp</th>
                  <th className="py-2 pr-2">Încredere</th>
                  <th className="py-2 pr-2">Plătit</th>
                  <th className="py-2">Link</th>
                </tr>
              </thead>
              <tbody>
                {d.weakReports.map((r) => (
                  <tr key={r.analysisId} className="border-b border-border/50">
                    <td className="py-2 pr-2 font-mono text-xs">{r.analysisId}</td>
                    <td className="py-2 pr-2 text-xs">{r.host}</td>
                    <td className="py-2 pr-2 text-xs">
                      {r.missingFields.length ? r.missingFields.join(", ") : "—"}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">{r.compCount}</td>
                    <td className="py-2 pr-2">{r.confidence}</td>
                    <td className="py-2 pr-2">{r.isPaid ? "Da" : "Nu"}</td>
                    <td className="py-2">
                      <Link
                        href={`/report/${r.analysisId}`}
                        className="text-primary underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Raport
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {d.weakReports.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nimic în criteriile curente (sau fără date în eșantion).
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
