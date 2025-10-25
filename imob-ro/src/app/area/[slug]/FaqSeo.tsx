"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export interface FaqSeoProps {
  areaName: string;
  faq?: Array<{
    question: string;
    answer: string;
  }>;
}

export default function FaqSeo({ areaName, faq }: FaqSeoProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  if (!faq || faq.length === 0) {
    return null;
  }

  const toggleItem = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-fg mb-6">Întrebări frecvente despre {areaName}</h2>

        <div className="space-y-3">
          {faq.map((item, index) => (
            <div key={index} className="rounded-lg border border-border bg-surface overflow-hidden">
              <button
                onClick={() => toggleItem(index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-accent transition-colors"
                aria-expanded={openIndex === index}
              >
                <span className="font-medium text-fg pr-4">{item.question}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-muted flex-shrink-0 transition-transform",
                    openIndex === index && "transform rotate-180",
                  )}
                />
              </button>
              {openIndex === index && (
                <div className="px-4 pb-4 text-sm text-muted leading-relaxed">{item.answer}</div>
              )}
            </div>
          ))}
        </div>

        {/* Static SEO copy */}
        <div className="mt-12 pt-8 border-t border-border">
          <h3 className="text-lg font-bold text-fg mb-4">Despre zona {areaName}</h3>
          <div className="prose prose-sm max-w-none text-muted">
            <p>
              Zona <strong>{areaName}</strong> din București este monitorizată zilnic de platforma
              imob.ro pentru a oferi cele mai recente informații despre piața imobiliară locală.
              Analizăm anunțurile active, calculăm prețurile mediane și estimăm timpul necesar
              pentru vânzare (TTS).
            </p>
            <p className="mt-4">
              Datele noastre includ evaluări automate (AVM) care compară prețul de ofertă cu
              valoarea de piață estimată, analiza randamentului net pentru investitori și informații
              despre riscul seismic al clădirilor din zonă. Toate aceste informații sunt actualizate
              în timp real pentru a vă ajuta să luați cele mai bune decizii.
            </p>
            <p className="mt-4">
              Folosiți filtrele din pagina{" "}
              <a href="/discover" className="text-primary hover:underline">
                Descoperă
              </a>{" "}
              pentru a găsi proprietăți în {areaName} care corespund criteriilor dvs. sau salvați
              zona pentru a primi notificări când apar oferte noi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
