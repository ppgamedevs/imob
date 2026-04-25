import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth-guards";
import {
  getMoneyDashboard,
  last7dStart,
  type FunnelOrPlaceholder,
  type QualityCounts,
} from "@/lib/admin/money-dashboard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Money / Rapoarte cumpărător",
};

function fmtFunnel(v: FunnelOrPlaceholder): string {
  if (!v.available) return "N/A (funnel / migrare)";
  return v.value != null ? String(v.value) : "0";
}

function ron2(n: number): string {
  return n.toLocaleString("ro-RO", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

function QRow({ label, n }: { label: string; n: number }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{n.toLocaleString("ro-RO")}</span>
    </div>
  );
}

function qualityRows(q: QualityCounts) {
  return (
    <div className="space-y-1">
      <QRow label="Încredere ridicată (model)" n={q.high} />
      <QRow label="Încredere medie" n={q.medium} />
      <QRow label="Încredere scăzută" n={q.low} />
      <QRow label="Necunoscut / fără snapshot scor" n={q.unknown} />
      <QRow label="0 comparabile" n={q.comps0} />
      <QRow label="1–2 comparabile" n={q.comps1to2} />
      <QRow label="3+ comparabile" n={q.comps3plus} />
    </div>
  );
}

function ratingLabel(r: string): string {
  if (r === "yes") return "Da";
  if (r === "partial") return "Parțial";
  if (r === "no") return "Nu";
  return r;
}

export default async function AdminMoneyPage() {
  await requireAdmin();
  const d = await getMoneyDashboard();
  const t7d = last7dStart();
  const [feedbackByRating, feedbackRecent] = await Promise.all([
    prisma.reportFeedback.groupBy({
      by: ["rating"],
      where: { createdAt: { gte: t7d } },
      _count: { _all: true },
    }),
    prisma.reportFeedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { analysisId: true, rating: true, comment: true, createdAt: true },
    }),
  ]);

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bani — rapoarte cumpărător</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            „Azi” = de la începutul zilei UTC: {d.todayStartUtc}. Ultimele 7 zile = fereastră glisantă de la {d.last7dStart}
            .
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Link className="text-sm text-primary underline" href="/admin">
            Admin
          </Link>
          <Link className="text-sm text-muted-foreground underline" href="/admin/funnel">
            Funnel (evenimente)
          </Link>
          <Link className="text-sm text-muted-foreground underline" href="/admin/report-unlocks">
            Checkout & abandon
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Metrici azi (UTC)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <QRow label="Rapoarte generate (done)" n={d.today.reportsGenerated} />
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Vizualizări previzualizare</span>
              <span className="font-medium tabular-nums">{fmtFunnel(d.today.previewViews)}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Click CTA deblocare</span>
              <span className="font-medium tabular-nums">{fmtFunnel(d.today.unlockCtaClicks)}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Checkout pornit</span>
              <span className="font-medium tabular-nums">{fmtFunnel(d.today.checkoutStarts)}</span>
            </div>
            <QRow label="Deblocări plătite" n={d.today.paidUnlocks} />
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Venit (RON, plăți finalizate azi)</span>
              <span className="font-medium tabular-nums">{ron2(d.today.revenueRon)}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Descărcări PDF (finalizate)</span>
              <span className="font-medium tabular-nums">{fmtFunnel(d.today.pdfDownloads)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ultimele 7 zile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <QRow label="Rapoarte generate (done)" n={d.last7d.reportsGenerated} />
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Vizualizări previzualizare</span>
              <span className="font-medium tabular-nums">{fmtFunnel(d.last7d.previewViews)}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Click CTA deblocare</span>
              <span className="font-medium tabular-nums">{fmtFunnel(d.last7d.unlockCtaClicks)}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Checkout pornit</span>
              <span className="font-medium tabular-nums">{fmtFunnel(d.last7d.checkoutStarts)}</span>
            </div>
            <QRow label="Deblocări plătite" n={d.last7d.paidUnlocks} />
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Venit (RON)</span>
              <span className="font-medium tabular-nums">{ron2(d.last7d.revenueRon)}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Descărcări PDF (finalizate)</span>
              <span className="font-medium tabular-nums">{fmtFunnel(d.last7d.pdfDownloads)}</span>
            </div>
            <div className="mt-3 border-t pt-3 text-sm">
              <p>
                <span className="text-muted-foreground">Conversie previzualizare → plătit (analize distincte): </span>
                <strong>{d.conversion.previewToPaidRate}</strong> ({d.conversion.both7d} / {d.conversion.previewAnalyses7d})
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Venit mediu / analiză cu previzualizare (7 zile): </span>
                <strong>{d.conversion.avgRevenueRonPerPreviewAnalysis} RON</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calitate date (7 zile, rapoarte finalizate)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Încredere din <code className="text-xs">ScoreSnapshot.explain.confidence</code>; comparabile numărate
              per analiză.
            </p>
          </CardHeader>
          <CardContent>{qualityRows(d.quality7d)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Surse (număr rapoarte finalizate, 7 zile)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {d.source7d.map((r) => (
                <li key={r.label} className="flex justify-between gap-2">
                  <span className="font-mono text-xs">{r.label}</span>
                  <span className="tabular-nums text-muted-foreground">{r.count.toLocaleString("ro-RO")}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feedback rapoarte plătite (după deblocare)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Răspunsuri la „A meritat raportul prețul plătit?”; ultimele 7 zile agregate pe rating.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-1 text-sm">
            {feedbackByRating.map((row) => (
              <li key={row.rating} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{ratingLabel(row.rating)}</span>
                <span className="font-medium tabular-nums">{row._count._all.toLocaleString("ro-RO")}</span>
              </li>
            ))}
            {feedbackByRating.length === 0 ? (
              <li className="text-sm text-muted-foreground">Încă fără răspunsuri în fereastră.</li>
            ) : null}
          </ul>
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Recente</p>
            <ul className="space-y-2 text-sm">
              {feedbackRecent.map((f) => (
                <li key={`${f.analysisId}-${f.createdAt.toISOString()}`} className="border-b border-border/60 pb-2 last:border-0">
                  <div className="flex flex-wrap justify-between gap-2">
                    <Link
                      href={`/report/${f.analysisId}`}
                      className="font-mono text-xs text-primary underline"
                    >
                      {f.analysisId.slice(0, 12)}…
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {ratingLabel(f.rating)} · {f.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                    </span>
                  </div>
                  {f.comment ? (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{f.comment}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eșecuri și probleme (7 zile)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Evenimente <code>analysis_failed</code> (funnel) + rapoarte finalizate cu câmpuri lipsă. „Domeniu
            neacceptat” nu are analiză în baza de date; rămâne 0 aici.{" "}
            {!d.failure7d.funnelFailuresAvailable && "Eșecurile din funnel nu sunt disponibile (migrare?)."}
          </p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm">
            {d.failure7d.buckets.map((b) => (
              <li key={b.key} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{b.label}</span>
                <span className="shrink-0 font-medium tabular-nums">{b.count.toLocaleString("ro-RO")}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Lipsă preț / suprafață: număr de rapoarte <code>done</code> din perioadă, cu câmp lipsă în anunțul extras. Nu
            sunt neapărat eșecuri de pipeline.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
