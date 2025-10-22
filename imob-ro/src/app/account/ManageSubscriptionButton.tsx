/**
 * Day 23 - Manage Subscription Button
 * Opens Stripe Customer Portal
 */

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Eroare la deschiderea portalului. Te rugăm să contactezi suportul.");
      }
    } catch (error) {
      console.error("Portal error:", error);
      alert("Eroare la deschiderea portalului.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={loading} variant="outline">
      {loading ? "Se deschide..." : "Gestionează abonament"}
    </Button>
  );
}
