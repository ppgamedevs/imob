"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export default function CookieBanner() {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    // Only show banner if user hasn't acknowledged it
    try {
      const acknowledged = localStorage.getItem("imob_cookie_accept");
      if (!acknowledged) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem("imob_cookie_accept", "1");
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-card border border-border p-4 rounded-lg shadow-lg z-50">
      <div className="space-y-3">
        <div className="font-medium text-sm">🍪 Cookie-uri Esențiale</div>
        <p className="text-sm text-muted-foreground">
          Folosim doar cookie-uri <strong>strict necesare</strong> pentru autentificare și
          funcționarea platformei. Nu folosim tracking sau publicitate.
        </p>
        <div className="flex items-center gap-2 text-xs">
          <Link href="/cookies" className="text-primary hover:underline">
            Politica Cookie-uri
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link href="/confidentialitate" className="text-primary hover:underline">
            Confidențialitate
          </Link>
        </div>
        <Button onClick={handleAccept} className="w-full" size="sm">
          Am înțeles
        </Button>
      </div>
    </div>
  );
}
