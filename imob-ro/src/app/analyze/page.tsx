"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import Hero from "@/components/ui/hero";
import { Input } from "@/components/ui/input";

export default function AnalyzePage() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "fetching" | "done">("idle");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setStatus("fetching");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (res.ok && data?.id) {
        setStatus("done");
        router.push(`/report/${data.id}`);
      } else {
        setStatus("idle");
        alert(data?.error || "Failed to create analysis");
      }
    } catch (err) {
      console.error(err);
      setStatus("idle");
      alert("Network error");
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-12">
      <Hero title={<>Analizează un link</>} subtitle="Primește estimări rapide în câteva secunde" />

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          type="url"
          placeholder="Introdu URL-ul anunțului..."
        />
        <Button type="submit" disabled={status === "fetching"}>
          {status === "fetching" ? "Analizează..." : "Analizează"}
        </Button>
      </form>

      <div className="mt-4">
        {status === "idle" && (
          <p className="text-sm text-muted-foreground">Introdu un link și apasă Analizează.</p>
        )}
        {status === "fetching" && (
          <p className="text-sm text-muted-foreground">Se pornește analiza…</p>
        )}
        {status === "done" && (
          <p className="text-sm text-muted-foreground">Analiza a fost inițiată. Redirecționare…</p>
        )}
      </div>
    </div>
  );
}
