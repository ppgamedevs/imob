"use client";

import { AnalysisFailureRecovery } from "@/components/analyze/AnalysisFailureRecovery";
import { BuyerReportTrustNote } from "@/components/common/buyer-report-trust-note";
import { getAnalyzePortalExpectationLinesRo } from "@/lib/analyze/supported-portals-expectations-ro";
import {
  isAnalyzeFailureReason,
  SUPPORTED_LISTING_DOMAINS_RO,
  type AnalyzeFailureReason,
} from "@/lib/analyze/analyze-failure-reasons";
import { postFunnelEvent } from "@/lib/tracking/funnel-client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

export const dynamic = "force-dynamic";

const MIN_LOADING_MS = 6000;

const LOADING_STEPS = [
  { label: "Se extrag datele din anunț...", durationPct: 15 },
  { label: "Se identifică zona și comparabilele...", durationPct: 35 },
  { label: "Se calculează reperul de preț (AVM)...", durationPct: 60 },
  { label: "Se evaluează riscurile și contextul...", durationPct: 80 },
  { label: "Se generează raportul...", durationPct: 95 },
];

function getStepIndex(elapsed: number, total: number): number {
  const pct = (elapsed / total) * 100;
  for (let i = LOADING_STEPS.length - 1; i >= 0; i--) {
    if (pct >= LOADING_STEPS[i].durationPct) return i;
  }
  return 0;
}

