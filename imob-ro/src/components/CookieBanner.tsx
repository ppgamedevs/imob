"use client";
import React, { useEffect, useState } from "react";

export default function CookieBanner() {
  const [accepted, setAccepted] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem("imob_cookie_accept");
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (accepted) {
      try {
        localStorage.setItem("imob_cookie_accept", "1");
      } catch {}
    }
  }, [accepted]);

  if (accepted) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-muted p-4 rounded shadow-md flex items-center justify-between">
      <div>
        <div className="font-medium">Folosim cookie-uri pentru o experiență mai bună</div>
        <div className="text-sm">
          Continuând, accepți Termenii și Politica de confidențialitate.
        </div>
      </div>
      <div className="ml-4">
        <button className="btn btn-primary" onClick={() => setAccepted(true)}>
          Accept
        </button>
      </div>
    </div>
  );
}
