import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { FUNNEL_EVENT_NAMES } from "@/lib/tracking/funnel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Funnel / Raport cumpărător",
};

function hostnameFromSourceUrl(s: string | null | undefined): string | null {
  if (!s) return null;
  try {
    return new URL(s).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function pct(n: number, d: number): string {
  if (d <= 0) return "—";
  return `${((n / d) * 100).toFixed(1)}%`;
}

export default async function AdminFunnelPage() {
  await requireAdmin();

  const t24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const t7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [rows24, rows7, previewRows, checkoutStartRows, checkoutPaidRows, failRows, domRows, rev24, rev7] =
    await Promise.all([
      prisma.funnelEvent.groupBy({
        by: ["eventName"],
        _count: { _all: true },
        where: { createdAt: { gte: t24h } },
      }),
      prisma.funnelEvent.groupBy({
        by: ["eventName"],
        _count: { _all: true },
        where: { createdAt: { gte: t7d } },
      }),
      prisma.funnelEvent.findMany({
        where: {
          eventName: "report_preview_viewed",
          createdAt: { gte: t7d },
          analysisId: { not: null },
        },
        select: { analysisId: true },
      }),
      prisma.funnelEvent.findMany({
        where: {
          eventName: "checkout_started",
          createdAt: { gte: t7d },
          analysisId: { not: null },
        },
        select: { analysisId: true },
      }),
      prisma.funnelEvent.findMany({
        where: {
          eventName: "checkout_completed",
          createdAt: { gte: t7d },
          analysisId: { not: null },
        },
        select: { analysisId: true },
      }),
      prisma.funnelEvent.findMany({
        where: { eventName: "analysis_failed", createdAt: { gte: t7d } },
        select: { metadata: true },
        take: 8000,
      }),
      prisma.funnelEvent.findMany({
        where: {
          createdAt: { gte: t7d },
          sourceUrl: { not: null },
        },
        select: { sourceUrl: true },
        take: 8000,
      }),
      prisma.reportUnlock.aggregate({
        _sum: { amountCents: true },
        where: { status: "paid", updatedAt: { gte: t24h } },
      }),
      prisma.reportUnlock.aggregate({
        _sum: { amountCents: true },
        where: { status: "paid", updatedAt: { gte: t7d } },
      }),
    ]);

  const countMap24 = new Map(rows24.map((r) => [r.eventName, r._count._all]));
  const countMap7 = new Map(rows7.map((r) => [r.eventName, r._count._all]));
  const total24 = Array.from(countMap24.values()).reduce((a, b) => a + b, 0);
  const total7 = Array.from(countMap7.values()).reduce((a, b) => a + b, 0);

  const previewSet = new Set(
    previewRows.map((r) => r.analysisId).filter((x): x is string => Boolean(x)),
  );
  const startSet = new Set(
    checkoutStartRows.map((r) => r.analysisId).filter((x): x is string => Boolean(x)),
  );
  const paidSet = new Set(
    checkoutPaidRows.map((r) => r.analysisId).filter((x): x is string => Boolean(x)),
  );

  let previewToCheckout = 0;
  for (const id of previewSet) {
    if (startSet.has(id)) previewToCheckout++;
  }
  let checkoutToPaid = 0;
  for (const id of startSet) {
    if (paidSet.has(id)) checkoutToPaid++;
  }

  const reasonCounts = new Map<string, number>();
  for (const f of failRows) {
    const m = f.metadata as Record<string, unknown> | null;
    const code = m && typeof m.code === "string" ? m.code : "necunoscut";
    if (code === "pipeline_error" && m && typeof m.message === "string") {
      const k = `pipeline:${m.message.slice(0, 48)}`;
      reasonCounts.set(k, (reasonCounts.get(k) ?? 0) + 1);
    } else {
      reasonCounts.set(code, (reasonCounts.get(code) ?? 0) + 1);
    }
  }
  const topReasons = Array.from(reasonCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const domCounts = new Map<string, number>();
  for (const r of domRows) {
    const h = hostnameFromSourceUrl(r.sourceUrl);
    if (h) domCounts.set(h, (domCounts.get(h) ?? 0) + 1);
  }
  const topDomains = Array.from(domCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const ron = (cents: number) =>
    (cents / 100).toLocaleString("ro-RO", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Funnel (raport cumpărător)</h1>
          <p className="text-muted-foreground">Evenimente interne ImobIntel — fără analytics externe</p>
        </div>
        <Link className="text-sm text-primary underline" href="/admin">
          Admin
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Evenimente (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{total24}</div>
            <p className="text-xs text-muted-foreground">Total înregistrări</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Evenimente (7 zile)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{total7}</div>
            <p className="text-xs text-muted-foreground">Total înregistrări</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Venit deblocări (RON)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ron(rev24._sum.amountCents ?? 0)}
              <span className="ml-2 text-sm font-normal text-muted-foreground">(24h)</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-muted-foreground">
              {ron(rev7._sum.amountCents ?? 0)}
              <span className="ml-1 text-sm font-normal">(7 zile)</span>
            </p>
            <p className="text-xs text-muted-foreground">Plăți finalizate (ReportUnlock paid, fereastra după actualizare)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversie previzualizare → checkout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Analize cu <code className="text-xs">report_preview_viewed</code> (7 zile, distinct):{" "}
              <strong>{previewSet.size}</strong>
            </p>
            <p>
              Dintre ele au <code className="text-xs">checkout_started</code>: <strong>{previewToCheckout}</strong> (
              {pct(previewToCheckout, previewSet.size)})
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Conversie checkout → plătit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Analize cu <code className="text-xs">checkout_started</code> (7 zile, distinct):{" "}
              <strong>{startSet.size}</strong>
            </p>
            <p>
              Dintre ele au <code className="text-xs">checkout_completed</code>: <strong>{checkoutToPaid}</strong> (
              {pct(checkoutToPaid, startSet.size)})
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Domenii sursă (7 zile)</CardTitle>
          </CardHeader>
          <CardContent>
            {topDomains.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nicio sursă cu URL</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {topDomains.map(([d, n]) => (
                  <li key={d} className="flex justify-between gap-2">
                    <span className="font-mono text-xs">{d}</span>
                    <span className="text-muted-foreground">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Motive eșec analiză (7 zile)</CardTitle>
          </CardHeader>
          <CardContent>
            {topReasons.length === 0 ? (
              <p className="text-sm text-muted-foreground">Niciun eșec</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {topReasons.map(([k, n]) => (
                  <li key={k} className="flex justify-between gap-2 break-all">
                    <span className="text-xs">{k}</span>
                    <span className="shrink-0 text-muted-foreground">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Număr per tip (ultimele 24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 font-mono text-xs">
              {FUNNEL_EVENT_NAMES.map((name) => (
                <li key={name} className="flex justify-between">
                  <span>{name}</span>
                  <span className="text-muted-foreground">{countMap24.get(name) ?? 0}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Număr per tip (ultimele 7 zile)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 font-mono text-xs">
              {FUNNEL_EVENT_NAMES.map((name) => (
                <li key={name} className="flex justify-between">
                  <span>{name}</span>
                  <span className="text-muted-foreground">{countMap7.get(name) ?? 0}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