function AnalyzePageContent() {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get("url");
  const [url, setUrl] = useState(urlParam || "");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [syncFailure, setSyncFailure] = useState<{
    reason: AnalyzeFailureReason;
    sourceUrl: string;
  } | null>(null);
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const router = useRouter();
  const startTimeRef = useRef(0);
  const pendingResultRef = useRef<string | null>(null);
  const animFrameRef = useRef(0);

  useEffect(() => {
    if (urlParam && status === "idle") {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParam]);

  useEffect(() => {
    if (status !== "loading") return;

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startTimeRef.current;
      const apiDone = pendingResultRef.current !== null;

      const target = apiDone
        ? MIN_LOADING_MS
        : Math.max(MIN_LOADING_MS, elapsed + 2000);
      const pct = Math.min((elapsed / target) * 100, apiDone ? 100 : 95);

      setProgress(pct);
      setStepIdx(getStepIndex(elapsed, target));

      if (apiDone && elapsed >= MIN_LOADING_MS) {
        setStatus("done");
        setProgress(100);
        setTimeout(() => {
          router.push(`/report/${pendingResultRef.current}`);
        }, 400);
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [status, router]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    try {
      const parsed = new URL(trimmed);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        setError("URL-ul trebuie sa inceapa cu https:// sau http://");
        return;
      }
      if (trimmed.length > 2048) {
        setError("URL-ul este prea lung.");
        return;
      }
    } catch {
      setError("URL invalid. Introdu un link complet (ex: https://www.imobiliare.ro/oferta/...).");
      return;
    }

    setError(null);
    setSyncFailure(null);
    pendingResultRef.current = null;
    startTimeRef.current = Date.now();
    setProgress(0);
    setStepIdx(0);
    setStatus("loading");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.id) {
        pendingResultRef.current = data.id;
        postFunnelEvent({
          eventName: "analyze_form_submit",
          analysisId: data.id,
          path: "/analyze",
          metadata: {
            origin: "analyze",
            reused: data.reused === true,
          },
        });
      } else if (res.status === 402) {
        setStatus("idle");
        setError(`Limita atinsa: ${data.used ?? "?"}/${data.max ?? "?"} analize luna aceasta. Upgradeaza pentru mai multe.`);
      } else if (res.status === 429) {
        setStatus("idle");
        setError("Prea multe cereri. Incearca din nou in cateva secunde.");
      } else if (res.status === 400) {
        setStatus("idle");
        const r = isAnalyzeFailureReason(String(data?.reason)) ? (data.reason as AnalyzeFailureReason) : "extraction_failed";
        setSyncFailure({ reason: r, sourceUrl: trimmed });
        postFunnelEvent({
          eventName: "analysis_failed",
          path: "/analyze",
          metadata: { reason: r },
        });
      } else {
        setStatus("idle");
        setError(data?.error || "Analiza nu a putut fi pornita. Verifica URL-ul si incearca din nou.");
      }
    } catch {
      setStatus("idle");
      setError("Eroare de conexiune. Verifica conexiunea la internet si incearca din nou.");
    }
  }, [url]);

  if (status === "loading" || status === "done") {
    return (
      <div className="mx-auto max-w-[520px] px-5 py-24 md:py-36">
        <div className="text-center">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-600" />
          </div>

          <h2 className="text-[22px] md:text-[26px] font-bold tracking-tight text-gray-950">
            {status === "done" ? "Raport gata!" : "Analizam proprietatea"}
          </h2>

          <p className="mt-2 text-[14px] text-gray-500 transition-all duration-500">
            {status === "done"
              ? "Redirectionare catre raportul complet..."
              : LOADING_STEPS[stepIdx]?.label}
          </p>
        </div>

        <div className="mt-10">
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-[12px] text-gray-400">
            <span>{Math.round(progress)}%</span>
            <span>{status === "done" ? "Complet" : "Se proceseaza..."}</span>
          </div>
        </div>

        <div className="mt-10 space-y-3">
          {LOADING_STEPS.map((step, i) => {
            const isDone = i < stepIdx || status === "done";
            const isCurrent = i === stepIdx && status !== "done";
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-[13px] transition-all duration-500 ${
                  isDone
                    ? "text-green-700 bg-green-50/60"
                    : isCurrent
                      ? "text-blue-700 bg-blue-50/60 font-medium"
                      : "text-gray-400"
                }`}
              >
                <span className="shrink-0 w-5 text-center">
                  {isDone ? (
                    <svg className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : isCurrent ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-gray-300 mx-auto" />
                  )}
                </span>
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[680px] px-5 py-16 md:py-24">
      <h1 className="text-[28px] md:text-[36px] font-bold tracking-tight text-gray-950">
        Analiză din link
      </h1>
      <p className="mt-2 text-[15px] text-gray-500">
        Lipește un anunț de pe un portal suportat. Vei primi mai întâi o previzualizare; raportul
        complet și PDF se deblochează când alegi, conform ofertei tale.
      </p>
      <ul className="mt-3 space-y-1.5 text-[14px] leading-relaxed text-gray-600">
        {getAnalyzePortalExpectationLinesRo().map((line) => (
          <li key={line} className="flex gap-2">
            <span className="text-gray-400" aria-hidden>
              ·
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="mt-8">
        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm transition-shadow duration-300 focus-within:shadow-md focus-within:border-gray-300">
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
              setSyncFailure(null);
            }}
            type="url"
            placeholder="https://www.imobiliare.ro/vanzare-apartamente/bucuresti/zona/apartament-de-vanzare-2-camere-XY12345"
            className="flex-1 bg-transparent text-[14px] text-gray-900 placeholder:text-gray-400 px-3 py-3 outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-[13px] font-semibold text-white shadow-sm hover:shadow-md hover:brightness-110 active:scale-[0.97] transition-all duration-200"
          >
            Analizeaza
          </button>
        </div>

        {error && !syncFailure && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        )}
        {syncFailure && (
          <div className="mt-4">
            <AnalysisFailureRecovery
              variant="analyze"
              reason={syncFailure.reason}
              sourceUrl={syncFailure.sourceUrl}
            />
          </div>
        )}
        <p className="mt-2 text-[12px] text-gray-500">
          Portaluri acceptate: {SUPPORTED_LISTING_DOMAINS_RO.join(", ")}
        </p>
      </form>

      <div className="mt-8 max-w-lg">
        <BuyerReportTrustNote variant="compact" className="text-gray-500" />
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[680px] px-5 py-16">Se incarca...</div>}>
      <AnalyzePageContent />
    </Suspense>
  );
}
