/**
 * Tour mode component
 * Step 15: Final Polish
 *
 * Shows interactive tour tips for first-time users
 */

"use client";

import { useEffect, useState } from "react";

const steps = [
  {
    sel: "[data-tour='search']",
    title: "Căutare",
    text: "Caută zone, adrese sau lipește un link de anunț.",
  },
  {
    sel: "[data-tour='filters']",
    title: "Filtre",
    text: "Setează rapid bugete, m² și camere.",
  },
  {
    sel: "[data-tour='signals']",
    title: "Semnale",
    text: "Vezi proprietăți subevaluate sau cu viteză mare la vânzare.",
  },
];

export default function Tour() {
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (typeof window === "undefined") return -1;
    return localStorage.getItem("tourDone") ? -1 : 0;
  });

  useEffect(() => {
    if (currentStep < 0 || currentStep >= steps.length) return;

    const step = steps[currentStep];
    const el = document.querySelector(step.sel) as HTMLElement | null;

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentStep]);

  if (currentStep < 0) return null;

  const step = steps[currentStep];
  const targetEl = document.querySelector(step.sel);
  const rect = targetEl?.getBoundingClientRect();

  const position = rect ? { top: rect.bottom + 8, left: rect.left } : { top: 100, left: 24 };

  const handleNext = () => {
    if (currentStep + 1 >= steps.length) {
      localStorage.setItem("tourDone", "1");
      setCurrentStep(-1);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("tourDone", "1");
    setCurrentStep(-1);
  };

  return (
    <div
      className="fixed z-[60] transition-all duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="rounded-xl border border-border bg-surface shadow-elev2 p-3 max-w-[320px] backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">{step.title}</div>
          <div className="text-xs text-muted">
            {currentStep + 1} / {steps.length}
          </div>
        </div>
        <div className="mt-1 text-sm opacity-80">{step.text}</div>
        <div className="mt-3 flex gap-2">
          <button
            className="inline-flex items-center justify-center rounded-lg bg-primary text-primaryFg px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
            onClick={handleNext}
          >
            {currentStep + 1 >= steps.length ? "Gata" : "Înainte"}
          </button>
          <button
            className="inline-flex items-center justify-center rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm font-medium hover:bg-surface-2 transition-colors"
            onClick={handleSkip}
          >
            Nu acum
          </button>
        </div>
      </div>

      {/* Arrow pointer */}
      <div
        className="absolute w-0 h-0 -top-2 left-4"
        style={{
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderBottom: "8px solid rgb(var(--border))",
        }}
      />
    </div>
  );
}
