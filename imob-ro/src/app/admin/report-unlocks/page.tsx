import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReportUnlockFunnelAdmin } from "@/lib/admin/report-unlock-funnel";
import { requireAdmin } from "@/lib/auth-guards";

import { ReportUnlockRecovery } from "./ReportUnlockRecovery";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Checkout raport (abandon)",
};

function fmtT(d: Date) {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export default async function AdminReportUnlocksPage() {
  await requireAdmin();
  const d = await getReportUnlockFunnelAdmin();

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="underline hover:text-foreground" href="/admin/money">
            Bani
          </Link>{" "}
          /{" "}
          <Link className="underline hover:text-foreground" href="/admin">
            Admin
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Deblocări — checkout & abandon</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Raport: încercări Stripe, plăți finalizate, cozi „pending”, conversie 7 zile, restanțe &gt; 30
          min. Timp: {d.nowIso}
        </p>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl">
          Reamintire automată o singură dată, după 24h, doar când există e-mail pe încercare și
          acord (ReportLead) pentru acel anunț — vezi crons /{" "}
          <code className="text-xs">/api/cron/report-unlock-reminders</code>.
        </p>
        <p className="mt-3 max-w-2xl rounded-md border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          <span className="font-medium">Rambursări:</span> starea <code className="text-[11px]">refunded</code> pe{" "}
          <code className="text-[11px]">ReportUnlock</code> poate apărea după o rambursare în Stripe
          (webhook). Nu există rambursare automată doar din aplicație: banii se mută prin Stripe;
          aici vezi starea rândului și reconcilieri.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recuperare plată fără deblocare (admin)</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportUnlockRecovery />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending (active)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{d.pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending &gt; 30 min</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-amber-700">{d.pendingStale30mCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Probabil părăsire a plății</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Plăți 7z</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-emerald-800">{d.paidUnlocks7d}</div>
            <p className="text-xs text-muted-foreground mt-1">Din toate, plătite: {d.paidUnlocksAll}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rambursări 7z</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-amber-800">{d.refundedUnlocks7d}</div>
            <p className="text-xs text-muted-foreground mt-1">Total rambursate: {d.refundedUnlocksAll}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Încercări 7z (rânduri create)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{d.unlockRows7d}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversie 7z (plă tit / încercare)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{d.checkoutToPaid7d}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reamintiri trimise (total)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{d.remindersSentCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Câmp <code>abandonmentReminderSentAt</code></p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending &gt; 30 min (antrenament abandon)</CardTitle>
        </CardHeader>
        <CardContent>
          {d.stale30Sample.length === 0 ? (
            <p className="text-sm text-muted-foreground">Niciun rând (sau toate &lt; 30 min).</p>
          ) : (
            <div className="overflow-x-auto text-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-1 pr-3">Creat</th>
                    <th className="py-1 pr-3">Email</th>
                    <th className="py-1 pr-3">Raport</th>
                    <th className="py-1">Sesiune</th>
                  </tr>
                </thead>
                <tbody>
                  {d.stale30Sample.map((r) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-1.5 pr-3 whitespace-nowrap text-muted-foreground">
                        {fmtT(r.createdAt)}
                      </td>
                      <td className="py-1.5 pr-3">{r.email || "—"}</td>
                      <td className="py-1.5 pr-3 max-w-[200px] truncate">
                        <Link className="text-primary underline" href={`/report/${r.analysisId}`}>
                          {r.analysis.extractedListing?.title?.slice(0, 40) || r.analysisId}
                        </Link>
                      </td>
                      <td className="py-1.5 text-xs text-muted-foreground">
                        {r.stripeSessionId ? `${r.stripeSessionId.slice(0, 18)}…` : "fără sesiune"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent pending</CardTitle>
          </CardHeader>
          <CardContent>
            {d.recentPending.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-1 text-sm max-h-80 overflow-y-auto">
                {d.recentPending.map((r) => (
                  <li key={r.id} className="flex flex-wrap justify-between gap-2 border-b border-border/40 pb-1">
                    <Link className="text-primary underline truncate" href={`/report/${r.analysisId}`}>
                      {r.analysis.extractedListing?.title?.slice(0, 32) || r.analysisId}
                    </Link>
                    <span className="text-muted-foreground text-xs">
                      {fmtT(r.createdAt)} · {r.email || "fără email"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent plătit</CardTitle>
          </CardHeader>
          <CardContent>
            {d.recentPaid.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-1 text-sm max-h-80 overflow-y-auto">
                {d.recentPaid.map((r) => (
                  <li key={r.id} className="flex flex-wrap justify-between gap-2 border-b border-border/40 pb-1">
                    <Link className="text-primary underline truncate" href={`/report/${r.analysisId}`}>
                      {r.analysis.extractedListing?.title?.slice(0, 32) || r.analysisId}
                    </Link>
                    <span className="text-muted-foreground text-xs">
                      {(r.amountCents / 100).toLocaleString("ro-RO")} RON · pl. {fmtT(r.updatedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent rambursat (acces retras)</CardTitle>
          </CardHeader>
          <CardContent>
            {d.recentRefunded.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-1 text-sm max-h-80 overflow-y-auto">
                {d.recentRefunded.map((r) => (
                  <li key={r.id} className="flex flex-wrap justify-between gap-2 border-b border-border/40 pb-1">
                    <Link className="text-primary underline truncate" href={`/report/${r.analysisId}`}>
                      {r.analysis.extractedListing?.title?.slice(0, 32) || r.analysisId}
                    </Link>
                    <span className="text-muted-foreground text-xs">
                      {fmtT(r.updatedAt)} ·{" "}
                      {(() => {
                        const ref = r.stripeSessionId ?? r.stripePaymentIntentId;
                        return ref ? `${ref.slice(0, 12)}…` : "—";
                      })()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
