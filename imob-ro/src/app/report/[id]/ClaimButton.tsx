"use client";
import { useState, useTransition } from "react";

export function ClaimButton({ analysisId }: { analysisId: string }) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  async function onClaim() {
    start(async () => {
      const res = await fetch(`/report/${analysisId}/claim`, {
        method: "POST",
      });
      if (res.ok) {
        const json = await res.json();
        setStatus(json.status);
        alert(json.status === "pending" ? "Cerere trimisă agentului." : "Deja revendicat.");
      } else {
        alert("Ai nevoie de profil de agent / autentificare.");
      }
    });
  }

  return (
    <button className="btn" disabled={pending} onClick={onClaim}>
      {status ? `Status: ${status}` : "Revendică listarea"}
    </button>
  );
}
