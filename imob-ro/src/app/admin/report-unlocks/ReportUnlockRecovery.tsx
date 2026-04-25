"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Match = {
  id: string;
  analysisId: string;
  userId: string | null;
  email: string | null;
  status: string;
  amountCents: number;
  currency: string;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export function ReportUnlockRecovery() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const [reconcileMsg, setReconcileMsg] = useState<string | null>(null);

  async function search() {
    setLoading(true);
    setError(null);
    setMatches(null);
    setReconcileMsg(null);
    try {
      const res = await fetch(
        `/api/admin/report-unlocks/lookup?${new URLSearchParams({ q: q.trim() })}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        setError(res.status === 401 ? "Nu ești admin sau sesiunea a expirat." : "Căutare eșuată.");
        return;
      }
      const data = (await res.json()) as { matches: Match[] };
      setMatches(data.matches);
    } catch {
      setError("Eroare de rețea.");
    } finally {
      setLoading(false);
    }
  }

  async function reconcile(reportUnlockId: string) {
    setReconcileId(reportUnlockId);
    setReconcileMsg(null);
    try {
      const res = await fetch("/api/admin/report-unlocks/reconcile", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportUnlockId }),
      });
      const data = (await res.json()) as { ok?: boolean; applied?: boolean; error?: string; reason?: string };
      if (res.ok && data.ok) {
        setReconcileMsg(
          data.applied
            ? "Marcat plătit în DB (Stripe a confirmat plata)."
            : `Fără modificare: ${data.reason ?? "deja plătit sau stadiu incompatibil"}.`,
        );
        void search();
      } else {
        setReconcileMsg(
          `Nu s-a putut reconcilia: ${data.error ?? res.status} — folosește Dashboard Stripe pentru detalii.`,
        );
      }
    } catch {
      setReconcileMsg("Eroare de rețea la reconciliere.");
    } finally {
      setReconcileId(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Caută după: id sesiune Stripe <code className="text-xs">cs_…</code>, PaymentIntent{" "}
        <code className="text-xs">pi_…</code>, CUID deblocare, <code className="text-xs">analysisId</code> sau
        e-mail (exact, mic).
      </p>
      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-md"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void search()}
          placeholder="cs_… / pi_… / CUID / e-mail / analysisId"
        />
        <Button type="button" onClick={() => void search()} disabled={loading || !q.trim()}>
          {loading ? "…" : "Caută"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {reconcileMsg ? <p className="text-sm text-foreground border border-border rounded-md p-2">{reconcileMsg}</p> : null}
      {matches && matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">Niciun rezultat.</p>
      ) : null}
      {matches && matches.length > 0 ? (
        <div className="overflow-x-auto text-sm border rounded-md">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="p-2 pr-3">Stare</th>
                <th className="p-2 pr-3">Raport</th>
                <th className="p-2 pr-3">E-mail</th>
                <th className="p-2 pr-3">Sesiune / PI</th>
                <th className="p-2 pr-3">CUID</th>
                <th className="p-2">Acțiune</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id} className="border-b border-border/50">
                  <td className="p-2 pr-3 whitespace-nowrap">
                    <span
                      className={
                        m.status === "paid"
                          ? "text-emerald-800 font-medium"
                          : m.status === "refunded"
                            ? "text-amber-800 font-medium"
                            : "text-muted-foreground"
                      }
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="p-2 pr-3 max-w-[180px] truncate">
                    <a className="text-primary underline" href={`/report/${m.analysisId}`}>
                      {m.analysisId}
                    </a>
                  </td>
                  <td className="p-2 pr-3">{m.email || "—"}</td>
                  <td className="p-2 pr-3 text-xs text-muted-foreground max-w-[200px]">
                    {m.stripeSessionId ? <div>sess: {m.stripeSessionId}</div> : null}
                    {m.stripePaymentIntentId ? <div>pi: {m.stripePaymentIntentId}</div> : null}
                    {!m.stripeSessionId && !m.stripePaymentIntentId ? "—" : null}
                  </td>
                  <td className="p-2 pr-3 font-mono text-xs">{m.id}</td>
                  <td className="p-2">
                    {m.status === "pending" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={reconcileId === m.id}
                        onClick={() => void reconcile(m.id)}
                      >
                        {reconcileId === m.id ? "…" : "Verifică Stripe + marcat plătit"}
                      </Button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
