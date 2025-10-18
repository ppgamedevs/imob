"use client";

import React, { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export default function RefreshButton({ analysisId }: { analysisId: string }) {
  const [loading, setLoading] = useState(false);

  async function handle() {
    try {
      setLoading(true);
      const res = await fetch("/api/analysis/restart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      });
      const j = await res.json();
      if (res.ok) {
        toast.success("Analiză repornită");
      } else {
        toast.error(j?.error || "Eroare");
      }
    } catch {
      toast.error("Eroare la server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={handle} disabled={loading}>
      {loading ? "Repornește..." : "Refresh"}
    </Button>
  );
}
