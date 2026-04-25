"use client";

import { REPORT_UNLOCK_NO_REFUND_FOR_DISAGREEMENT_RO } from "@/lib/copy/report-unlock-refund-ro";
import { postFunnelEvent } from "@/lib/tracking/funnel-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type Props = {
  analysisId: string;
  buttonLabel: string;
  /**
   * When false, user must sign in before Stripe (guest-only checkout is off) — unless they
   * are already logged in, in which case this should be true from the parent.
   */
  canUseStripeForUnlock: boolean;
};

/**
 * One-time Stripe Checkout for this report, or sign-in CTA if checkout requires an account and user is signed out.
 */
export function UnlockReportButton({
  analysisId,
  buttonLabel,
  canUseStripeForUnlock,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [alreadyMsg, setAlreadyMsg] = useState<string | null>(null);
  const router = useRouter();
  const signInHref = `/auth/signin?callbackUrl=${encodeURIComponent(`/report/${analysisId}`)}`;

  const goCheckout = useCallback(async () => {
    setErr(null);
    setAlreadyMsg(null);
    setLoading(true);
    try {
      postFunnelEvent({
        eventName: "unlock_cta_clicked",
        analysisId,
        path: typeof window !== "undefined" ? window.location.pathname : "/report",
      });
      const res = await fetch(`/api/report/${analysisId}/unlock/checkout`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
        signInPath?: string;
      };
      if (res.status === 401 && data.error === "signin_required") {
        window.location.href = signInHref;
        return;
      }
      if (res.status === 409 && data.error === "already_unlocked") {
        setAlreadyMsg("Raport deja deblocat.");
        router.refresh();
        return;
      }
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setErr("Nu am putut porni plata. Încearcă din nou.");
    } catch {
      setErr("Nu am putut porni plata. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  }, [analysisId, router, signInHref]);

  if (!canUseStripeForUnlock) {
    return (
      <div className="space-y-3">
        <Link
          href={signInHref}
          className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          Conectează-te pentru a debloca
        </Link>
        <p className="text-xs text-slate-600 leading-relaxed">
          Deblocarea necesită cont. Rapoartele plătite apar la{" "}
          <Link href={signInHref} className="font-medium text-primary underline underline-offset-2">
            Rapoartele mele
          </Link>{" "}
          după autentificare.
        </p>
        {alreadyMsg ? <p className="text-sm text-emerald-800">{alreadyMsg}</p> : null}
        <p className="text-xs text-slate-500">Plata se procesează securizat prin Stripe.</p>
        <p className="text-[11px] leading-relaxed text-slate-500">{REPORT_UNLOCK_NO_REFUND_FOR_DISAGREEMENT_RO}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={goCheckout}
        disabled={loading}
        className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? "Se deschide plata..." : buttonLabel}
      </button>
      {alreadyMsg ? <p className="text-sm text-emerald-800">{alreadyMsg}</p> : null}
      {err && <p className="text-sm text-red-600">{err}</p>}
      <p className="text-xs text-slate-500">Plata se procesează securizat prin Stripe. Fără abonament obligatoriu.</p>
      <p className="text-[11px] leading-relaxed text-slate-500">{REPORT_UNLOCK_NO_REFUND_FOR_DISAGREEMENT_RO}</p>
    </div>
  );
}
