"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const STEPS = [
  { label: "Se descarca pagina anuntului...", pct: 10 },
  { label: "Se extrag datele din anunt...", pct: 25 },
  { label: "Se normalizeaza informatiile...", pct: 40 },
  { label: "Se cauta comparabile in zona...", pct: 55 },
  { label: "Se calculeaza estimarile de pret...", pct: 70 },
  { label: "Se evalueaza riscurile...", pct: 85 },
  { label: "Se genereaza raportul final...", pct: 95 },
];

export default function AnalysisLoading({ status, title }: { status: string; title?: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (status === "done" || status === "error") return;
    const interval = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(interval);
  }, [status, router]);

  const currentStep = STEPS[step];

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        {/* Animated gradient orb */}
        <div className="relative mx-auto mb-8 h-20 w-20">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 animate-pulse opacity-30 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
            <svg className="h-8 w-8 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        </div>

        <h1 className="text-[22px] font-bold text-gray-900 mb-2">
          Se analizeaza proprietatea
        </h1>
        {title && (
          <p className="text-[14px] text-gray-500 mb-6 line-clamp-2 max-w-sm mx-auto">
            {title}
          </p>
        )}

        {/* Progress bar */}
        <div className="mb-4 mx-auto max-w-xs">
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-1000 ease-out"
              style={{ width: `${currentStep.pct}%` }}
            />
          </div>
        </div>

        <p className="text-[13px] text-gray-500 mb-1 transition-all duration-300">
          {currentStep.label}
        </p>
        <p className="text-[12px] text-gray-400">
          {elapsed}s
        </p>

        {/* Tips while waiting */}
        <div className="mt-10 mx-auto max-w-sm rounded-xl border border-gray-100 bg-gray-50/50 p-4">
          <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-2">
            Stiai ca?
          </p>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            Analizam pretul, comparabilele din zona, riscul seismic si generamn sfaturi de negociere personalizate pentru fiecare proprietate.
          </p>
        </div>
      </div>
    </div>
  );
}
