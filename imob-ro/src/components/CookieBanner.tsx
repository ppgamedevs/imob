"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem("imob_gdpr")) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const handleConsent = (accepted: boolean) => {
    try {
      localStorage.setItem("imob_gdpr", accepted ? "all" : "essential");
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-lg safe-area-inset-bottom">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] leading-relaxed text-gray-600">
            Folosim cookie-uri esentiale pentru functionarea platformei.
            Datele tale sunt protejate conform{" "}
            <Link href="/confidentialitate" className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-2 hover:decoration-gray-500 transition-colors">
              GDPR
            </Link>
            {" "}si{" "}
            <Link href="/cookies" className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-2 hover:decoration-gray-500 transition-colors">
              Politicii de Cookie-uri
            </Link>
            . Nu folosim tracking sau publicitate.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <button
            onClick={() => handleConsent(false)}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
          >
            Doar esentiale
          </button>
          <button
            onClick={() => handleConsent(true)}
            className="rounded-full bg-gray-900 px-5 py-2 text-[13px] font-medium text-white hover:bg-gray-800 transition-all duration-200"
          >
            Accept toate
          </button>
        </div>
      </div>
    </div>
  );
}
