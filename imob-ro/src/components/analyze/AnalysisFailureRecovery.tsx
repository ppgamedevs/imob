"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import {
  getAnalyzeFailureCopyRo,
  supportedDomainsListRo,
} from "@/lib/analyze/analyze-failure-copy-ro";
import { getAnalyzePortalExpectationLinesRo } from "@/lib/analyze/supported-portals-expectations-ro";
import type { AnalyzeFailureReason } from "@/lib/analyze/analyze-failure-reasons";
import { isAnalyzeFailureReason } from "@/lib/analyze/analyze-failure-reasons";
import RetryAnalysisButton from "@/app/report/[id]/RetryAnalysisButton";

type Variant = "analyze" | "report";

export type AnalysisFailureRecoveryProps = {
  variant: Variant;
  reason: string;
  sourceUrl: string;
  analysisId?: string | null;
  /** Shown when reason is unsupported_domain (no promise of timeline). */
  showSiteSupportOptIn?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AnalysisFailureRecovery({
  variant,
  reason: reasonRaw,
  sourceUrl,
  analysisId,
  showSiteSupportOptIn: showOptInProp,
}: AnalysisFailureRecoveryProps) {
  const reason: AnalyzeFailureReason = isAnalyzeFailureReason(reasonRaw)
    ? reasonRaw
    : "extraction_failed";
  const copy = getAnalyzeFailureCopyRo(reason);
  const showSiteSupportOptIn = showOptInProp ?? reason === "unsupported_domain";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submitInterest = useCallback(async () => {
    if (!EMAIL_RE.test(email.trim())) {
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/analyze/site-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          sourceUrl: sourceUrl || undefined,
          reason,
          analysisId: analysisId ?? undefined,
        }),
      });
      if (res.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }, [email, sourceUrl, reason, analysisId]);

  const domainsLine = supportedDomainsListRo();

  return (
    <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-4 text-[14px] text-amber-950 shadow-sm">
      <h2 className="text-[16px] font-semibold text-amber-950 tracking-tight">{copy.title}</h2>
      <p className="mt-2 leading-relaxed text-amber-950/90">{copy.body}</p>
      {reason === "search_listing_index" && (
        <p className="mt-2 font-medium text-amber-950">
          ImobIntel are nevoie de un URL de anunț (fișa apartamentului), nu de o pagină de căutare
          sau listă de rezultate.
        </p>
      )}
      {reason === "unsupported_domain" && (
        <p className="mt-2 text-[13px] text-amber-900/90">
          Domenii acceptate acum: <span className="font-medium text-amber-950">{domainsLine}</span>.
        </p>
      )}

      <ul className="mt-3 list-disc pl-5 space-y-1.5 text-amber-950/90">
        {copy.next.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>

      <p className="mt-3 text-[12px] text-amber-900/85 border-t border-amber-200/80 pt-3">
        Portaluri din care putem porni o analiză (listă la zi): {domainsLine}
      </p>
      <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-amber-900/90">
        {getAnalyzePortalExpectationLinesRo().map((line) => (
          <li key={line} className="flex gap-1.5">
            <span aria-hidden>·</span>
            {line}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-col gap-2">
        {variant === "analyze" && (
          <p className="text-[13px] text-amber-950/90">
            Poți insera un alt link folosind câmpul de mai sus.
          </p>
        )}
        {variant === "report" && sourceUrl && (
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center">
            <Link
              href={`/analyze?url=${encodeURIComponent(sourceUrl)}`}
              className="inline-flex w-fit items-center justify-center rounded-xl border border-amber-300/90 bg-white px-4 py-2 text-[13px] font-medium text-amber-950 hover:bg-amber-100/50 transition-colors"
            >
              Lipește un alt link în /analyze
            </Link>
            {[
              "extraction_failed",
              "fetch_timeout_blocked",
              "missing_price",
              "missing_area",
              "pipeline_error",
            ].includes(reason) && <RetryAnalysisButton url={sourceUrl} />}
          </div>
        )}
      </div>

      {showSiteSupportOptIn && (
        <div className="mt-4 rounded-xl border border-amber-200/90 bg-white/70 p-3">
          <p className="text-[13px] font-medium text-amber-950">
            Vrei să te anunțăm când suportăm acest site?
          </p>
          <p className="mt-0.5 text-[11px] text-amber-800/80">
            Nu te abonăm la newsletter general; păstrăm doar interesul pentru domeniul acesta. Fără
            termen promis.
          </p>
          {status === "sent" ? (
            <p className="mt-2 text-[13px] text-emerald-800">Am înregistrat. Mulțumim.</p>
          ) : (
            <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-center">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder="adresa@email.com"
                className="min-w-0 flex-1 rounded-lg border border-amber-200 px-3 py-2 text-[13px] text-amber-950 placeholder:text-amber-800/50"
                autoComplete="email"
              />
              <button
                type="button"
                onClick={submitInterest}
                disabled={status === "sending" || !EMAIL_RE.test(email.trim())}
                className="rounded-lg bg-amber-800 px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50 hover:bg-amber-900 transition-colors"
              >
                {status === "sending" ? "Se trimite…" : "Mă anunți"}
              </button>
            </div>
          )}
          {status === "error" && (
            <p className="mt-1 text-[12px] text-red-700">Nu am putut salva. Încearcă din nou.</p>
          )}
        </div>
      )}
    </div>
  );
}
